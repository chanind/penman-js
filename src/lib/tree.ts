/** Definitions of tree structures. */

import isEqual from 'lodash.isequal';
import formatString from 'string-format';

import { format } from './format';
import { Graph } from './graph';
import { interpret } from './layout';
import { Model } from './model';
import { parse } from './parse';
import type { Branch, Node, Variable } from './types';

type _Step = [number[], Branch]; // see Tree.walk()
type VarMap = { [key: string]: string };

export interface TreeOptions {
  /** Any metadata associated with the tree. */
  metadata?: { [key: string]: string };
}

export interface TreeToPenmanOptions {
  /** How to indent formatted strings. */
  indent?: number | null;
  /** If `true`, put initial attributes on the first line. */
  compact?: boolean;
}

export interface TreeToGraphOptions {
  model?: Model;
}

/**
 * A tree structure.
 *
 * A tree is essentially a node that contains other nodes, but this
 * Tree class is useful to contain any metadata and to provide
 * tree-based methods.
 *
 * `options` consists of the following:
 *  - `metadata`: Any metadata associated with the tree.
 */
export class Tree {
  node: Node;
  metadata: { [key: string]: string };

  constructor(node: Node, options: TreeOptions = {}) {
    const { metadata = {} } = options;
    if (!node) {
      throw new Error('Tree node cannot be null');
    }
    this.node = node;
    this.metadata = metadata;
  }

  /** @ignore */
  __eq__(other: any): boolean {
    if (other instanceof Tree) {
      other = other.node;
    }
    return isEqual(this.node, other);
  }

  /**
   * Parse a penman-formatted string into a Tree.
   *
   * This is equivalent to the `parse()` function in the Python library
   *
   * @param penmanString - A string containing a single PENMAN-serialized tree.
   * @example
   * import { Tree } from 'penman-js';
   *
   * const tree = Tree.fromPenman(`
   * (t / try-01
   *     :ARG0 (d / dog)
   *     :ARG1 (b / bark-01
   *             :ARG0 d))
   * `)
   */
  static fromPenman(penmanString: string): Tree {
    return parse(penmanString);
  }

  /**
   * Return this `Tree` as a PENMAN string.
   *
   * This is equivalent to `format()` in the Python library
   *
   * `options` consists of the following:
   *  - `indent`: How to indent formatted strings.
   *  - `compact`: If `true`, put initial attributes on the first line.
   *
   * @param options - Optional arguments.
   * @param options.indent - How to indent formatted strings.
   * @param options.compact - If `true`, put initial attributes on the first line.
   * @returns The PENMAN-serialized string of the `Tree` object.
   * @example
   * import { Tree } from 'penman-js';
   *
   * const tree = new Tree(
   *   ['b', [['/', 'bark-01'],
   *          [':ARG0', ['d', [['/', 'dog']]]]]
   *   ]
   * );
   *
   * console.log(tree.toPenman());
   * // (b / bark-01
   * //   :ARG0 (d / dog))
   */
  toPenman(options: TreeToPenmanOptions = {}): string {
    return format(this, options);
  }

  /**
   * Return this tree as a graph using `model`.
   *
   * Tree interpretation is the process of transforming the nodes and
   * edges of a tree into a directed graph. A semantic model determines
   * which edges are inverted and how to deinvert them. If `model` is
   * not provided, the default model will be used.
   *
   * This is equivalent to `interpret()` in the Python library.
   *
   * `options` consists of the following:
   *  - `model`: a model to use for the transformation
   *
   * @param options - Optional arguments.
   * @param options.model - a model to use for the transformation
   * @returns The interpreted `Graph` object.
   * @example
   * import { Tree } from 'penman-js';
   *
   * const t = new Tree(['b', [
   *   ['/', 'bark-01'],
   *   ['ARG0', ['d', [
   *     ['/', 'dog']
   *   ]]]
   * ]]);
   *
   * const g = t.toGraph();
   * for (const triple of g.triples) {
   *   console.log(triple);
   * }
   * // ['b', ':instance', 'bark-01']
   * // ['b', ':ARG0', 'd']
   * // ['d', ':instance', 'dog']
   */
  toGraph(options: TreeToGraphOptions = {}): Graph {
    return interpret(this, options);
  }

  /**
   * Return `true` if this tree is equal to other tree
   *
   * Equivalent to `__eq__` in Python
   */
  equals(other: any): boolean {
    return this.__eq__(other);
  }

  /** @ignore */
  __repr__(): string {
    return `Tree(${this.node})`;
  }
  /** Equivalent to `__repr__` in Python */
  pprint(): string {
    return this.__repr__();
  }

  toString(): string {
    const s = _format(this.node, 2);
    return `Tree(\n  ${s})`;
  }

  /**
   * Return the nodes in the tree as a flat list.
   */
  nodes(): Node[] {
    return _nodes(this.node);
  }

