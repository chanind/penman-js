/**
 * Interpreting trees to graphs and configuring graphs to trees.
 *
 * In order to serialize graphs into the PENMAN format, a tree-like
 * layout of the graph must be decided. Deciding a layout includes
 * choosing the order of the edges from a node and the paths to get to a
 * node definition (the position in the tree where a node's concept and
 * edges are specified). For instance, the following graphs for "The dog
 * barked loudly" have different edge orders on the `b` node:
 *
 * ```
 * (b / bark-01           (b / bark-01
 *     :ARG0 (d / dog)        :mod (l / loud)
 *     :mod (l / loud))       :ARG0 (d / dog))
 * ```
 *
 * With re-entrancies, there are choices about which location of a
 * re-entrant node gets the full definition with its concept (node
 * label), etc. For instance, the following graphs for "The dog tried to
 * bark" have different locations for the definition of the `d` node:
 *
 * ```
 * (t / try-01              (t / try-01
 *     :ARG0 (d / dog)          :ARG0 d
 *     :ARG1 (b / bark-01       :ARG1 (b / bark-01
 *         :ARG0 d))                :ARG0 (d / dog))
 * ```
 *
 * With inverted edges, there are even more possibilities, such as:
 *
 * ```
 * (t / try-01                (t / try-01
 *     :ARG0 (d / dog             :ARG1 (b / bark-01
 *         :ARG0-of b)                :ARG0 (d / dog
 *     :ARG1 (b / bark-01))             :ARG0-of t)))
 * ```
 *
 * This module introduces two epigraphical markers so that a pure graph
 * parsed from PENMAN can retain information about its tree layout
 * without altering its graph properties. The first marker type is
 * `Push`, which is put on a triple to indicate that the triple
 * introduces a new node context, while the sentinel `POP`
 * indicates that a triple is at the end of one or more node contexts.
 * These markers only work if the triples in the graph's data are
 * ordered. For instance, one of the graphs above (repeated here) has the
 * following data:
 *
 * ```
 * PENMAN                 Graph                            Epigraph
 * (t / try-01            [('t', ':instance', 'try-01'),   :
 *    :ARG0 (d / dog)      ('t', ':ARG0', 'd'),            : Push('d')
 *    :ARG1 (b / bark-01   ('d', ':instance', 'dog'),      : POP
 *       :ARG0 d))         ('t', ':ARG1', 'b'),            : Push('b')
 *                         ('b', ':instance', 'bark-01'),  :
 *                         ('b', ':ARG0', 'd')]            : POP
 * ```
 */

import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import sortBy from 'lodash.sortby';
import zip from 'lodash.zip';

import { Epidata, EpidataMap, Epidatum } from './epigraph';
import { LayoutError } from './exceptions';
import { CONCEPT_ROLE, Graph } from './graph';
import { debug, log, warn } from './logger';
import { Model } from './model';
import { Alignment, RoleAlignment } from './surface';
import { isAtomic, Tree } from './tree';
import { Branch, Node, Role, Triple, Triples, Variable } from './types';

const _default_model = new Model();

type _Nodemap = { [key: Variable]: Node | null };

// Epigraphical markers

/**Epigraph marker for layout choices. */
export class LayoutMarker extends Epidatum {}

/**Epigraph marker to indicate a new node context.*/
export class Push extends LayoutMarker {
  variable: Variable;

  constructor(variable: Variable) {
    super();
    this.variable = variable;
  }

  toString() {
    return `Push(${this.variable})`;
  }
}

/** Epigraph marker to indicate the end of a node context. */
export class Pop extends LayoutMarker {
  toString() {
    return 'POP';
  }
}

/** A singleton instance of `Pop`. */
export const POP = new Pop();

export interface InterpretOptions {
  model?: Model;
}

