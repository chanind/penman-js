/**
 * Data structures for Penman graphs and triples.
 */

import cloneDeep from 'lodash.clonedeep';
import differenceWith from 'lodash.differencewith';
import isEqual from 'lodash.isequal';

import { EpidataMap } from './epigraph';
import { GraphError } from './exceptions';
import type {
  Attribute,
  Constant,
  Edge,
  Instance,
  Role,
  Triple,
  Triples,
  Variable,
} from './types';
import { defaultdictPlusEqual } from './utils';

export const CONCEPT_ROLE = ':instance';

// hacky way to get a unique id for each graph
// since JS has no id() function like Python
let graphIdCounter = 0;

export interface GraphOptions {
  /** The variable of the top node; if unspecified, the source of the first triple is used. */
  top?: Variable | null;
  /** A mapping of triples to epigraphical markers. */
  epidata?: EpidataMap;
  /** A mapping of metadata types to descriptions. */
  metadata?: Record<string, string>;
}

export interface GraphAttributesOptions {
  source?: Variable;
  role?: Role;
  target?: Constant;
}

export interface GraphEdgesOptions {
  source?: Variable;
  role?: Role;
  target?: Constant;
}

/**
 * Represents a basic class for modeling a rooted, directed acyclic graph.
 *
 * A `Graph` is defined by a list of triples, which can be divided into
 * two parts: a list of graph edges where both the source and target
 * are variables (node identifiers), and a list of node attributes
 * where only the source is a variable and the target is a constant.
 * The raw triples are available via the `triples` property, while the
 * `instances`, `edges`, and `attributes` methods return only those that
 * are concept relations, relations between nodes, or relations between
 * a node and a constant, respectively.
 *
 * @example
 * import { Graph } from 'penman-js';
 *
 * const graph = new Graph([
 *   ['b', ':instance', 'bark-01'],
 *   ['d', ':instance', 'dog'],
 *   ['b', ':ARG0', 'd']
 * ]);
 */
export class Graph {
  private _id: number;
  private _top: Variable | null;
  epidata: EpidataMap;
  metadata: Record<string, string>;

  /**
   * `options` consists of the following:
   *  - `top`: The variable of the top node; if unspecified, the source of the first triple is used.
   *  - `epidata`: A mapping of triples to epigraphical markers.
   *  - `metadata`: A mapping of metadata types to descriptions.
   *
   * @param triples - An iterable of triples (either `Triple` objects or 3-tuples).
   * @param options - Optional arguments.
   * @param options.top - The variable of the top node; if unspecified, the source of the first triple is used.
   * @param options.epidata - A mapping of triples to epigraphical markers.
   * @param options.metadata - A mapping of metadata types to descriptions.
   */
  constructor(
    public triples: Triples = [],
    options: GraphOptions = {},
  ) {
    const { top = null, epidata = new EpidataMap(), metadata = {} } = options;
    this.metadata = metadata;
    this.epidata = epidata;
    this._top = top;
    // the following (a) creates a new list (b) validates that
    // they are triples, and (c) ensures roles begin with :
    this.triples = triples.map(([src, role, tgt]) => [
      src,
      _ensureColon(role),
      tgt,
    ]);

    this._id = graphIdCounter++;
  }

  /** @ignore */
  __repr__() {
    const name = this.constructor.name;
    return `<${name} object (top=${this.top}) at ${this._id}>`;
  }
  /** Equivalent to `__repr__` in Python */
  pprint() {
    return this.__repr__();
  }

  toString() {
    const triples = `[${this.triples.join(',\n   ')}]`;
    const epidata = `{${Array.from(this.epidata.entries())
      .map(([k, v]) => `${k}: ${v}`)
      .join(',\n    ')}}`;
    return `Graph(\n  ${triples},\n  epidata=${epidata})`;
  }

  /**
   * Return `true` if this graph is equal to other graph
   *
   * Equivalent to `__eq__` in Python
   */
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

  /** @ignore */
  __or__(other: any) {
    if (other instanceof Graph) {
      const g = cloneDeep(this);
      g.metadata = {};
      return g.__ior__(other);
    } else {
      throw new Error('NotImplemented');
    }
  }
  or(other: any) {
    return this.__or__(other);
  }

  /** @ignore */
  __ior__(other: any) {
    if (other instanceof Graph) {
      const new_: Triples = differenceWith(
        other.triples,
        this.triples,
        isEqual,
      );
      this.triples.push(
        ...other.triples.filter((t) => new_.find((n) => isEqual(t, n))),
      );
      for (const t of new_) {
        if (other.epidata.has(t)) {
          this.epidata.set(t, other.epidata.get(t));
        }
      }
      this.epidata = new EpidataMap([...this.epidata, ...other.epidata]);
      return this;
    } else {
      throw new Error('NotImplemented');
    }
  }
  ior(other: any) {
    return this.__ior__(other);
  }

