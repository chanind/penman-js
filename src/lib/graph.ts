/**
 * Data structures for Penman graphs and triples.
 */

import cloneDeep from 'lodash.clonedeep';
import differenceWith from 'lodash.differencewith';
import isEqual from 'lodash.isequal';

import type { Epidata } from './epigraph';
import { GraphError } from './exceptions';
import type {
  BasicTriple,
  Constant,
  Role,
  Target,
  Triples,
  Variable,
} from './types';
import { defaultdictPlusEqual } from './utils';

// CONCEPT_ROLE = ':instance'

export const CONCEPT_ROLE = ':instance';

// class Triple(NamedTuple):
//     """
//     A relation between nodes or between a node and an constant.

//     Args:
//         source: the source variable of the triple
//         role: the edge label between the source and target
//         target: the target variable or constant
//     """

//     source: Variable
//     """The source variable of the triple."""

//     role: Role
//     """The edge label between the source and target."""

//     target: Target
//     """The target variable or constant."""

/**
 * A relation between nodes or between a node and an constant.
 *
 * Args:
 *    source: the source variable of the triple
 *   role: the edge label between the source and target
 *  target: the target variable or constant
 */
export type Triple = [source: Variable, role: Role, target: Target];

// class Instance(Triple):
//     """A relation indicating the concept of a node."""

//     target: Constant
//     """The node concept."""

/**
 * A relation indicating the concept of a node.
 */
export type Instance = [source: Variable, role: Role, target: Constant];

// class Edge(Triple):
//     """A relation between nodes."""

//     target: Variable
//     """The target variable."""

/**
 * A relation between nodes.
 */
export type Edge = [source: Variable, role: Role, target: Variable];

// class Attribute(Triple):
//     """A relation between a node and a constant."""

//     target: Constant
//     """The target constant."""

/**
 * A relation between a node and a constant.
 */
export type Attribute = [source: Variable, role: Role, target: Constant];

// class Graph(object):
//     """
//     A basic class for modeling a rooted, directed acyclic graph.

//     A Graph is defined by a list of triples, which can be divided into
//     two parts: a list of graph edges where both the source and target
//     are variables (node identifiers), and a list of node attributes
//     where only the source is a variable and the target is a
//     constant. The raw triples are available via the :attr:`triples`
//     attribute, while the :meth:`instances`, :meth:`edges` and
//     :meth:`attributes` methods return only those that are concept
//     relations, relations between nodes, or relations between a node
//     and a constant, respectively.

//     Args:
//         triples: an iterable of triples (:class:`Triple` or 3-tuples)
//         top: the variable of the top node; if unspecified, the source
//             of the first triple is used
//         epidata: a mapping of triples to epigraphical markers
//         metadata: a mapping of metadata types to descriptions
//     Example:
//         >>> from penman.graph import Graph
//         >>> Graph([('b', ':instance', 'bark-01'),
//         ...        ('d', ':instance', 'dog'),
//         ...        ('b', ':ARG0', 'd')])
//         <Graph object (top=b) at ...>
//     """

// hacky way to get a unique id for each graph
// since JS has no id() function like Python
let graph_id_counter = 0;

/**
 * A basic class for modeling a rooted, directed acyclic graph.

 * A Graph is defined by a list of triples, which can be divided into
 * two parts: a list of graph edges where both the source and target
 * are variables (node identifiers), and a list of node attributes
 * where only the source is a variable and the target is a
 * constant. The raw triples are available via the :attr:`triples`
 * attribute, while the :meth:`instances`, :meth:`edges` and
 * :meth:`attributes` methods return only those that are concept
 * relations, relations between nodes, or relations between a node
 * and a constant, respectively.

 * Args:
 *     triples: an iterable of triples (:class:`Triple` or 3-tuples)
 *     top: the variable of the top node; if unspecified, the source
 *         of the first triple is used
 *     epidata: a mapping of triples to epigraphical markers
 *     metadata: a mapping of metadata types to descriptions
 * Example:
 *     >>> from penman.graph import Graph
 *     >>> Graph([('b', ':instance', 'bark-01'),
 *     ...        ('d', ':instance', 'dog'),
 *     ...        ('b', ':ARG0', 'd')])
 *     <Graph object (top=b) at ...>
 */