/**
 * Interpret tree `t` as a graph using `model`.
 *
 * Tree interpretation is the process of transforming the nodes and
 * edges of a tree into a directed graph. A semantic model determines
 * which edges are inverted and how to deinvert them. If `model` is
 * not provided, the default model will be used.
 *
 * The `options` param consists of an object with a single `model` property.
 *
 * @param t - The `Tree` object to interpret.
 * @param options - An object with an optional `model` property, used to interpret `t`.
 * @returns The interpreted `Graph` object.
 * @example
 * import { Tree, interpret } from 'penman-js';
 *
 * const t = new Tree('b', [
 *   ['/', 'bark-01'],
 *   ['ARG0', new Tree('d', [
 *     ['/', 'dog']
 *   ])]
 * ]);
 *
 * const g = interpret(t);
 * for (const triple of g.triples) {
 *   console.log(triple);
 * }
 * // ['b', ':instance', 'bark-01']
 * // ['b', ':ARG0', 'd']
 * // ['d', ':instance', 'dog']
 */
export function interpret(t: Tree, options: InterpretOptions = {}): Graph {
  const { model = _default_model } = options;
  const variables = new Set(t.nodes().map((node) => node[0]));
  const [top, triples, epidata] = _interpretNode(t.node, variables, model);
  const epimap = new EpidataMap();
  for (const [triple, epis] of epidata) {
    if (epimap.has(triple)) {
      warn(`ignoring epigraph data for duplicate triple: ${triple}`);
    } else {
      epimap.set(triple, epis);
    }
  }
  const g = new Graph(triples, { top, epidata: epimap, metadata: t.metadata });
  log(`Interpreted: ${g}`);
  return g;
}

const _interpretNode = (
  t: Node,
  variables: Set<Variable>,
  model: Model,
): [string, Triples, [Triple, Epidata][]] => {
  let hasConcept = false;
  const triples: Triples = [];
  const epidata: [Triple, Epidata][] = [];
  const [variable, edges] = t;
  for (const edge of edges ?? []) {
    let role = edge[0];
    const target = edge[1];
    const epis: Epidatum[] = [];

    const processedRole = _processRole(role);
    role = processedRole[0];
    const role_epis = processedRole[1];
    epis.push(...role_epis);
    hasConcept ||= role === CONCEPT_ROLE;

    // atomic targets
    if (isAtomic(target)) {
      const [target_, target_epis] = _processAtomic(target);
      epis.push(...target_epis);
      let triple: Triple = [variable, role, target_];
      if (model.isRoleInverted(role)) {
        if (variables.has(target_)) {
          triple = model.invert(triple);
        } else {
          warn(`cannot deinvert attribute: ${triple}`);
        }
      }
      triples.push(triple);
      epidata.push([triple, epis]);
    }
    // nested nodes
    else {
      const triple = model.deinvert([variable, role, target[0]]);
      triples.push(triple);

      epis.push(new Push(target[0]));
      epidata.push([triple, epis]);

      // recurse to nested nodes
      const [, _triples, _epis] = _interpretNode(target, variables, model);
      triples.push(..._triples);
      _epis[_epis.length - 1][1].push(POP); // POP from last triple of nested node
      epidata.push(..._epis);
    }
  }

  if (!hasConcept) {
    const instance: Triple = [variable, CONCEPT_ROLE, null];
    triples.unshift(instance);
    epidata.push([instance, []]);
  }

  return [variable, triples, epidata];
};

const _processRole = (role: string): [string, Epidatum[]] => {
  const epis: Epidatum[] = [];
  if (role === '/') {
    role = CONCEPT_ROLE;
  } else if (role.includes('~')) {
    const [role_, alignment] = role.split('~');
    role = role_;
    epis.push(RoleAlignment.fromString<RoleAlignment>(alignment));
  }
  return [role, epis];
};

const _processAtomic = (target: string): [string, Epidatum[]] => {
  const epis: Epidatum[] = [];
  // remove any alignments
  if (target && target.includes('~')) {
    if (target.startsWith('"')) {
      // need to handle alignments on strings differently
      // because strings may contain ~ inside the quotes (e.g., URIs)
      const pivot = target.lastIndexOf('"') + 1;
      if (pivot < target.length) {
        epis.push(Alignment.fromString<Alignment>(target.slice(pivot)));
        target = target.slice(0, pivot);
      }
    } else {
      const [target_, alignment] = target.split('~');
      target = target_;
      epis.push(Alignment.fromString<Alignment>(alignment));
    }
  }
  return [target, epis];
};

export interface ConfigureOptions {
  top?: Variable;
  model?: Model;
}

