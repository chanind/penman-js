/** Tree and graph transformations. */

import { Epidata, EpidataMap, Epidatum } from './epigraph';
import { ModelError } from './exceptions';
import { CONCEPT_ROLE, Graph } from './graph';
import { appearsInverted, getPushedVariable, Pop, POP, Push } from './layout';
import { log } from './logger';
import { Model } from './model';
import { Alignment, alignments, RoleAlignment } from './surface';
import { isAtomic, Tree } from './tree';
import { Branch, Node, Target, Triple, Variable } from './types';
import { partition } from './utils';

export interface CanonicalizeRolesOptions {
  /** A model defining role normalizations. */
  model?: Model;
}

export interface ReifyEdgesOptions {
  /** A model defining reifications. */
  model?: Model;
}

export interface DereifyEdgesOptions {
  /** A model defining reifications. */
  model?: Model;
}

/**
 * Normalize roles in `t` so they are canonical according to `model`.
 *
 * This is a tree transformation rather than a graph transformation
 * because the orientation of the pure graph's triples is not decided
 * until the graph is configured into a tree.
 *
 * `options` consists of the following:
 *  - `model`: A model defining role normalizations.
 *
 * @param t - A `Tree` object.
 * @param options - Optional arguments.
 * @param options.model - A model defining role normalizations.
 * @returns A new `Tree` object with canonicalized roles.
 * @example
 * import { PENMANCodec, amrModel, canonicalizeRoles } from 'penman-js';
 *
 * const codec = new PENMANCodec();
 * const t = codec.parse('(c / chapter :domain-of 7)');
 * const canonicalizedTree = canonicalizeRoles(t, { model: amrModel });
 * console.log(codec.format(canonicalizedTree));
 * // (c / chapter
 * //    :mod 7)
 */
export const canonicalizeRoles = (
  t: Tree,
  options: CanonicalizeRolesOptions = {},
): Tree => {
  const { model = new Model() } = options;
  const tree = new Tree(_canonicalizeNode(t.node, model), t.metadata);
  log(`Canonicalized roles: ${tree}`);
  return tree;
};

const _canonicalizeNode = (node: Node, model: Model): Node => {
  const [variable, edges = []] = node;
  const canonicalEdges: [string, Branch[]][] = [];
  for (const edge of edges) {
    const rawRole = edge[0];
    let tgt = edge[1];
    // alignments aren't parsed off yet, so handle them superficially
    const [role, tilde, alignment] = partition(rawRole, '~');
    if (!isAtomic(tgt)) {
      tgt = _canonicalizeNode(tgt, model);
    }
    const canonicalRole = model.canonicalizeRole(role) + tilde + alignment;
    canonicalEdges.push([canonicalRole, tgt]);
  }
  return [variable, canonicalEdges];
};

/**
 * Reify all edges in `g` that have reifications in `model`.
 *
 * `options` consists of the following:
 *  - `model`: A model defining reifications.
 *
 * @param g - A `Graph` object.
 * @param options - Optional arguments.
 * @param options.model - A model defining reifications.
 * @returns A new `Graph` object with reified edges.
 * @example
 * import { PENMANCodec, amrModel, reifyEdges } from 'penman-js';
 *
 * const codec = new PENMANCodec(model);
 * const g = codec.decode('(c / chapter :mod 7)');
 * const reifiedGraph = reifyEdges(g, { model: amrModel });
 * console.log(codec.encode(reifiedGraph));
 * // (c / chapter
 * //    :ARG1-of (_ / have-mod-91
 * //                :ARG2 7))
 */
export const reifyEdges = (
  g: Graph,
  options: ReifyEdgesOptions = {},
): Graph => {
  const { model = new Model() } = options;
  const variables = g.variables();
  const newEpidata = new EpidataMap(g.epidata.entries());
  const newTriples: Triple[] = [];
  for (const triple of g.triples) {
    if (model.isRoleReifiable(triple[1])) {
      const reified = model.reify(triple, { variables });
      let inTriple = reified[0];
      const nodeTriple = reified[1];
      let outTriple = reified[2];
      if (appearsInverted(g, triple)) {
        [inTriple, outTriple] = [outTriple, inTriple];
      }
      newTriples.push(inTriple, nodeTriple, outTriple);
      const variable = nodeTriple[0];
      variables.add(variable);
      // manage epigraphical markers
      newEpidata.set(inTriple, [new Push(variable)]);
      const oldEpis = newEpidata.has(triple) ? newEpidata.pop(triple) : [];
      const [nodeEpis, outEpis] = _edgeMarkers(oldEpis);
      newEpidata.set(nodeTriple, nodeEpis);
      newEpidata.set(outTriple, outEpis);
      // we don't know where to put the final POP without configuring
      // the tree; maybe this should be a tree operation?
    } else {
      newTriples.push(triple);
    }
  }
  g = new Graph(newTriples, { epidata: newEpidata, metadata: g.metadata });
  log(`Reified edges: ${g}`);
  return g;
};