export class Graph {
  //     def __init__(self,
  //                  triples: Triples = None,
  //                  top: Variable = None,
  //                  epidata: Mapping[BasicTriple, Epidata] = None,
  //                  metadata: Mapping[str, str] = None):
  //         if not triples:
  //             triples = []
  //         if not epidata:
  //             epidata = {}
  //         if not metadata:
  //             metadata = {}

  //         # the following (a) creates a new list (b) validates that
  //         # they are triples, and (c) ensures roles begin with :
  //         self.triples = [(src, _ensure_colon(role), tgt)
  //                         for src, role, tgt in triples]
  //         self._top = top
  //         self.epidata = dict(epidata)
  //         self.metadata = dict(metadata)

  _id: number;

  constructor(
    public triples: Triples = [],
    private _top: Variable = null,
    public epidata: Map<BasicTriple, Epidata> = new Map(),
    public metadata: Record<string, string> = {}
  ) {
    // the following (a) creates a new list (b) validates that
    // they are triples, and (c) ensures roles begin with :
    this.triples = triples.map(([src, role, tgt]) => [
      src,
      _ensure_colon(role),
      tgt,
    ]);

    this._id = graph_id_counter++;
  }

  //     def __repr__(self):
  //         name = self.__class__.__name__
  //         return f'<{name} object (top={self.top}) at {id(self)}>'

  __repr__() {
    const name = this.constructor.name;
    return `<${name} object (top=${this.top}) at ${this._id}>`;
  }
  //     def __str__(self):
  //         triples = '[{}]'.format(',\n   '.join(map(repr, self.triples)))
  //         epidata = '{{{}}}'.format(',\n    '.join(
  //             map('{0[0]!r}: {0[1]!r}'.format, self.epidata.items())))
  //         return f'Graph(\n  {triples},\n  epidata={epidata})'

  toString() {
    const triples = `[${this.triples.join(',\n   ')}]`;
    const epidata = `{${Array.from(this.epidata.entries())
      .map(([k, v]) => `${k}: ${v}`)
      .join(',\n    ')}}`;
    return `Graph(\n  ${triples},\n  epidata=${epidata})`;
  }

  //     def __eq__(self, other):
  //         if not isinstance(other, Graph):
  //             return NotImplemented
  //         return (self.top == other.top
  //                 and len(self.triples) == len(other.triples)
  //                 and set(self.triples) == set(other.triples))

  equals(other: any) {
    if (!(other instanceof Graph)) {
      return false;
    }
    return (
      this.top === other.top &&
      this.triples.length === other.triples.length &&
      isEqual(new Set(this.triples), new Set(other.triples))
    );
  }

  //     def __or__(self, other):
  //         if isinstance(other, Graph):
  //             g = copy.deepcopy(self)
  //             g.metadata.clear()
  //             g |= other
  //             return g
  //         else:
  //             return NotImplemented

  __or__(other: any) {
    if (other instanceof Graph) {
      const g = cloneDeep(this);
      g.metadata = {};
      return g.__ior__(other);
    } else {
      throw new Error('NotImplemented');
    }
  }

  //     def __ior__(self, other):
  //         if isinstance(other, Graph):
  //             new = set(other.triples) - set(self.triples)
  //             self.triples.extend(t for t in other.triples if t in new)
  //             for t in new:
  //                 if t in other.epidata:
  //                     self.epidata[t] = list(other.epidata[t])
  //             self.epidata.update(other.epidata)
  //             return self
  //         else:
  //             return NotImplemented

  __ior__(other: any) {
    if (other instanceof Graph) {
      const new_: Triples = differenceWith(
        other.triples,
        this.triples,
        isEqual
      );
      this.triples.push(
        ...other.triples.filter((t) => new_.find((n) => isEqual(t, n)))
      );
      for (const t of new_) {
        if (other.epidata.has(t)) {
          this.epidata.set(t, other.epidata.get(t));
        }
      }
      this.epidata = new Map([...this.epidata, ...other.epidata]);
      return this;
    } else {
      throw new Error('NotImplemented');
    }
  }

  //     def __sub__(self, other):
  //         if isinstance(other, Graph):
  //             g = copy.deepcopy(self)
  //             g.metadata.clear()
  //             g -= other
  //             return g
  //         else:
  //             return NotImplemented