/**
 * Create a tree from a graph by making as few decisions as possible.
 *
 * A graph interpreted from a valid tree using `interpret` will
 * contain epigraphical markers that describe how the triples of a
 * graph are to be expressed in a tree, and thus configuring this
 * tree requires only a single pass through the list of triples. If
 * the markers are missing or out of order, or if the graph has been
 * modified, then the configuration process will have to make
 * decisions about where to insert tree branches. These decisions are
 * deterministic, but may result in a tree different than the one
 * expected.
 *
 * `options` consists of an object with optional `top` and `model` properties.
 * - `top` is the variable to use as the top of the graph; if `null`, the top of `g` will be used.
 * - `model` is the `Model` used to configure the tree.
 *
 * @param g - The `Graph` object to configure.
 * @param options - An object with optional `top` and `model` properties.
 *    - `top` is the variable to use as the top of the graph; if `null`, the top of `g` will be used.
 *    - `model` is the `Model` used to configure the tree.
 * @returns The configured `Tree` object.
 * @example
 * import { Graph, configure } from 'penman-js';
 *
 * const g = new Graph([
 *   ['b', ':instance', 'bark-01'],
 *   ['b', ':ARG0', 'd'],
 *   ['d', ':instance', 'dog']
 * ]);
 *
 * const t = configure(g);
 * console.log(t);
 * // Tree('b', [['/', 'bark-01'], [':ARG0', new Tree('d', [['/', 'dog']])]])
 */
export function configure(g: Graph, options: ConfigureOptions = {}): Tree {
  const { top = g.top, model = _default_model } = options;
  const configRes = _configure(g, top, model);
  const node = configRes[0];
  let data = configRes[1];
  const nodemap = configRes[2];

  // remove any superfluous POPs at the end (maybe from dereification)
  while (data.length > 0 && data[data.length - 1] instanceof Pop) {
    data.pop();
  }
  // if any data remain, the graph was not properly annotated for a tree
  const skipped: ([Triple, boolean, Epidata] | Pop)[] = [];
  while (data.length > 0) {
    const next = _findNext(data, nodemap);
    const _skipped = next[0];
    const variable = next[1];
    data = next[2];

    skipped.push(..._skipped);
    const dataCount = data.length;
    if (variable == null || dataCount === 0) {
      throw new LayoutError('possibly disconnected graph');
    }
    const surprising = _configureNode(variable, data, nodemap, model)[1];
    if (data.length === dataCount && surprising) {
      skipped.unshift(data.pop()!);
    } else if (data.length >= dataCount) {
      throw new LayoutError('unknown configuration error');
    } else {
      data = skipped.concat(data);
      skipped.length = 0;
    }
    // remove any superfluous POPs
    while (data.length > 0 && data[data.length - 1] instanceof Pop) {
      data.pop();
    }
  }
  if (skipped.length > 0) {
    throw new LayoutError('incomplete configuration');
  }
  _processEpigraph(node);
  const tree = new Tree(node, g.metadata);
  debug(`Configured: ${tree}`);
  return tree;
}

/**
 * Create the tree that can be created without any improvising.
 */
function _configure(
  g: Graph,
  top: Variable | null,
  model: Model,
): [Node, ([Triple, boolean, Epidata] | Pop)[], _Nodemap] {
  if (g.triples.length === 0) {
    return [[g.top as string, []], [], {}];
  }
  const nodemap: _Nodemap = {};
  for (const variable of g.variables()) {
    nodemap[variable] = null;
  }
  if (top == null) {
    throw new LayoutError(`top is not a variable: ${top}`);
  }
  if (!(top in nodemap)) {
    throw new LayoutError(`top is not a variable: ${top}`);
  }
  nodemap[top] = [top, []];
  const data = _preconfigure(g, model).reverse();
  const node = _configureNode(top, data, nodemap, model)[0];
  return [node, data, nodemap];
}

/**
 * Arrange the triples and epidata for ordered traversal.
 * Also perform some basic validation.
 */