  /**
   * Iterate over branches in the tree.
   *
   * This function yields pairs of (`path`, `branch`) where each
   * `path` is an array of 0-based indices of branches to get to
   * `branch`. For example, the path [2, 0] is the concept branch
   * `('/', 'bark-01')` in the tree for the following PENMAN
   * string, traversing first to the third (index 2) branch of the
   * top node, then to the first (index 0) branch of that node:
   *
   * ```
   * (t / try-01
   *     :ARG0 (d / dog)
   *     :ARG1 (b / bark-01
   *             :ARG0 d))
   * ```
   *
   * The (`path`, `branch`) pairs are yielded in depth-first order
   * of the tree traversal.
   *
   * @returns An iterator yielding pairs of path and branch in depth-first order.
   */
  *walk(): Generator<_Step> {
    yield* _walk(this.node, []);
  }

  /**
   * Recreate node variables formatted using `fmt`.
   *
   * The `fmt` string can be formatted with the following values:
   *
   * - `prefix`: first alphabetic character in the node's concept
   * - `i`: 0-based index of the current occurrence of the prefix
   * - `j`: 1-based index starting from the second occurrence
   */
  resetVariables(fmt = '{prefix}{j}'): void {
    const varmap: VarMap = {};
    const used: Set<Variable> = new Set();
    for (const node of this.nodes()) {
      const [variable, branches = []] = node;
      if (!(variable in varmap)) {
        const concept = branches.find((branch) => branch[0] === '/')?.[1];
        const pre = _defaultVariablePrefix(concept);
        let i = 0;
        let newvar: string | null = null;
        while (newvar == null || used.has(newvar)) {
          newvar = formatString(fmt, {
            prefix: pre,
            i: i,
            j: i === 0 ? '' : `${i + 1}`,
          });
          i += 1;
        }
        used.add(newvar);
        varmap[variable] = newvar;
      }
    }
    this.node = _mapVars(this.node, varmap);
  }
}

const _format = (node: Node, level: number): string => {
  const [variable, branches = []] = node;
  const next_level = level + 2;
  const indent = '\n' + ' '.repeat(next_level);
  const branch_strings = branches.map((branch) =>
    _formatBranch(branch, next_level),
  );
  return formatString(
    '({}, [{}{}])',
    variable,
    indent,
    branch_strings.join(',' + indent),
  );
};

const _formatBranch = (branch: Branch, level: number): string => {
  const [role, target] = branch;
  const target_str = isAtomic(target) ? `${target}` : _format(target, level);
  return `(${role}, ${target_str})`;
};

const _nodes = (node: Node): Node[] => {
  const [variable, branches = []] = node;
  let ns = variable ? [node] : [];
  for (const branch of branches) {
    const target = branch[1];
    // if target is not atomic, assume it's a valid tree node
    if (!isAtomic(target)) {
      ns = ns.concat(_nodes(target));
    }
  }
  return ns;
};

function* _walk(node: Node, path: number[]): Generator<_Step> {
  const branches = node[1] ?? [];
  for (const [i, branch] of branches.entries()) {
    const curpath = path.concat([i]);
    yield [curpath, branch];
    const target = branch[1];
    if (!isAtomic(target)) {
      yield* _walk(target, curpath);
    }
  }
}

/**
 * Return the variable prefix for `concept`.
 *
 * If `concept` is a non-empty string, the prefix is the first
 * alphabetic character in the string, if there are any, downcased.
 * Otherwise, the prefix is `'_'`.
 *
 * @param concept - The concept to determine the prefix for.
 * @returns The variable prefix for the given `concept`.
 * @example
 * console.log(defaultVariablePrefix('Alphabet')); // Outputs: 'a'
 * console.log(defaultVariablePrefix('chase-01')); // Outputs: 'c'
 * console.log(defaultVariablePrefix('"string"')); // Outputs: 's'
 * console.log(defaultVariablePrefix('_predicate_n_1"')); // Outputs: 'p'
 * console.log(defaultVariablePrefix(1)); // Outputs: '_'
 * console.log(defaultVariablePrefix(null)); // Outputs: '_'
 * console.log(defaultVariablePrefix('')); // Outputs: '_'
 */
export const _defaultVariablePrefix = (concept: any): Variable => {
  let prefix = '_';
  if (concept && typeof concept === 'string') {
    for (const c of concept) {
      if (isalpha(c)) {
        prefix = c.toLowerCase();
        break;
      }
    }
  }
  return prefix;
};

function isalpha(c: string): boolean {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z');
}

const _mapVars = (node: Node, varmap: VarMap): Node => {
  const [variable, branches = []] = node;

  const newbranches: Branch[] = [];
  for (const branch of branches) {
    const [role, target] = branch;
    let tgt = target;
    if (!isAtomic(tgt)) {
      tgt = _mapVars(tgt, varmap);
    } else if (role !== '/' && tgt in varmap) {
      tgt = varmap[tgt];
    }
    newbranches.push([role, tgt]);
  }
  return [varmap[variable], newbranches];
};

/**
 * Return `true` if `x` is a valid atomic value.
 *
 * @param x - The value to check.
 * @returns `true` if `x` is a valid atomic value, otherwise `false`.
 * @example
 * console.log(isAtomic('a')); // Outputs: true
 * console.log(isAtomic(null)); // Outputs: true
 * console.log(isAtomic(3.14)); // Outputs: true
 * console.log(isAtomic(['a', [['/', 'alpha']]])); // Outputs: false
 */
export const isAtomic = (x: any): boolean => {
  return (
    x == null ||
    x === undefined ||
    typeof x === 'string' ||
    typeof x === 'number'
  );
};