  /** @ignore */
  __sub__(other: any) {
    if (other instanceof Graph) {
      const g = cloneDeep(this);
      g.metadata = {};
      return g.__isub__(other);
    } else {
      throw new Error('NotImplemented');
    }
  }
  sub(other: any) {
    return this.__sub__(other);
  }

  /** @ignore */
  __isub__(other: any) {
    if (other instanceof Graph) {
      const removed = other.triples;
      this.triples = this.triples.filter(
        (t) => !removed.find((r) => isEqual(t, r)),
      );
      for (const t of removed) {
        if (this.epidata.has(t)) {
          this.epidata.delete(t);
        }
      }
      const possible_sources = this.triples.map((t) => t[0]);
      const possible_targets = this.triples.map((t) => t[2]);
      const possibleVariables = new Set(
        possible_targets.concat(possible_sources),
      );
      if (!possibleVariables.has(this._top)) {
        this._top = null;
      }
      return this;
    } else {
      throw new Error('NotImplemented');
    }
  }
  isub(other: any) {
    return this.__isub__(other);
  }

  /** The top variable. */
  get top(): Variable | null {
    let top = this._top;
    if (top == null && this.triples.length > 0) {
      top = this.triples[0][0]; // implicit top
    }
    return top;
  }

  set top(top: Variable | null) {
    if (top != null && !this.variables().has(top)) {
      throw new GraphError('top must be a valid node');
    }
    this._top = top; // check if top is valid variable?
  }

  /** Return the set of variables (nonterminal node identifiers). */
  variables(): Set<Variable> {
    const vs = new Set(this.triples.map(([src]) => src));
    if (this._top != null) {
      vs.add(this._top);
    }
    return vs;
  }

  /** Return instances (concept triples). */
  instances(): Instance[] {
    return this._filterTriples(null, CONCEPT_ROLE, null);
  }

  /**
   * Return edges filtered by their *source*, *role*, or *target*.
   * Edges don't include terminal triples (concepts or attributes).
   *
   * `options` consists of the following:
   *  - `source`: The source variable to filter by.
   *  - `role`: The role to filter by.
   *  - `target`: The target variable to filter by.
   */
  edges(options: GraphEdgesOptions = {}): Edge[] {
    const { source, role, target } = options;
    const variables = this.variables();
    return this._filterTriples(source, role, target).filter(
      ([_, rel, tgt]) => rel !== CONCEPT_ROLE && variables.has(tgt as any),
    ) as Edge[];
  }

  /**
   * Return attributes filtered by their *source*, *role*, or *target*.
   * Attributes don't include concept triples or those where the
   * target is a nonterminal.
   *
   * `options` consists of the following:
   *  - `source`: The source variable to filter by.
   *  - `role`: The role to filter by.
   *  - `target`: The target constant to filter by.
   */
  attributes(options: GraphAttributesOptions = {}): Attribute[] {
    const { source, role, target } = options;
    const variables = this.variables();
    return this._filterTriples(source, role, target).filter(
      ([_, rel, tgt]) => rel !== CONCEPT_ROLE && !variables.has(tgt as any),
    );
  }

  /** Filter triples based on their source, role, and/or target. */
  private _filterTriples(
    // TODO: use proper typescript optional types instead of 'null'
    source?: Variable | null,
    role?: Role | null,
    target?: Constant | null,
  ): Triple[] {
    if (source == null && role == null && target == null) {
      return this.triples.slice();
    } else {
      return this.triples.filter(
        ([src, rel, dst]) =>
          (source == null || source === src) &&
          (role == null || role === rel) &&
          (target == null || target === dst),
      );
    }
  }

  /**
   * Return a mapping of variables to their re-entrancy count.
   * A re-entrancy is when more than one edge selects a node as its
   * target. These graphs are rooted, so the top node always has an
   * implicit entrancy. Only nodes with re-entrancies are reported,
   * and the count is only for the entrant edges beyond the first.
   * Also note that these counts are for the interpreted graph, not
   * for the linearized form, so inverted edges are always
   * re-entrant.
   */
  reentrancies(): Map<Variable, number> {
    const entrancies = new Map<Variable, number>();
    if (this.top != null) {
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
    // TODO: should this return a normal JS object instead of a Map?
    return reentrancies;
  }
}

function _ensureColon(role: Role): Role {
  if (!role.startsWith(':')) {
    return ':' + role;
  }
  return role;
}
