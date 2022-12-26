/**
 * Serialization of PENMAN graphs.
 */

import { format, formatTriples } from './_format';
import { iterparse, parse, parseTriples } from './_parse';
import { Graph } from './graph';
import * as layout from './layout';
import { Model } from './model';
import { Tree } from './tree';
import { BasicTriple, Node, Variable } from './types';

// # "Utility" types; not Penman-specific

/**
 * An encoder/decoder for PENMAN-serialized graphs.
 */
export class PENMANCodec {
  model: Model;

  constructor(model: Model | null = null) {
    if (model === null) {
      model = new Model();
    }
    this.model = model;
  }

  /**
   * Deserialize PENMAN-notation string *s* into its Graph object.
   *
   * Args:
   *     s: a string containing a single PENMAN-serialized graph
   * Returns:
   *     The :class:`~penman.graph.Graph` object described by *s*.
   * Example:
   *     >>> from penman.codec import PENMANCodec
   *     >>> codec = PENMANCodec()
   *     >>> codec.decode('(b / bark-01 :ARG0 (d / dog))')
   *     <Graph object (top=b) at ...>
   */
  decode(s: string): Graph {
    const tree = parse(s);
    return layout.interpret(tree, this.model);
  }

  /**
   * Yield graphs parsed from *lines*.
   *
   * Args:
   *     lines: a string or open file with PENMAN-serialized graphs
   * Returns:
   *     The :class:`~penman.graph.Graph` objects described in
   *     *lines*.
   */
  *iterdecode(lines: string | string[]): IterableIterator<Graph> {
    for (const tree of iterparse(lines)) {
      yield layout.interpret(tree, this.model);
    }
  }

  /**
   * Yield trees parsed from *lines*.
   *
   * Args:
   *     lines: a string or open file with PENMAN-serialized graphs
   * Returns:
   *     The :class:`~penman.tree.Tree` object described in
   *     *lines*.
   */
  *iterparse(lines: string | string[]): IterableIterator<Tree> {
    yield* iterparse(lines);
  }

  /**
   * Parse PENMAN-notation string *s* into its tree structure.
   *
   * Args:
   *     s: a string containing a single PENMAN-serialized graph
   * Returns:
   *     The tree structure described by *s*.
   * Example:
   *     >>> from penman.codec import PENMANCodec
   *     >>> codec = PENMANCodec()
   *     >>> codec.parse('(b / bark-01 :ARG0 (d / dog))')  # noqa
   *     Tree(('b', [('/', 'bark-01'), (':ARG0', ('d', [('/', 'dog')]))]))
   */
  parse(s: string): Tree {
    return parse(s);
  }

  /**
   * Parse a triple conjunction from *s*.
   */
  parseTriples(s: string): BasicTriple[] {
    return parseTriples(s);
  }

  /**
   * Serialize the graph *g* into PENMAN notation.
   *
   * Args:
   *     g: the Graph object
   *     top: if given, the node to use as the top in serialization
   *     indent: how to indent formatted strings
   *     compact: if ``True``, put initial attributes on the first line
   * Returns:
   *     the PENMAN-serialized string of the Graph *g*
   * Example:
   *     >>> from penman.graph import Graph
   *     >>> from penman.codec import PENMANCodec
   *     >>> codec = PENMANCodec()
   *     >>> codec.encode(Graph([('h', 'instance', 'hi')]))
   *     '(h / hi)'
   */
  encode(
    g: Graph,
    top?: Variable,
    indent: number | null | undefined = -1,
    compact = false
  ): string {
    const tree = layout.configure(g, top, this.model);
    return this.format(tree, indent, compact);
  }

  /**
   * Format *tree* into a PENMAN string.
   */
  format(
    tree: Tree | Node,
    indent: number | null | undefined = -1,
    compact = false
  ): string {
    return format(tree, indent, compact);
  }

  /**
   * Return the formatted triple conjunction of *triples*.
   *
   * Args:
   *     triples: an iterable of triples
   *     indent: how to indent formatted strings
   * Returns:
   *     the serialized triple conjunction of *triples*
   * Example:
   *     >>> from penman.codec import PENMANCodec
   *     >>> codec = PENMANCodec()
   *     >>> codec.format_triples([('a', ':instance', 'alpha'),
   *     ...                       ('a', ':ARG0', 'b'),
   *     ...                       ('b', ':instance', 'beta')])
   *     ...
   *     'instance(a, alpha) ^\\nARG0(a, b) ^\\ninstance(b, beta)'
   */
  formatTriples(triples: BasicTriple[], indent = true): string {
    return formatTriples(triples, indent);
  }
}