function _preconfigure(g: Graph, model: Model) {
  const data: ([Triple, boolean, Epidata] | Pop)[] = [];
  const epidata = g.epidata;
  const pushed = new Set<Variable>();

  for (let triple of g.triples) {
    const [variable, role, target] = triple;
    const epis: Epidata = [];
    let push = false;
    const pops: Pop[] = [];

    for (const epi of epidata.get(triple) || []) {
      if (epi instanceof Push) {
        const pvar = epi.variable;
        if (pushed.has(pvar)) {
          warn(`ignoring secondary node contexts for '${pvar}'`);
          continue; // change to 'pass' to allow multiple contexts
        }
        if ((pvar !== variable && pvar !== target) || role === CONCEPT_ROLE) {
          warn(`node context '${pvar}' invalid for triple: ${triple}`);
          continue;
        }
        if (pvar === variable) {
          triple = model.invert(triple);
        }
        pushed.add(pvar);
        push = true;
      } else if (epi instanceof Pop) {
        pops.push(epi);
      } else {
        epis.push(epi);
      }
    }

    data.push([triple, push, epis]);
    data.push(...pops);
  }

  return data;
}

/**
 * Configure a node and any descendants.
 *
 * Side-effects:
 *   - `data` is modified
 *   - `nodemap` is modified
 */
function _configureNode(
  variable: Variable,
  data: ([Triple, boolean, Epidata] | Pop)[],
  nodemap: _Nodemap,
  model: Model,
): [Node, boolean] {
  const node = nodemap[variable]!;
  const edges = node[1] ?? [];
  // Something is 'surprising' when a triple doesn't predictably fit
  // given the current state
  let surprising = false;

  while (data.length) {
    const datum = data.pop()!;
    if (datum instanceof Pop) {
      break;
    }
    const triple = datum[0];
    let role: string;
    let target: any;
    let push = datum[1];
    const epis = datum[2];
    // Finalize triple orientation
    if (triple[0] === variable) {
      [, role, target] = triple; // expected situation
    } else if (triple[2] === variable && triple[1] !== CONCEPT_ROLE) {
      [, role, target] = model.invert(triple); // unexpected inversion
      push = false; // preconfigured push site may no longer be valid
      surprising = true;
    } else {
      data.push(datum); // cannot place triple
      surprising = true;
      break;
    }

    // Insert into tree, recursively configuring nodes
    if (role === CONCEPT_ROLE) {
      if (!target) {
        continue; // prefer (a) over (a /) when concept is missing
      }
      edges.unshift(['/', target, epis] as any);
    } else {
      if (push) {
        nodemap[target] = [target, []];
        const configNodeRes = _configureNode(target, data, nodemap, model);
        target = configNodeRes[0];
        const _surprising = configNodeRes[1];
        surprising = surprising && _surprising;
      } else if (target in nodemap && nodemap[target] == null) {
        nodemap[target] = node; // site of potential node context
      }
      edges.push([role, target, epis] as any);
    }
  }

  return [node, surprising];
}

/**
 * Find the next node context; establish if necessary.
 */
function _findNext(
  data: ([Triple, boolean, Epidata] | Pop)[],
  nodemap: _Nodemap,
): [
  ([Triple, boolean, Epidata] | Pop)[],
  Variable,
  ([Triple, boolean, Epidata] | Pop)[],
] {
  let variable: string | number | null = null;
  let pivot = data.length;
  for (let i = data.length - 1; i >= 0; i--) {
    const datum = data[i];
    pivot = i + 1;
    if (datum instanceof Pop) {
      continue;
    }
    const source = datum[0][0];
    const target = datum[0][2];
    if (source in nodemap && _getOrEstablishSite(source, nodemap)) {
      variable = source;
      break;
    } else if (
      target != null &&
      target in nodemap &&
      _getOrEstablishSite(target as string, nodemap)
    ) {
      variable = target;
      break;
    }
  }
  return [data.slice(pivot), variable as string, data.slice(0, pivot)];
}
/**
 * Turn a variable target into a node context.
 */
function _getOrEstablishSite(variable: Variable, nodemap: _Nodemap): boolean {
  // first check if the var is available at all
  if (nodemap[variable] != null) {
    const [_var, edges = []] = nodemap[variable] as Node;
    // if the mapped node's var doesn't match it can be established
    if (variable !== _var) {
      const node: Node = [variable, []];
      nodemap[variable] = node;
      for (let i = 0; i < edges.length; i++) {
        // replace the variable in the tree with the new node
        if (edges[i][1] === variable && edges[i][0] !== '/') {
          const edge: Branch = [...edges[i]];
          edge[1] = node;
          edges[i] = edge;
          break;
        }
      }
    } else {
      // otherwise the node already exists so we're good
    }
    return true;
  }
  // var is not yet available
  return false;
}

