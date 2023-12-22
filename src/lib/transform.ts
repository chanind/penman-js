// """
// Tree and graph transformations.
// """

import { Epidata, EpidataMap, Epidatum } from './epigraph';
import { ModelError } from './exceptions';
import { CONCEPT_ROLE, Graph } from './graph';
import { appearsInverted, getPushedVariable, Pop, POP, Push } from './layout';
import { log } from './logger';
import { Model } from './model';
import { Alignment, alignments, RoleAlignment } from './surface';
import { is_atomic, Tree } from './tree';
import { BasicTriple, Branch, Node, Target, Variable } from './types';
import { partition } from './utils';

// from typing import Optional, Dict, Set, List, Tuple
// import logging

// from penman.types import (Variable, Target, BasicTriple, Node)
// from penman.exceptions import ModelError
// from penman.epigraph import (Epidatum, Epidata)
// from penman.surface import (Alignment, RoleAlignment, alignments)
// from penman.tree import (Tree, is_atomic)
// from penman.graph import (Graph, CONCEPT_ROLE)
// from penman.model import Model
// from penman.layout import (
//     Push,
//     Pop,
//     POP,
//     appears_inverted,
//     get_pushed_variable,
// )

// logger = logging.getLogger(__name__)

// def canonicalize_roles(t: Tree, model: Model) -> Tree:
//     """
//     Normalize roles in *t* so they are canonical according to *model*.

//     This is a tree transformation instead of a graph transformation
//     because the orientation of the pure graph's triples is not decided
//     until the graph is configured into a tree.

//     Args:
//         t: a :class:`~penman.tree.Tree` object
//         model: a model defining role normalizations
//     Returns:
//         A new :class:`~penman.tree.Tree` object with canonicalized
//         roles.
//     Example:
//         >>> from penman.codec import PENMANCodec
//         >>> from penman.models.amr import model
//         >>> from penman.transform import canonicalize_roles
//         >>> codec = PENMANCodec()
//         >>> t = codec.parse('(c / chapter :domain-of 7)')
//         >>> t = canonicalize_roles(t, model)
//         >>> print(codec.format(t))
//         (c / chapter
//            :mod 7)
//     """
//     if model is None:
//         model = Model()
//     tree = Tree(_canonicalize_node(t.node, model), metadata=t.metadata)
//     logger.info('Canonicalized roles: %s', tree)
//     return tree

/**
 * Normalize roles in *t* so they are canonical according to *model*.
 *
 * This is a tree transformation instead of a graph transformation
 * because the orientation of the pure graph's triples is not decided
 * until the graph is configured into a tree.
 *
 * Args:
 *    t: a :class:`~penman.tree.Tree` object
 *    model: a model defining role normalizations
 * Returns:
 *    A new :class:`~penman.tree.Tree` object with canonicalized
 *    roles.
 * Example:
 *     >>> from penman.codec import PENMANCodec
 *     >>> from penman.models.amr import model
 *     >>> from penman.transform import canonicalize_roles
 *     >>> codec = PENMANCodec()
 *     >>> t = codec.parse('(c / chapter :domain-of 7)')
 *     >>> t = canonicalize_roles(t, model)
 *     >>> print(codec.format(t))
 *     (c / chapter
 *        :mod 7)
 */
export const canonicalizeRoles = (
  t: Tree,
  model: Model | null = null,
): Tree => {
  if (model == null) {
    model = new Model();
  }
  const tree = new Tree(_canonicalizeNode(t.node, model), t.metadata);
  log(`Canonicalized roles: ${tree}`);
  return tree;
};

// def _canonicalize_node(node: Node, model: Model) -> Node:
//     var, edges = node
//     canonical_edges = []
//     for i, edge in enumerate(edges):
//         role, tgt = edge
//         # alignments aren't parsed off yet, so handle them superficially
//         role, tilde, alignment = role.partition('~')
//         if not is_atomic(tgt):
//             tgt = _canonicalize_node(tgt, model)
//         canonical_role = model.canonicalize_role(role) + tilde + alignment
//         canonical_edges.append((canonical_role, tgt))
//     return (var, canonical_edges)