/**
 * Deserialize PENMAN-serialized *s* into its Graph object
 *
 * Args:
 *     s: a string containing a single PENMAN-serialized graph
 *     model: the model used for interpreting the graph
 * Returns:
 *     the Graph object described by *s*
 * Example:
 *     >>> import penman
 *     >>> penman.decode('(b / bark-01 :ARG0 (d / dog))')
 *     <Graph object (top=b) at ...>
 */
export function _decode(s: string, model?: Model): Graph {
  const codec = new PENMANCodec(model);
  return codec.decode(s);
}

/**
 * Yield graphs parsed from *lines*.
 *
 * Args:
 *     lines: a string or open file with PENMAN-serialized graphs
 *     model: the model used for interpreting the graph
 * Returns:
 *     The :class:`~penman.graph.Graph` objects described in
 *     *lines*.
 * Example:
 *     >>> import penman
 *     >>> for g in penman.iterdecode('(a / alpha) (b / beta)'):
 *     ...     print(repr(g))
 *     <Graph object (top=a) at ...>
 *     <Graph object (top=b) at ...>
 */
export function* _iterdecode(
  lines: string | string[],
  model?: Model
): IterableIterator<Graph> {
  const codec = new PENMANCodec(model);
  yield* codec.iterdecode(lines);
}

/**
 * Serialize the graph *g* from *top* to PENMAN notation.
 *
 * Args:
 *     g: the Graph object
 *     top: if given, the node to use as the top in serialization
 *     model: the model used for interpreting the graph
 *     indent: how to indent formatted strings
 *     compact: if ``True``, put initial attributes on the first line
 * Returns:
 *     the PENMAN-serialized string of the Graph *g*
 * Example:
 *     >>> import penman
 *     >>> from penman.graph import Graph
 *     >>> penman.encode(Graph([('h', 'instance', 'hi')]))
 *     '(h / hi)'
 */
export function _encode(
  g: Graph,
  top?: Variable,
  model?: Model,
  indent: number | null | undefined = -1,
  compact = false
): string {
  const codec = new PENMANCodec(model);
  return codec.encode(g, top, indent, compact);
}

/**
 * Deserialize a list of PENMAN-encoded graphs from *source*.

 * Args:
 *     source: a filename to read from
 *     model: the model used for interpreting the graph
 * Returns:
 *     a list of Graph objects
 */
export function _load(
  source: string,
  model?: Model,
  encoding?: string
): Graph[] {
  // importing fs here because it's only valid in node
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  const codec = new PENMANCodec(model);
  return Array.from(codec.iterdecode(fs.readFileSync(source, encoding)));
}

/**
 * Deserialize a list of PENMAN-encoded graphs from *string*.
 *
 * Args:
 *     string: a string containing graph data
 *     model: the model used for interpreting the graph
 * Returns:
 *     a list of Graph objects
 */
export function _loads(string: string, model?: Model): Graph[] {
  const codec = new PENMANCodec(model);
  return Array.from(codec.iterdecode(string));
}

/**
 * Serialize each graph in *graphs* to PENMAN and write to *file*.
 *
 * Args:
 *     graphs: an iterable of Graph objects
 *     file: a filename to write to
 *     model: the model used for interpreting the graph
 *     indent: how to indent formatted strings
 *     compact: if ``True``, put initial attributes on the first line
 */
export function _dump(
  graphs: Graph[],
  file: string,
  model?: Model,
  indent: number | null | undefined = -1,
  compact = false,
  encoding?: string
): void {
  const codec = new PENMANCodec(model);
  _dumpStream(file, graphs, codec, indent, compact, encoding);
}

/** Helper method for dump() for incremental printing. */
export function _dumpStream(
  file: string,
  gs: Graph[],
  codec: PENMANCodec,
  indent: number | null | undefined,
  compact: boolean,
  encoding?: string
): void {
  // importing fs here because it's only valid in node
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  const ss = gs.map((g) => codec.encode(g, undefined, indent, compact));
  let contents = '';
  for (const s of ss) {
    console.log(s);
    contents += s + '\n';
  }
  fs.writeFileSync(file, contents, encoding);
}

/**
 * Serialize each graph in *graphs* to the PENMAN format.
 *
 * Args:
 *     graphs: an iterable of Graph objects
 *     model: the model used for interpreting the graph
 *     indent: how to indent formatted strings
 *     compact: if ``True``, put initial attributes on the first line
 * Returns:
 *     the string of serialized graphs
 */
export function _dumps(
  graphs: Graph[],
  model?: Model,
  indent: number | null | undefined = -1,
  compact = false
): string {
  const codec = new PENMANCodec(model);
  const strings = graphs.map((g) =>
    codec.encode(g, undefined, indent, compact)
  );
  return strings.join('\n\n');
}
