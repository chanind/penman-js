import { isAtomic, Tree } from './tree';
import { BasicTriple, Branch, Node } from './types';
import { lstrip } from './utils';

/**
 * Format a `Tree` object into a PENMAN string.
 *
 * @param tree - A Tree object.
 * @param indent - How to indent formatted strings.
 * @param compact - If `true`, put initial attributes on the first line.
 * @returns The PENMAN-serialized string of the `Tree` object.
 * @example
 * import { format } from 'penman-js';
 *
 * console.log(format(
 *   ['b', [['/', 'bark-01'],
 *          [':ARG0', ['d', [['/', 'dog']]]]]
 *   ]
 * ));
 * // (b / bark-01
 * //   :ARG0 (d / dog))
 */
export const format = (
  tree: Tree | Node,
  indent: number | null | undefined = -1,
  compact = false,
): string => {
  if (!(tree instanceof Tree)) {
    tree = new Tree(tree);
  }
  const vars = compact ? tree.nodes().map(([variable]) => variable) : [];
  const parts = Object.entries(tree.metadata).map(
    ([key, value]) => `# ::${key}${value ? ' ' + value : value}`,
  );
  parts.push(_formatNode(tree.node, indent, 0, new Set(vars)));
  return parts.join('\n');
};

/**
 * Return the formatted triple conjunction of `triples`.
 *
 * @param triples - An iterable of triples.
 * @param indent - How to indent formatted strings.
 * @returns The serialized triple conjunction of `triples`.
 * @example
 * import { decode, formatTriples } from 'penman-js';
 *
 * const g = decode('(b / bark-01 :ARG0 (d / dog))');
 * console.log(formatTriples(g.triples));
 * // instance(b, bark-01) ^
 * // ARG0(b, d) ^
 * // instance(d, dog)
 */
export const formatTriples = (
  triples: BasicTriple[],
  indent = true,
): string => {
  const delim = indent ? ' ^\n' : ' ^ ';
  // need to remove initial : on roles for triples
  const conjunction = triples.map(
    ([source, role, target]) => `${lstrip(role, ':')}(${source}, ${target})`,
  );
  return conjunction.join(delim);
};

/**
 * Format tree *node* into a PENMAN string.
 */
const _formatNode = (
  node: Node,
  indent: number | null | undefined,
  column: number,
  vars: Set<string>,
): string => {
  const [variable, edges] = node;
  if (!variable) {
    return '()'; // empty node
  }
  if (!edges.length) {
    return `(${variable})`; // var-only node
  }
  // determine appropriate joiner based on value of indent
  let joiner: string;
  if (indent == null) {
    joiner = ' ';
  } else {
    if (indent === -1) {
      column += variable.length + 2; // +2 for ( and a space
    } else {
      column += indent;
    }
    joiner = '\n' + ' '.repeat(column);
  }
  // format the edges and join them
  // if vars is non-empty, all initial attributes are compactly
  // joined on the same line, otherwise they use joiner
  let parts: string[] = [];
  let compact = !!vars.size;
  for (const edge of edges) {
    const target = edge[1];
    if (compact && (!isAtomic(target) || vars.has(target))) {
      compact = false;
      if (parts.length) {
        parts = [parts.join(' ')];
      }
    }
    parts.push(_formatEdge(edge, indent, column, vars));
  }
  // check if all edges can be compactly written
  if (compact) {
    parts = [parts.join(' ')];
  }
  return `(${variable} ${parts.join(joiner)})`;
};

/**
 * Format tree *edge* into a PENMAN string.
 */
const _formatEdge = (
  edge: Branch,
  indent: number | null,
  column: number,
  vars: Set<string>,
): string => {
  let [role, target] = edge;
  if (role !== '/' && !role.startsWith(':')) {
    role = ':' + role;
  }
  if (indent === -1) {
    column += role.length + 1; // +1 for :
  }
  let sep = ' ';
  if (!target) {
    target = sep = '';
  } else if (!isAtomic(target)) {
    target = _formatNode(target, indent, column, vars);
  }
  return `${role}${sep}${target}`;
};