/**
 * Format epigraph data onto roles and targets.
 */
function _processEpigraph(node: any): void {
  const edges = node[1];
  for (let i = 0; i < edges.length; i++) {
    let role = edges[i][0];
    let target = edges[i][1];
    const epis = edges[i][2];
    const atomicTarget = isAtomic(target);
    for (let j = 0; j < epis.length; j++) {
      const epi = epis[j];
      if (epi.mode === 1) {
        // role epidata
        role = `${role}${epi}`;
      } else if (epi.mode === 2 && atomicTarget) {
        // target epidata
        target = `${target}${epi}`;
      } else {
        warn(`epigraphical marker ignored: ${epi}`);
      }
    }
    if (!atomicTarget) {
      _processEpigraph(target);
    }
    edges[i] = [role, target];
  }
}

export interface ReconfigureOptions {
  top?: Variable;
  model?: Model;
  key?: (role: Role) => any;
}

/**
 * Create a tree from a graph after any discarding layout markers.
 *
 * `options` consists of an object with optional `top`, `model`, and `key` properties.
 * If `key` is provided, triples are sorted according to the key.
 *
 * @param graph - The `Graph` object to reconfigure.
 * @param options - An object with optional `top`, `model`, and `key` properties.
 */
export function reconfigure(
  graph: Graph,
  options: ReconfigureOptions = {},
): Tree {
  const { top, model, key } = options;
  const p = cloneDeep(graph);
  for (const entry of p.epidata.entries()) {
    const epilist = entry[1];
    epilist.length = 0;
    for (const epi of epilist) {
      if (!(epi instanceof LayoutMarker)) {
        epilist.push(epi);
      }
    }
  }
  if (key != null) {
    p.triples = sortBy(p.triples, (x) => key(x[1]));
  }
  return configure(p, { top, model });
}

export interface RearrangeOptions {
  key?: (role: Role) => any;
  attributesFirst?: boolean;
}

/**
 * Sort the branches at each node in tree `t` according to `key`.
 *
 * Each node in a tree contains a list of branches. This function sorts
 * those lists in-place using the `key` function, which accepts a role and
 * returns some sortable criterion.
 *
 * `options` consists of an object with optional `key` and `attributesFirst` properties.
 * - If the `attributesFirst` argument is `true`, attribute branches will appear before any edges.
 * - `key` is a function used for sorting branches.
 *
 * Instance branches (`/`) always appear before any other branches.
 *
 * @param t - The tree to rearrange.
 * @param options - An object with optional `key` and `attributesFirst` properties.
 * @example
 * import { rearrange, Model, PENMANCodec } from 'penman-js';
 *
 * const c = new PENMANCodec();
 * const t = c.parse(`
 *   (s / see-01
 *      :ARG1 (c / cat)
 *      :ARG0 (d / dog))`);
 * rearrange(t, { key: Model().canonicalOrder, attributesFirst: true });
 * console.log(c.format(t));
 * // (s / see-01
 * //    :ARG0 (d / dog)
 * //    :ARG1 (c / cat))
 */
export function rearrange(t: Tree, options: RearrangeOptions = {}): void {
  const { key = null, attributesFirst = false } = options;
  let variables = new Set();
  if (attributesFirst) {
    variables = new Set(t.nodes().map((n) => n[0]));
  }
  const sortKey = (branch: Branch) => {
    const [role, target] = branch;
    const criterion1 = isAtomic(target)
      ? variables.has(target)
      : variables.has(target[0]);
    const criterion2 = key === null ? true : key(role);
    return [criterion1, criterion2];
  };
  _rearrange(t.node, sortKey);
}

const _rearrange = (node: Node, key: (branch: Branch) => any) => {
  const [, branches = []] = node;
  let first: Branch[] = [];
  let rest = branches.slice();
  if (branches && branches[0][0] === '/') {
    first = branches.slice(0, 1);
    rest = branches.slice(1);
  }
  for (const [, target] of rest) {
    if (!isAtomic(target)) {
      _rearrange(target, key);
    }
  }
  branches.splice(0, branches.length, ...first, ...sortBy(rest, key));
};