const _canonicalizeNode = (node: Node, model: Model): Node => {
  const [variable, edges] = node;
  const canonicalEdges: [string, Branch[]][] = [];
  for (const edge of edges) {
    const rawRole = edge[0];
    let tgt = edge[1];
    // alignments aren't parsed off yet, so handle them superficially
    const [role, tilde, alignment] = partition(rawRole, '~');
    if (!is_atomic(tgt)) {
      tgt = _canonicalizeNode(tgt, model);
    }
    const canonicalRole = model.canonicalizeRole(role) + tilde + alignment;
    canonicalEdges.push([canonicalRole, tgt]);
  }
  return [variable, canonicalEdges];
};

// def reify_edges(g: Graph, model: Model) -> Graph:
//     """
//     Reify all edges in *g* that have reifications in *model*.

//     Args:
//         g: a :class:`~penman.graph.Graph` object
//         model: a model defining reifications
//     Returns:
//         A new :class:`~penman.graph.Graph` object with reified edges.
//     Example:
//         >>> from penman.codec import PENMANCodec
//         >>> from penman.models.amr import model
//         >>> from penman.transform import reify_edges
//         >>> codec = PENMANCodec(model=model)
//         >>> g = codec.decode('(c / chapter :mod 7)')
//         >>> g = reify_edges(g, model)
//         >>> print(codec.encode(g))
//         (c / chapter
//            :ARG1-of (_ / have-mod-91
//                        :ARG2 7))
//     """
//

/**
 *     Reify all edges in *g* that have reifications in *model*.
 *
 *     Args:
 *         g: a :class:`~penman.graph.Graph` object
 *         model: a model defining reifications
 *     Returns:
 *         A new :class:`~penman.graph.Graph` object with reified edges.
 *     Example:
 *         >>> from penman.codec import PENMANCodec
 *         >>> from penman.models.amr import model
 *         >>> from penman.transform import reify_edges
 *         >>> codec = PENMANCodec(model=model)
 *         >>> g = codec.decode('(c / chapter :mod 7)')
 *         >>> g = reify_edges(g, model)
 *         >>> print(codec.encode(g))
 *         (c / chapter
 *            :ARG1-of (_ / have-mod-91
 *                        :ARG2 7))
 */