  __sub__(other: any) {
    if (other instanceof Graph) {
      const g = cloneDeep(this);
      g.metadata = {};
      return g.__isub__(other);
    } else {
      throw new Error('NotImplemented');
    }
  }

  //     def __isub__(self, other):
  //         if isinstance(other, Graph):
  //             removed = set(other.triples)
  //             self.triples[:] = [t for t in self.triples if t not in removed]
  //             for t in removed:
  //                 if t in self.epidata:
  //                     del self.epidata[t]
  //             possible_variables = set(v for t in self.triples for v in t[::2])
  //             if self._top not in possible_variables:
  //                 self._top = None
  //             return self
  //         else:
  //             return NotImplemented

  __isub__(other: any) {
    if (other instanceof Graph) {
      const removed = other.triples;
      this.triples = this.triples.filter(
        (t) => !removed.find((r) => isEqual(t, r))
      );
      for (const t of removed) {
        if (this.epidata.has(t)) {
          this.epidata.delete(t);
        }
      }
      const possible_sources = this.triples.map((t) => t[0]);
      const possible_targets = this.triples.map((t) => t[2]);
      const possible_variables = new Set(
        possible_targets.concat(possible_sources)
      );
      if (!possible_variables.has(this._top)) {
        this._top = null;
      }
      return this;
    } else {
      throw new Error('NotImplemented');
    }
  }

  //     @property
  //     def top(self) -> Union[Variable, None]:
  //         """
  //         The top variable.
  //         """
  //         top = self._top
  //         if top is None and len(self.triples) > 0:
  //             top = self.triples[0][0]  # implicit top
  //         return top

  get top(): Variable | null {
    /** The top variable. */
    let top = this._top;
    if (top === null && this.triples.length > 0) {
      top = this.triples[0][0]; // implicit top
    }
    return top;
  }

  //     @top.setter
  //     def top(self, top: Union[Variable, None]):
  //         if top is not None and top not in self.variables():
  //             raise GraphError('top must be a valid node')
  //         self._top = top  # check if top is valid variable?

  set top(top: Variable | null) {
    if (top !== null && !this.variables().has(top)) {
      throw new GraphError('top must be a valid node');
    }
    this._top = top; // check if top is valid variable?
  }

  //     def variables(self) -> Set[Variable]:
  //         """
  //         Return the set of variables (nonterminal node identifiers).
  //         """
  //         vs = set(src for src, _, _ in self.triples)
  //         if self._top is not None:
  //             vs.add(self._top)
  //         return vs

  variables(): Set<Variable> {
    /** Return the set of variables (nonterminal node identifiers). */
    const vs = new Set(this.triples.map(([src]) => src));
    if (this._top !== null) {
      vs.add(this._top);
    }
    return vs;
  }

  //     def instances(self) -> List[Instance]:
  //         """
  //         Return instances (concept triples).
  //         """
  //         return [Instance(*t)
  //                 for t in self._filter_triples(None, CONCEPT_ROLE, None)]

  instances(): Instance[] {
    /** Return instances (concept triples). */
    return this._filter_triples(null, CONCEPT_ROLE, null);
  }

  //     def edges(self,
  //               source: Optional[Variable] = None,
  //               role: Role = None,
  //               target: Variable = None) -> List[Edge]:
  //         """
  //         Return edges filtered by their *source*, *role*, or *target*.

  //         Edges don't include terminal triples (concepts or attributes).
  //         """
  //         variables = self.variables()
  //         return [Edge(*t)
  //                 for t in self._filter_triples(source, role, target)
  //                 if t[1] != CONCEPT_ROLE and t[2] in variables]

  edges(
    source: Variable | null = null,
    role: Role | null = null,
    target: Variable | null = null
  ): Edge[] {
    /** Return edges filtered by their *source*, *role*, or *target*.
     * Edges don't include terminal triples (concepts or attributes). */
    const variables = this.variables();
    return this._filter_triples(source, role, target).filter(
      ([_, rel, tgt]) => rel !== CONCEPT_ROLE && variables.has(tgt as any)
    ) as Edge[];
  }

