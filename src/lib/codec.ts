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

// "Utility" types; not Penman-specific

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
   * Deserialize a PENMAN-notation string `s` into its Graph object.
   *
   * @param s - A string containing a single PENMAN-serialized graph.
   * @returns The `Graph` object described by `s`.
   * @example
   * import { PENMANCodec } from 'penman-js/codec';
   *
   * const codec = new PENMANCodec();
   * const graph = codec.decode('(b / bark-01 :ARG0 (d / dog))');
   * console.log(graph);
   * // Outputs: Graph object with top node 'b'
   */
  decode(s: string): Graph {
    const tree = parse(s);
    return layout.interpret(tree, this.model);
  }

  /**
   * Yield graphs parsed from `lines`.
   *
   * @param lines - A string or open file containing PENMAN-serialized graphs.
   * @returns An iterator yielding `Graph` objects described in `lines`.
   */
  *iterdecode(lines: string | string[]): IterableIterator<Graph> {
    for (const tree of iterparse(lines)) {
      yield layout.interpret(tree, this.model);
    }
  }

  /**
   * Yield trees parsed from `lines`.
   *
   * @param lines - A string or open file containing PENMAN-serialized graphs.
   * @returns An iterator yielding `Tree` objects described in `lines`.
   */
  *iterparse(lines: string | string[]): IterableIterator<Tree> {
    yield* iterparse(lines);
  }

  /**
   * Parse a PENMAN-notation string `s` into its tree structure.
   *
   * @param s - A string containing a single PENMAN-serialized graph.
   * @returns The tree structure described by `s`.
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
   * Serialize the graph `g` into PENMAN notation.
   *
   * @param g - The Graph object.
   * @param top - If given, the node to use as the top in serialization.
   * @param indent - How to indent formatted strings.
   * @param compact - If `true`, put initial attributes on the first line.
   * @returns The PENMAN-serialized string of the Graph `g`.
   * @example
   * import { Graph } from 'penman-js/graph';
   * import { PENMANCodec } from 'penman-js/codec';
   *
   * const codec = new PENMANCodec();
   * console.log(codec.encode(new Graph([['h', 'instance', 'hi']])));
   * // '(h / hi)'
   */

  encode(
    g: Graph,
    top?: Variable,
    indent: number | null | undefined = -1,
    compact = false,
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
    compact = false,
  ): string {
    return format(tree, indent, compact);
  }

  /**
   * Return the formatted triple conjunction of `triples`.
   *
   * @param triples - An iterable of triples.
   * @param indent - How to indent formatted strings.
   * @returns The serialized triple conjunction of `triples`.
   * @example
   * import { PENMANCodec } from 'penman-js/codec';
   *
   * const codec = new PENMANCodec();
   * console.log(codec.formatTriples([
   *   ['a', ':instance', 'alpha'],
   *   ['a', ':ARG0', 'b'],
   *   ['b', ':instance', 'beta']
   * ]));
   * // Expected output:
   * // 'instance(a, alpha) ^\\nARG0(a, b) ^\\ninstance(b, beta)'
   */
  formatTriples(triples: BasicTriple[], indent = true): string {
    return formatTriples(triples, indent);
  }
}

/**
 * Deserialize PENMAN-serialized string `s` into its Graph object.
 *
 * @param s - A string containing a single PENMAN-serialized graph.
 * @param model - The model used for interpreting the graph.
 * @returns The Graph object described by `s`.
 * @example
 * import { decode } from 'penman-js';
 *
 * const graph = decode('(b / bark-01 :ARG0 (d / dog))');
 */
export function _decode(s: string, model?: Model): Graph {
  const codec = new PENMANCodec(model);
  return codec.decode(s);
}

/**
 * Yield graphs parsed from `lines`.
 *
 * @param lines - A string or open file containing PENMAN-serialized graphs.
 * @param model - The model used for interpreting the graph.
 * @returns An iterator yielding `Graph` objects described in `lines`.
 * @example
 * import { iterdecode } from 'penman-js';
 *
 * for (const g of iterdecode('(a / alpha) (b / beta)')) {
 *   // ...
 * }
 */

export function* _iterdecode(
  lines: string | string[],
  model?: Model,
): IterableIterator<Graph> {
  const codec = new PENMANCodec(model);
  yield* codec.iterdecode(lines);
}

/**
 * Serialize the graph `g` from `top` to PENMAN notation.
 *
 * @param g - The Graph object.
 * @param top - If given, the node to use as the top in serialization.
 * @param model - The model used for interpreting the graph.
 * @param indent - How to indent formatted strings.
 * @param compact - If `true`, put initial attributes on the first line.
 * @returns The PENMAN-serialized string of the Graph `g`.
 * @example
 * import { encode, Graph } from 'penman-js';
 *
 * console.log(encode(new Graph([['h', 'instance', 'hi']])));
 * // '(h / hi)'
 */

export function _encode(
  g: Graph,
  top?: Variable,
  model?: Model,
  indent: number | null | undefined = -1,
  compact = false,
): string {
  const codec = new PENMANCodec(model);
  return codec.encode(g, top, indent, compact);
}

/**
 * Deserialize a list of PENMAN-encoded graphs from `source`.
 *
 * @param source - A filename to read from.
 * @param model - The model used for interpreting the graph.
 * @returns A list of `Graph` objects.
 */
export function _load(
  source: string,
  model?: Model,
  encoding?: string,
): Graph[] {
  // importing fs here because it's only valid in node
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  const codec = new PENMANCodec(model);
  return Array.from(codec.iterdecode(fs.readFileSync(source, encoding)));
}

/**
 * Deserialize a list of PENMAN-encoded graphs from a string.
 *
 * @param string - A string containing graph data.
 * @param model - The model used for interpreting the graph.
 * @returns A list of `Graph` objects.
 */
export function _loads(string: string, model?: Model): Graph[] {
  const codec = new PENMANCodec(model);
  return Array.from(codec.iterdecode(string));
}

/**
 * Serialize each graph in `graphs` to PENMAN notation and write to `file`.
 *
 * @param graphs - An iterable of Graph objects.
 * @param file - A filename to write to.
 * @param model - The model used for interpreting the graph.
 * @param indent - How to indent formatted strings.
 * @param compact - If `true`, put initial attributes on the first line.
 */
export function _dump(
  graphs: Graph[],
  file: string,
  model?: Model,
  indent: number | null | undefined = -1,
  compact = false,
  encoding?: string,
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
  encoding?: string,
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
 * Serialize each graph in `graphs` to the PENMAN format.
 *
 * @param graphs - An iterable of Graph objects.
 * @param model - The model used for interpreting the graph.
 * @param indent - How to indent formatted strings.
 * @param compact - If `true`, put initial attributes on the first line.
 * @returns The string of serialized graphs.
 */
export function _dumps(
  graphs: Graph[],
  model?: Model,
  indent: number | null | undefined = -1,
  compact = false,
): string {
  const codec = new PENMANCodec(model);
  const strings = graphs.map((g) =>
    codec.encode(g, undefined, indent, compact),
  );
  return strings.join('\n\n');
}