/**
 * Return the variable pushed by `triple`, if any, otherwise `null`.
 *
 * @param g - A graph object.
 * @param triple - The triple to check for a pushed variable.
 * @returns The variable pushed by `triple`, or `null` if none.
 * @example
 * import { decode, getPushedVariable } from 'penman-js';
 *
 * const g = decode('(a / alpha :ARG0 (b / beta))');
 * console.log(getPushedVariable(g, ['a', ':instance', 'alpha'])); // Outputs: null
 * console.log(getPushedVariable(g, ['a', ':ARG0', 'b'])); // Outputs: 'b'
 */
export function getPushedVariable(g: Graph, triple: Triple): Variable | null {
  for (const epi of g.epidata.get(triple) ?? []) {
    if (epi instanceof Push) {
      return epi.variable;
    }
  }
  return null;
}

/**
 * Return `true` if `triple` appears inverted in serialization.
 *
 * More specifically, this function returns `true` if `triple` has
 * a `Push` epigraphical marker in graph `g` whose associated
 * variable is the source variable of `triple`. This should be
 * accurate when testing a triple in a graph interpreted using
 * `interpret` (including `PENMANCodec.decode` and similar methods),
 * but it does not guarantee that a new serialization of `g` will
 * express `triple` as inverted as it can change if the graph or its
 * epigraphical markers are modified, if a new top is chosen, etc.
 *
 * @param g - A `Graph` object containing `triple`.
 * @param triple - The triple that does or does not appear inverted.
 * @returns `true` if `triple` appears inverted in graph `g`.
 */
export function appearsInverted(g: Graph, triple: Triple): boolean {
  const variables = g.variables();
  if (triple[1] === CONCEPT_ROLE || !variables.has(triple[2] as string)) {
    // attributes and instance triples should never be inverted
    return false;
  } else {
    // edges may appear inverted...
    const variable = getPushedVariable(g, triple);
    if (variable != null) {
      // ... when their source is pushed
      return variable === triple[0];
    } else {
      // ... or when their target is the current node context
      for (const [variable, _triple] of zip(nodeContexts(g), g.triples)) {
        if (variable == null) {
          break; // we can no longer guess the node context
        } else if (isEqual(_triple, triple)) {
          return triple[2] === variable;
        }
      }
    }
  }
  return false;
}

/**
 * Return the list of node contexts corresponding to triples in `g`.
 *
 * If a node context is unknown, the value `null` is substituted.
 *
 * @param g - A graph object.
 * @returns An array of node contexts corresponding to triples in `g`.
 * @example
 * import { decode, nodeContexts } from 'penman-js';
 *
 * const g = decode(`
 *   (a / alpha
 *      :attr val
 *      :ARG0 (b / beta :ARG0 (g / gamma))
 *      :ARG0-of g)`);
 * for (const [ctx, trp] of zip(nodeContexts(g), g.triples)) {
 *   console.log(ctx, ':', trp);
 * }
 *
 * // a : ['a', ':instance', 'alpha']
 * // a : ['a', ':attr', 'val']
 * // a : ['a', ':ARG0', 'b']
 * // b : ['b', ':instance', 'beta']
 * // b : ['b', ':ARG0', 'g']
 * // g : ['g', ':instance', 'gamma']
 * // a : ['g', ':ARG0', 'a']
 */

export function nodeContexts(g: Graph): Array<Variable | null> {
  const variables = g.variables();
  const stack = [g.top];
  const contexts: Array<Variable | null> = new Array(g.triples.length).fill(
    null,
  );
  for (let i = 0; i < g.triples.length; i++) {
    const triple = g.triples[i];
    const eligible: Variable[] = [triple[0]];
    if (triple[1] !== CONCEPT_ROLE && variables.has(triple[2] as string)) {
      eligible.push(triple[2] as Variable);
    }

    if (!eligible.includes(stack[stack.length - 1] as string)) {
      break;
    } else {
      contexts[i] = stack[stack.length - 1];
    }

    const pushed = getPushedVariable(g, triple);
    if (pushed !== null) {
      stack.push(pushed);
    }

    try {
      for (const epi of g.epidata.get(triple)) {
        if (epi instanceof Pop) {
          stack.pop();
        }
      }
    } catch (e) {
      break; // more POPs than contexts in stack
    }
  }
  return contexts;
}