export const reifyEdges = (g: Graph, model: Model | null = null): Graph => {
  //     vars = g.variables()
  //     if model is None:
  //         model = Model()
  //     new_epidata = dict(g.epidata)
  //     new_triples: List[BasicTriple] = []
  //     for triple in g.triples:
  //         if model.is_role_reifiable(triple[1]):
  //             in_triple, node_triple, out_triple = model.reify(triple, vars)
  //             if appears_inverted(g, triple):
  //                 in_triple, out_triple = out_triple, in_triple
  //             new_triples.extend((in_triple, node_triple, out_triple))
  //             var = node_triple[0]
  //             vars.add(var)
  //             # manage epigraphical markers
  //             new_epidata[in_triple] = [Push(var)]
  //             old_epis = new_epidata.pop(triple) if triple in new_epidata else []
  //             node_epis, out_epis = _edge_markers(old_epis)
  //             new_epidata[node_triple] = node_epis
  //             new_epidata[out_triple] = out_epis
  //             # we don't know where to put the final POP without configuring
  //             # the tree; maybe this should be a tree operation?
  //         else:
  //             new_triples.append(triple)
  //     g = Graph(new_triples,
  //               epidata=new_epidata,
  //               metadata=g.metadata)
  //     logger.info('Reified edges: %s', g)
  //     return g
  const vars = g.variables();
  if (model == null) {
    model = new Model();
  }
  const newEpidata = new EpidataMap(g.epidata.entries());
  const newTriples: BasicTriple[] = [];
  for (const triple of g.triples) {
    if (model.isRoleReifiable(triple[1])) {
      const reified = model.reify(triple, vars);
      let inTriple = reified[0];
      const nodeTriple = reified[1];
      let outTriple = reified[2];
      if (appearsInverted(g, triple)) {
        [inTriple, outTriple] = [outTriple, inTriple];
      }
      newTriples.push(inTriple, nodeTriple, outTriple);
      const variable = nodeTriple[0];
      vars.add(variable);
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
  g = new Graph(newTriples, null, newEpidata, g.metadata);
  log(`Reified edges: ${g}`);
  return g;
};

// def dereify_edges(g: Graph, model: Model) -> Graph:
//     """
//     Dereify edges in *g* that have reifications in *model*.

//     Args:
//         g: a :class:`~penman.graph.Graph` object
//     Returns:
//         A new :class:`~penman.graph.Graph` object with dereified
//         edges.
//     Example:
//         >>> from penman.codec import PENMANCodec
//         >>> from penman.models.amr import model
//         >>> from penman.transform import dereify_edges
//         >>> codec = PENMANCodec(model=model)
//         >>> g = codec.decode(
//         ...   '(c / chapter'
//         ...   '   :ARG1-of (_ / have-mod-91'
//         ...   '               :ARG2 7))')
//         >>> g = dereify_edges(g, model)
//         >>> print(codec.encode(g))
//         (c / chapter
//            :mod 7)
//     """

/**
 *
 *     Dereify edges in *g* that have reifications in *model*.
 *
 *     Args:
 *         g: a :class:`~penman.graph.Graph` object
 *     Returns:
 *         A new :class:`~penman.graph.Graph` object with dereified
 *         edges.
 *     Example:
 *         >>> from penman.codec import PENMANCodec
 *         >>> from penman.models.amr import model
 *         >>> from penman.transform import dereify_edges
 *         >>> codec = PENMANCodec(model=model)
 *         >>> g = codec.decode(
 *         ...   '(c / chapter'
 *         ...   '   :ARG1-of (_ / have-mod-91'
 *         ...   '               :ARG2 7))')
 *         >>> g = dereify_edges(g, model)
 *         >>> print(codec.encode(g))
 *         (c / chapter
 *            :mod 7)
 */
export const dereifyEdges = (g: Graph, model: Model | null = null): Graph => {
  //     if model is None:
  //         model = Model()
  //     agenda = _dereify_agenda(g, model)
  //     new_epidata = dict(g.epidata)
  //     new_triples: List[BasicTriple] = []
  //     for triple in g.triples:
  //         var = triple[0]
  //         if var in agenda:
  //             first, dereified, epidata = agenda[var]
  //             # only insert at the first triple so the dereification
  //             # appears in the correct location
  //             if triple == first:
  //                 new_triples.append(dereified)
  //                 new_epidata[dereified] = epidata
  //             if triple in new_epidata:
  //                 del new_epidata[triple]
  //         else:
  //             new_triples.append(triple)
  //     g = Graph(new_triples,
  //               epidata=new_epidata,
  //               metadata=g.metadata)
  //     logger.info('Dereified edges: %s', g)
  //     return g
  if (model == null) {
    model = new Model();
  }
  const agenda: _Dereification = _dereifyAgenda(g, model);
  const newEpidata = new EpidataMap(g.epidata.entries());
  const newTriples: BasicTriple[] = [];
  for (const triple of g.triples) {
    const variable = triple[0];
    if (agenda.has(variable)) {
      const [first, dereified, epidata] = agenda.get(variable);
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
  g = new Graph(newTriples, null, newEpidata, g.metadata);
  log(`Dereified edges: ${g}`);
  return g;
};

// def reify_attributes(g: Graph) -> Graph:
//     """
//     Reify all attributes in *g*.

//     Args:
//         g: a :class:`~penman.graph.Graph` object
//     Returns:
//         A new :class:`~penman.graph.Graph` object with reified
//         attributes.
//     Example:
//         >>> from penman.codec import PENMANCodec
//         >>> from penman.models.amr import model
//         >>> from penman.transform import reify_attributes
//         >>> codec = PENMANCodec(model=model)
//         >>> g = codec.decode('(c / chapter :mod 7)')
//         >>> g = reify_attributes(g)
//         >>> print(codec.encode(g))
//         (c / chapter
//            :mod (_ / 7))
//     """

/**
 *     Reify all attributes in *g*.
 *
 *     Args:
 *         g: a :class:`~penman.graph.Graph` object
 *     Returns:
 *         A new :class:`~penman.graph.Graph` object with reified
 *         attributes.
 *     Example:
 *         >>> from penman.codec import PENMANCodec
 *         >>> from penman.models.amr import model
 *         >>> from penman.transform import reify_attributes
 *         >>> codec = PENMANCodec(model=model)
 *         >>> g = codec.decode('(c / chapter :mod 7)')
 *         >>> g = reify_attributes(g)
 *         >>> print(codec.encode(g))
 *         (c / chapter
 *            :mod (_ / 7))
 */
export const reifyAttributes = (g: Graph): Graph => {
  //     variables = g.variables()
  //     new_epidata = dict(g.epidata)
  //     new_triples: List[BasicTriple] = []
  //     i = 2
  //     for triple in g.triples:
  //         source, role, target = triple
  //         if role != CONCEPT_ROLE and target not in variables:
  //             # get unique var for new node
  //             var = '_'
  //             while var in variables:
  //                 var = f'_{i}'
  //                 i += 1
  //             variables.add(var)
  //             role_triple = (source, role, var)
  //             node_triple = (var, CONCEPT_ROLE, target)
  //             new_triples.extend((role_triple, node_triple))
  //             # manage epigraphical markers
  //             old_epis = new_epidata.pop(triple) if triple in new_epidata else []
  //             role_epis, node_epis = _attr_markers(old_epis)
  //             new_epidata[role_triple] = role_epis + [Push(var)]
  //             new_epidata[node_triple] = node_epis + [POP]
  //         else:
  //             new_triples.append(triple)
  //     g = Graph(new_triples,
  //               epidata=new_epidata,
  //               metadata=g.metadata)
  //     logger.info('Reified attributes: %s', g)
  //     return g
  const variables = g.variables();
  const newEpidata = new EpidataMap(g.epidata.entries());
  const newTriples: BasicTriple[] = [];
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
      const roleTriple: BasicTriple = [source, role, variable];
      const nodeTriple: BasicTriple = [variable, CONCEPT_ROLE, target];
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
  g = new Graph(newTriples, null, newEpidata, g.metadata);
  log(`Reified attributes: ${g}`);
  return g;
};

// def indicate_branches(g: Graph, model: Model) -> Graph:
//     """
//     Insert TOP triples in *g* indicating the tree structure.

//     Note:
//         This depends on *g* containing the epigraphical layout markers
//         from parsing; it will not work with programmatically
//         constructed Graph objects or those whose epigraphical data
//         were removed.

//     Args:
//         g: a :class:`~penman.graph.Graph` object
//         model: a model defining the TOP role
//     Returns:
//         A new :class:`~penman.graph.Graph` object with TOP roles
//         indicating tree branches.
//     Example:
//         >>> from penman.codec import PENMANCodec
//         >>> from penman.models.amr import model
//         >>> from penman.transform import indicate_branches
//         >>> codec = PENMANCodec(model=model)
//         >>> g = codec.decode('''
//         ... (w / want-01
//         ...    :ARG0 (b / boy)
//         ...    :ARG1 (g / go-02
//         ...             :ARG0 b))''')
//         >>> g = indicate_branches(g, model)
//         >>> print(codec.encode(g))
//         (w / want-01
//            :TOP b
//            :ARG0 (b / boy)
//            :TOP g
//            :ARG1 (g / go-02
//                     :ARG0 b))
//     """
//     new_triples: List[BasicTriple] = []
//     for t in g.triples:
//         push = next((epi for epi in g.epidata.get(t, [])
//                      if isinstance(epi, Push)),
//                     None)
//         if push is not None:
//             if push.variable == t[2]:
//                 new_triples.append((t[0], model.top_role, t[2]))
//             elif push.variable == t[0]:
//                 assert isinstance(t[2], str)
//                 new_triples.append((t[2], model.top_role, t[0]))
//         new_triples.append(t)
//     g = Graph(new_triples,
//               epidata=g.epidata,
//               metadata=g.metadata)
//     logger.info('Indicated branches: %s', g)
//     return g

/**
 *     Insert TOP triples in *g* indicating the tree structure.
 *
 *     Note:
 *         This depends on *g* containing the epigraphical layout markers
 *         from parsing; it will not work with programmatically
 *         constructed Graph objects or those whose epigraphical data
 *         were removed.
 *
 *     Args:
 *         g: a :class:`~penman.graph.Graph` object
 *         model: a model defining the TOP role
 *     Returns:
 *         A new :class:`~penman.graph.Graph` object with TOP roles
 *         indicating tree branches.
 *     Example:
 *         >>> from penman.codec import PENMANCodec
 *         >>> from penman.models.amr import model
 *         >>> from penman.transform import indicate_branches
 *         >>> codec = PENMANCodec(model=model)
 *         >>> g = codec.decode('''
 *         ... (w / want-01
 *         ...    :ARG0 (b / boy)
 *         ...    :ARG1 (g / go-02
 *         ...             :ARG0 b))''')
 *         >>> g = indicate_branches(g, model)
 *         >>> print(codec.encode(g))
 *         (w / want-01
 *            :TOP b
 *            :ARG0 (b / boy)
 *            :TOP g
 *            :ARG1 (g / go-02
 *                     :ARG0 b))
 */
export const indicateBranches = (g: Graph, model: Model): Graph => {
  //     new_triples: List[BasicTriple] = []
  //     for t in g.triples:
  //         push = next((epi for epi in g.epidata.get(t, [])
  //                      if isinstance(epi, Push)),
  //                     None)
  //         if push is not None:
  //             if push.variable == t[2]:
  //                 new_triples.append((t[0], model.top_role, t[2]))
  //             elif push.variable == t[0]:
  //                 assert isinstance(t[2], str)
  //                 new_triples.append((t[2], model.top_role, t[0]))
  //         new_triples.append(t)
  //     g = Graph(new_triples,
  //               epidata=g.epidata,
  //               metadata=g.metadata)
  //     logger.info('Indicated branches: %s', g)
  //     return g
  const newTriples: BasicTriple[] = [];
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
  g = new Graph(newTriples, null, g.epidata, g.metadata);
  log(`Indicated branches: ${g}`);
  return g;
};

// _SplitMarkers = Tuple[Optional[Push], List[Pop], Epidata, Epidata]
type _SplitMarkers = [Push | null, Pop[], Epidata, Epidata];

// def _reified_markers(epidata: Epidata) -> _SplitMarkers:
//     """
//     Return epigraphical markers broken down by function.

//     When a relation is reified the original triple disappears so its
//     epigraphical data needs to be moved and sometimes altered.
//     Consider the following, which has surface alignment markers::

//         (a :role~1 b~2)

//     Under edge reification, the desired outcome is::

//         (a :ARG1-of (_ / role-label~1 :ARG2 b~2))

//     Under attribute reification, it is::

//         (a :role~1 (_ / b~2))
//     """

/**
 *     Return epigraphical markers broken down by function.
 *
 *     When a relation is reified the original triple disappears so its
 *     epigraphical data needs to be moved and sometimes altered.
 *     Consider the following, which has surface alignment markers::
 *
 *         (a :role~1 b~2)
 *
 *     Under edge reification, the desired outcome is::
 *
 *         (a :ARG1-of (_ / role-label~1 :ARG2 b~2))
 *
 *     Under attribute reification, it is::
 *
 *         (a :role~1 (_ / b~2))
 */
const _reifiedMarkers = (epidata: Epidata): _SplitMarkers => {
  //     push = None
  //     pops = []
  //     role_epis = []
  //     other_epis = []
  //     for epi in epidata:
  //         if isinstance(epi, Push):
  //             push = epi
  //         elif isinstance(epi, Pop):
  //             pops.append(epi)
  //         elif epi.mode == 1:
  //             role_epis.append(epi)
  //         else:
  //             other_epis.append(epi)
  //     return push, pops, role_epis, other_epis
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

// def _edge_markers(epidata: Epidata) -> Tuple[Epidata, Epidata]:
//     push, pops, role_epis, other_epis = _reified_markers(epidata)
//     # role markers on the original triple need to be converted to
//     # target markers, if possible
//     node_epis: List[Epidatum] = []
//     for epi in role_epis:
//         if isinstance(epi, RoleAlignment):
//             node_epis.append(Alignment(epi.indices, prefix=epi.prefix))
//         else:
//             pass  # discard things we can't convert
//     # other markers on the original triple get grouped for the
//     # new outgoing triple
//     out_epis = other_epis
//     if push:
//         out_epis.append(push)
//     out_epis.extend(pops)

//     return node_epis, out_epis

const _edgeMarkers = (epidata: Epidata): [Epidata, Epidata] => {
  const [push, pops, roleEpis, otherEpis] = _reifiedMarkers(epidata);
  // role markers on the original triple need to be converted to
  // target markers, if possible
  const nodeEpis: Epidatum[] = [];
  for (const epi of roleEpis) {
    if (epi instanceof RoleAlignment) {
      nodeEpis.push(new Alignment(epi.indices, epi.prefix));
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

// _Dereification = Dict[Variable,
//                       Tuple[BasicTriple,  # inverted triple of reification
//                             BasicTriple,  # dereified triple
//                             List[Epidatum]]]  # computed epidata

type _Dereification = Map<
  Variable,
  [
    BasicTriple, // inverted triple of reification
    BasicTriple, // dereified triple
    Epidatum[], // computed epidata
  ]
>;

// def _dereify_agenda(g: Graph, model: Model) -> _Dereification:

//     alns = alignments(g)
//     agenda: _Dereification = {}
//     fixed: Set[Target] = set([g.top])
//     inst: Dict[Variable, BasicTriple] = {}
//     other: Dict[Variable, List[BasicTriple]] = {}

//     for triple in g.triples:
//         var, role, tgt = triple
//         if role == CONCEPT_ROLE:
//             inst[var] = triple
//         else:
//             fixed.add(tgt)
//             if var not in other:
//                 other[var] = [triple]
//             else:
//                 other[var].append(triple)

const _dereifyAgenda = (g: Graph, model: Model): _Dereification => {
  const alns = alignments(g);
  const agenda: _Dereification = new Map();
  const fixed: Set<Target> = new Set([g.top]);
  const inst: Map<Variable, BasicTriple> = new Map();
  const other: Map<Variable, BasicTriple[]> = new Map();

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

  //     for var, instance in inst.items():
  //         if (var not in fixed
  //                 and len(other.get(var, [])) == 2
  //                 and model.is_concept_dereifiable(instance[2])):
  //             # passed initial checks
  //             # now figure out which other edge is the first one
  //             first, second = other[var]
  //             if get_pushed_variable(g, second) == var:
  //                 first, second = second, first
  //             try:
  //                 dereified = model.dereify(instance, first, second)
  //             except ModelError:
  //                 pass
  //             else:
  //                 # migrate epidata
  //                 epidata: List[Epidatum] = []
  //                 if instance in alns:
  //                     aln = alns[instance]
  //                     epidata.append(
  //                         RoleAlignment(aln.indices, prefix=aln.prefix))
  //                 epidata.extend(epi for epi in g.epidata[second]
  //                                if not isinstance(epi, RoleAlignment))
  //                 agenda[var] = (first, dereified, epidata)

  //     return agenda

  for (const [variable, instance] of inst.entries()) {
    if (
      !fixed.has(variable) &&
      other.get(variable)?.length === 2 &&
      model.isConceptDereifiable(instance[2])
    ) {
      // passed initial checks
      // now figure out which other edge is the first one
      let [first, second] = other.get(variable);
      if (getPushedVariable(g, second) === variable) {
        [first, second] = [second, first];
      }
      try {
        const dereified = model.dereify(instance, first, second);
        // migrate epidata
        const epidata: Epidatum[] = [];
        if (alns.has(instance)) {
          const aln = alns.get(instance);
          epidata.push(new RoleAlignment(aln.indices, aln.prefix));
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

// def _attr_markers(epidata: Epidata) -> Tuple[Epidata, Epidata]:
//     _, pops, role_epis, other_epis = _reified_markers(epidata)
//     node_epis = other_epis
//     node_epis.extend(pops)
//     return role_epis, node_epis

const _attrMarkers = (epidata: Epidata): [Epidata, Epidata] => {
  const [_push, pops, roleEpis, otherEpis] = _reifiedMarkers(epidata);
  const nodeEpis = [...otherEpis];
  nodeEpis.push(...pops);
  return [roleEpis, nodeEpis];
};