/**
 * Dereify edges in `g` that have reifications in `model`.
 *
 * `options` consists of the following:
 *  - `model`: A model defining reifications.
 *
 * @param g - A `Graph` object.
 * @param options - Optional arguments.
 * @param options.model - A model defining reifications.
 * @returns A new `Graph` object with dereified edges.
 * @example
 * import { PENMANCodec, amrModel, dereifyEdges } from 'penman-js';
 *
 * const codec = new PENMANCodec({ model: amrModel });
 * const g = codec.decode(
 *   `(c / chapter
 *      :ARG1-of (_ / have-mod-91
 *                  :ARG2 7))`
 * );
 * const dereifiedGraph = dereifyEdges(g, { model: amrModel });
 * console.log(codec.encode(dereifiedGraph));
 * // (c / chapter
 * //    :mod 7)
 */
export const dereifyEdges = (
  g: Graph,
  options: DereifyEdgesOptions = {},
): Graph => {
  const { model = new Model() } = options;
  const agenda: _Dereification = _dereifyAgenda(g, model);
  const newEpidata = new EpidataMap(g.epidata.entries());
  const newTriples: Triple[] = [];
  for (const triple of g.triples) {
    const variable = triple[0];
    if (agenda.has(variable)) {
      const [first, dereified, epidata] = agenda.get(variable)!;
      // only insert at the first triple so the dereification
      // appears in the correct location
      if (triple === first) {
        newTriples.push(dereified);
        newEpidata.set(dereified, epidata);
      }
      if (newEpidata.has(triple)) {
        newEpidata.delete(triple);
      }
    } else {
      newTriples.push(triple);
    }
  }
  g = new Graph(newTriples, { epidata: newEpidata, metadata: g.metadata });
  log(`Dereified edges: ${g}`);
  return g;
};

/**
 * Reify all attributes in `g`.
 *
 * @param g - A `Graph` object.
 * @returns A new `Graph` object with reified attributes.
 * @example
 * import { PENMANCodec, amrModel, reifyAttributes } from 'penman-js';
 *
 * const codec = new PENMANCodec(amrModel);
 * const g = codec.decode('(c / chapter :mod 7)');
 * const reifiedGraph = reifyAttributes(g);
 * console.log(codec.encode(reifiedGraph));
 * // (c / chapter
 * //    :mod (_ / 7))
 */
export const reifyAttributes = (g: Graph): Graph => {
  const variables = g.variables();
  const newEpidata = new EpidataMap(g.epidata.entries());
  const newTriples: Triple[] = [];
  let i = 2;
  for (const triple of g.triples) {
    const [source, role, target] = triple;
    if (role !== CONCEPT_ROLE && !variables.has(target as string)) {
      // get unique var for new node
      let variable = '_';
      while (variables.has(variable)) {
        variable = `_${i}`;
        i += 1;
      }
      variables.add(variable);
      const roleTriple: Triple = [source, role, variable];
      const nodeTriple: Triple = [variable, CONCEPT_ROLE, target];
      newTriples.push(roleTriple, nodeTriple);
      // manage epigraphical markers
      const oldEpis = newEpidata.has(triple) ? newEpidata.pop(triple) : [];
      const [roleEpis, nodeEpis] = _attrMarkers(oldEpis);
      newEpidata.set(roleTriple, [...roleEpis, new Push(variable)]);
      newEpidata.set(nodeTriple, [...nodeEpis, POP]);
    } else {
      newTriples.push(triple);
    }
  }
  g = new Graph(newTriples, { epidata: newEpidata, metadata: g.metadata });
  log(`Reified attributes: ${g}`);
  return g;
};

/**
 * Insert TOP triples in `g` indicating the tree structure.
 *
 * Note: This depends on `g` containing the epigraphical layout markers
 * from parsing; it will not work with programmatically
 * constructed Graph objects or those whose epigraphical data
 * were removed.
 *
 * @param g - A `Graph` object.
 * @param model - A model defining the TOP role.
 * @returns A new `Graph` object with TOP roles indicating tree branches.
 * @example
 * import { PENMANCodec, amrModel, indicateBranches } from 'penman-js';
 *
 * const codec = new PENMANCodec(amrModel);
 * const g = codec.decode(`
 *   (w / want-01
 *      :ARG0 (b / boy)
 *      :ARG1 (g / go-02
 *               :ARG0 b))`);
 * const branchedGraph = indicateBranches(g, amrModel);
 * console.log(codec.encode(branchedGraph));
 * // (w / want-01
 * //    :TOP b
 * //    :ARG0 (b / boy)
 * //    :TOP g
 * //    :ARG1 (g / go-02
 * //             :ARG0 b))
 */