  //     def attributes(self,
  //                    source: Optional[Variable] = None,
  //                    role: Role = None,
  //                    target: Constant = None) -> List[Attribute]:
  //         """
  //         Return attributes filtered by their *source*, *role*, or *target*.

  //         Attributes don't include concept triples or those where the
  //         target is a nonterminal.
  //         """
  //         variables = self.variables()
  //         return [Attribute(*t)
  //                 for t in self._filter_triples(source, role, target)
  //                 if t[1] != CONCEPT_ROLE and t[2] not in variables]

  attributes(
    source: Variable | null = null,
    role: Role | null = null,
    target: Constant | null = null
  ): Attribute[] {
    /** Return attributes filtered by their *source*, *role*, or *target*.
     * Attributes don't include concept triples or those where the
     * target is a nonterminal. */
    const variables = this.variables();
    return this._filter_triples(source, role, target).filter(
      ([_, rel, tgt]) => rel !== CONCEPT_ROLE && !variables.has(tgt as any)
    );
  }

  //     def _filter_triples(self,
  //                         source: Optional[Variable],
  //                         role: Optional[Role],
  //                         target: Optional[Target]) -> List[BasicTriple]:
  //         """
  //         Filter triples based on their source, role, and/or target.
  //         """
  //         if source is role is target is None:
  //             triples = list(self.triples)
  //         else:
  //             triples = [
  //                 t for t in self.triples
  //                 if ((source is None or source == t[0])
  //                     and (role is None or role == t[1])
  //                     and (target is None or target == t[2]))
  //             ]
  //         return triples

  _filter_triples(
    // TODO: use proper typescript optional types instead of 'null'
    source: Variable | null = null,
    role: Role | null = null,
    target: Constant | null = null
  ): BasicTriple[] {
    /** Filter triples based on their source, role, and/or target. */
    // TODO: check for undefined OR null
    if (source === null && role === null && target === null) {
      return this.triples.slice();
    } else {
      return this.triples.filter(
        ([src, rel, dst]) =>
          (source === null || source === src) &&
          (role === null || role === rel) &&
          (target === null || target === dst)
      );
    }
  }

  //     def reentrancies(self) -> Dict[Variable, int]:
  //         """
  //         Return a mapping of variables to their re-entrancy count.

  //         A re-entrancy is when more than one edge selects a node as its
  //         target. These graphs are rooted, so the top node always has an
  //         implicit entrancy. Only nodes with re-entrancies are reported,
  //         and the count is only for the entrant edges beyond the first.
  //         Also note that these counts are for the interpreted graph, not
  //         for the linearized form, so inverted edges are always
  //         re-entrant.
  //         """
  //         entrancies: Dict[Variable, int] = defaultdict(int)
  //         if self.top is not None:
  //             entrancies[self.top] += 1  # implicit entrancy to top
  //         for t in self.edges():
  //             entrancies[t.target] += 1
  //         return dict((v, cnt - 1) for v, cnt in entrancies.items() if cnt >= 2)

  // TODO: should this return a normal JS object instead of a Map?
  reentrancies(): Map<Variable, number> {
    /** Return a mapping of variables to their re-entrancy count.
     * A re-entrancy is when more than one edge selects a node as its
     * target. These graphs are rooted, so the top node always has an
     * implicit entrancy. Only nodes with re-entrancies are reported,
     * and the count is only for the entrant edges beyond the first.
     * Also note that these counts are for the interpreted graph, not
     * for the linearized form, so inverted edges are always
     * re-entrant. */
    const entrancies = new Map<Variable, number>();
    if (this.top !== null) {
      defaultdictPlusEqual(entrancies, this.top, 1); // implicit entrancy to top
    }
    for (const edge of this.edges()) {
      defaultdictPlusEqual(entrancies, edge[2], 1);
    }
    const reentrancies = new Map<Variable, number>();
    for (const [v, cnt] of entrancies.entries()) {
      if (cnt >= 2) {
        reentrancies.set(v, cnt - 1);
      }
    }
    return reentrancies;
  }
}

// def _ensure_colon(role):
//     if not role.startswith(':'):
//         return ':' + role
//     return role

function _ensure_colon(role: Role): Role {
  if (!role.startsWith(':')) {
    return ':' + role;
  }
  return role;
}