export const indicateBranches = (g: Graph, model: Model): Graph => {
  const newTriples: Triple[] = [];
  for (const t of g.triples) {
    const push = g.epidata.get(t)?.find((epi) => epi instanceof Push) as Push;
    if (push != null) {
      if (push.variable === t[2]) {
        newTriples.push([t[0], model.topRole, t[2]]);
      } else if (push.variable === t[0]) {
        if (typeof t[2] !== 'string') {
          throw new Error('expected string');
        }
        newTriples.push([t[2], model.topRole, t[0]]);
      }
    }
    newTriples.push(t);
  }
  g = new Graph(newTriples, { epidata: g.epidata, metadata: g.metadata });
  log(`Indicated branches: ${g}`);
  return g;
};

type _SplitMarkers = [Push | null, Pop[], Epidata, Epidata];

/**
 * Return epigraphical markers broken down by function.
 *
 * When a relation is reified, the original triple disappears, so its
 * epigraphical data needs to be moved and sometimes altered. For example,
 * consider a case with surface alignment markers:
 *
 * ```
 * (a :role~1 b~2)
 * ```
 *
 * Under edge reification, the desired outcome is:
 *
 * ```
 * (a :ARG1-of (_ / role-label~1 :ARG2 b~2))
 * ```
 *
 * Under attribute reification, it is:
 *
 * ```
 * (a :role~1 (_ / b~2))
 * ```
 */
const _reifiedMarkers = (epidata: Epidata): _SplitMarkers => {
  let push: Push | null = null;
  const pops: Pop[] = [];
  const roleEpis: Epidatum[] = [];
  const otherEpis: Epidatum[] = [];
  for (const epi of epidata) {
    if (epi instanceof Push) {
      push = epi;
    } else if (epi instanceof Pop) {
      pops.push(epi);
    } else if (epi.mode === 1) {
      roleEpis.push(epi);
    } else {
      otherEpis.push(epi);
    }
  }
  return [push, pops, roleEpis, otherEpis];
};

const _edgeMarkers = (epidata: Epidata): [Epidata, Epidata] => {
  const [push, pops, roleEpis, otherEpis] = _reifiedMarkers(epidata);
  // role markers on the original triple need to be converted to
  // target markers, if possible
  const nodeEpis: Epidatum[] = [];
  for (const epi of roleEpis) {
    if (epi instanceof RoleAlignment) {
      nodeEpis.push(new Alignment(epi.indices, { prefix: epi.prefix }));
    } else {
      // discard things we can't convert
    }
  }
  // other markers on the original triple get grouped for the
  // new outgoing triple
  const outEpis = [...otherEpis];
  if (push != null) {
    outEpis.push(push);
  }
  outEpis.push(...pops);

  return [nodeEpis, outEpis];
};

type _Dereification = Map<
  Variable,
  [
    Triple, // inverted triple of reification
    Triple, // dereified triple
    Epidatum[], // computed epidata
  ]
>;

const _dereifyAgenda = (g: Graph, model: Model): _Dereification => {
  const alns = alignments(g);
  const agenda: _Dereification = new Map();
  const fixed: Set<Target> = new Set([g.top]);
  const inst: Map<Variable, Triple> = new Map();
  const other: Map<Variable, Triple[]> = new Map();

  for (const triple of g.triples) {
    const [variable, role, tgt] = triple;
    if (role === CONCEPT_ROLE) {
      inst.set(variable, triple);
    } else {
      fixed.add(tgt);
      if (!other.has(variable)) {
        other.set(variable, [triple]);
      } else {
        other.get(variable)?.push(triple);
      }
    }
  }

  for (const [variable, instance] of inst.entries()) {
    if (
      !fixed.has(variable) &&
      other.get(variable)?.length === 2 &&
      model.isConceptDereifiable(instance[2])
    ) {
      // passed initial checks
      // now figure out which other edge is the first one
      let [first, second] = other.get(variable)!;
      if (getPushedVariable(g, second) === variable) {
        [first, second] = [second, first];
      }
      try {
        const dereified = model.dereify(instance, first, second);
        // migrate epidata
        const epidata: Epidatum[] = [];
        if (alns.has(instance)) {
          const aln = alns.get(instance);
          epidata.push(new RoleAlignment(aln.indices, { prefix: aln.prefix }));
        }
        epidata.push(
          ...(g.epidata
            .get(second)
            ?.filter((epi) => !(epi instanceof RoleAlignment)) as Epidatum[]),
        );
        agenda.set(variable, [first, dereified, epidata]);
      } catch (err) {
        if (!(err instanceof ModelError)) {
          throw err;
        }
        // pass
      }
    }
  }

  return agenda;
};

const _attrMarkers = (epidata: Epidata): [Epidata, Epidata] => {
  const [_push, pops, roleEpis, otherEpis] = _reifiedMarkers(epidata);
  const nodeEpis = [...otherEpis];
  nodeEpis.push(...pops);
  return [roleEpis, nodeEpis];
};
