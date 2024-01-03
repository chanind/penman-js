/**
 * Serialization of PENMAN graphs.
 */

import { format, formatTriples } from './format';
import { Graph } from './graph';
import * as layout from './layout';
import { Model } from './model';
import { iterparse, parse, parseTriples } from './parse';
import { Tree } from './tree';
import { Node, Triple, Variable } from './types';

// "Utility" types; not Penman-specific

export interface CodecEncodeOptions {
  /** If given, the node to use as the top in serialization.  */
  top?: Variable;
  /** How to indent formatted strings. */
  indent?: number | null;
  /** If `true`, put initial attributes on the first line. */
  compact?: boolean;
}

export interface CodecFormatOptions {
  /** How to indent formatted strings. */
  indent?: number | null;
  /** If `true`, put initial attributes on the first line. */
  compact?: boolean;
}

export interface CodecFormatTriplesOptions {
  /** whether or not to indent the results, default true */
  indent?: boolean;
}

export interface EncodeOptions {
  /** The model used for interpreting the graph. */
  model?: Model;
  /** If given, the node to use as the top in serialization.  */
  top?: Variable;
  /** How to indent formatted strings. */
  indent?: number | null;
  /** If `true`, put initial attributes on the first line. */
  compact?: boolean;
}

export interface DecodeOptions {
  /** The model used for interpreting the graph. */
  model?: Model;
}

export interface DumpOptions {
  /** The model used for interpreting the graph. */
  model?: Model;
  /** How to indent formatted strings. */
  indent?: number | null;
  /** If `true`, put initial attributes on the first line. */
  compact?: boolean;
  /** The encoding to use when writing to `file`. */
  encoding?: string;
}

export interface DumpsOptions {
  /** The model used for interpreting the graph. */
  model?: Model;
  /** How to indent formatted strings. */
  indent?: number | null;
  /** If `true`, put initial attributes on the first line. */
  compact?: boolean;
}

export interface LoadOptions {
  /** The model used for interpreting the graph. */
  model?: Model;
  /** The encoding to use when reading `file`. */
  encoding?: string;
}

export interface LoadsOptions {
  /** The model used for interpreting the graph. */
  model?: Model;
}

/**
 * An encoder/decoder for PENMAN-serialized graphs.
 */
export class PENMANCodec {
  model: Model;

  constructor(model?: Model) {
    this.model = model ?? new Model();
  }

  /**
   * Deserialize a PENMAN-notation string `s` into its Graph object.
   *
   * @param s - A string containing a single PENMAN-serialized graph.
   * @returns The `Graph` object described by `s`.
   * @example
   * import { PENMANCodec } from 'penman-js';
   *
   * const codec = new PENMANCodec();
   * const graph = codec.decode('(b / bark-01 :ARG0 (d / dog))');
   * console.log(graph);
   * // Outputs: Graph object with top node 'b'
   */
  decode(s: string): Graph {
    const tree = parse(s);
    return layout.interpret(tree, { model: this.model });
  }

  /**
   * Yield graphs parsed from `lines`.
   *
   * @param lines - A string or open file containing PENMAN-serialized graphs.
   * @returns An iterator yielding `Graph` objects described in `lines`.
   */
  *iterdecode(lines: string | string[]): IterableIterator<Graph> {
    for (const tree of iterparse(lines)) {
      yield layout.interpret(tree, { model: this.model });
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
  parseTriples(s: string): Triple[] {
    return parseTriples(s);
  }

  /**
   * Serialize the graph `g` into PENMAN notation.
   *
   * `options` consists of the following:
   *    - `top` - If given, the node to use as the top in serialization.
   *    - `indent` - How to indent formatted strings.
   *    - `compact` - If `true`, put initial attributes on the first line.
   *
   * @param g - The Graph object.
   * @param options - Optional arguments.
   * @param options.top - If given, the node to use as the top in serialization.
   * @param options.indent - How to indent formatted strings.
   * @param options.compact - If `true`, put initial attributes on the first line.
   * @returns The PENMAN-serialized string of the Graph `g`.
   * @example
   * import { Graph, PENMANCodec } from 'penman-js';
   *
   * const codec = new PENMANCodec();
   * console.log(codec.encode(new Graph([['h', 'instance', 'hi']])));
   * // '(h / hi)'
   */
  encode(g: Graph, options: CodecEncodeOptions = {}): string {
    const { top, indent = -1, compact = false } = options;
    const tree = layout.configure(g, { top, model: this.model });
    return this.format(tree, { indent, compact });
  }

  /**
   * Format *tree* into a PENMAN string.
   *
   * @param tree - The tree to format into a string.
   * @param options - Optional arguments.
   * @param options.indent - How to indent formatted strings.
   * @param options.compact - If `true`, put initial attributes on the first line.
   */
  format(tree: Tree | Node, options: CodecFormatOptions = {}): string {
    const { indent = -1, compact = false } = options;
    return format(tree, { indent, compact });
  }

  /**
   * Return the formatted triple conjunction of `triples`.
   *
   * `options` consists of the following:
   *  - `indent` - Whether or not to indent the results, default true.
   *
   * @param triples - An iterable of triples.
   * @param options - Optional arguments.
   * @param options.indent - Whether or not to indent the results, default true.
   * @returns The serialized triple conjunction of `triples`.
   * @example
   * import { PENMANCodec } from 'penman-js';
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
  formatTriples(
    triples: Triple[],
    options: CodecFormatTriplesOptions = {},
  ): string {
    return formatTriples(triples, options);
  }
}

/**
 * Deserialize PENMAN-serialized string `s` into its Graph object.
 *
 * `options` consists of the following:
 *   - `model` - The model used for interpreting the graph.
 *
 * @param s - A string containing a single PENMAN-serialized graph.
 * @param options - Optional arguments.
 * @param options.model - The model used for interpreting the graph.
 * @returns The Graph object described by `s`.
 * @example
 * import { decode } from 'penman-js';
 *
 * const graph = decode('(b / bark-01 :ARG0 (d / dog))');
 */
export function decode(s: string, options: DecodeOptions = {}): Graph {
  const { model } = options;
  const codec = new PENMANCodec(model);
  return codec.decode(s);
}

/**
 * Yield graphs parsed from `lines`.
 *
 * `options` consists of the following:
 *   - `model` - The model used for interpreting the graph.
 *
 * @param lines - A string or open file containing PENMAN-serialized graphs.
 * @param options - Optional arguments.
 * @param options.model - The model used for interpreting the graph.
 * @returns An iterator yielding `Graph` objects described in `lines`.
 * @example
 * import { iterdecode } from 'penman-js';
 *
 * for (const g of iterdecode('(a / alpha) (b / beta)')) {
 *   // ...
 * }
 */
export function* iterdecode(
  lines: string | string[],
  options: DecodeOptions = {},
): IterableIterator<Graph> {
  const { model } = options;
  const codec = new PENMANCodec(model);
  yield* codec.iterdecode(lines);
}

/**
 * Serialize the graph `g` from `top` to PENMAN notation.
 *
 * `options` consists of the following:
 *   - `top` - If given, the node to use as the top in serialization.
 *   - `indent` - How to indent formatted strings.
 *   - `compact` - If `true`, put initial attributes on the first line.
 *   - `model` - The model used for interpreting the graph.
 *
 * @param g - The Graph object.
 * @param options - Optional arguments.
 * @param options.top - If given, the node to use as the top in serialization.
 * @param options.indent - How to indent formatted strings.
 * @param options.compact - If `true`, put initial attributes on the first line.
 * @param options.model - The model used for interpreting the graph.
 * @returns The PENMAN-serialized string of the Graph `g`.
 * @example
 * import { encode, Graph } from 'penman-js';
 *
 * console.log(encode(new Graph([['h', 'instance', 'hi']])));
 * // '(h / hi)'
 */
export function encode(g: Graph, options: EncodeOptions = {}): string {
  const { model, top, indent = -1, compact = false } = options;
  const codec = new PENMANCodec(model);
  return codec.encode(g, { top, indent, compact });
}

/**
 * Deserialize a list of PENMAN-encoded graphs from `source`.
 *
 * **Note:** This function is only available in Node.
 *
 * `options` consists of the following:
 *  - `model` - The model used for interpreting the graph.
 *  - `encoding` - The encoding to use when reading `file`.
 *
 * @param source - A filename to read from.
 * @param options - Optional arguments.
 * @param options.model - The model used for interpreting the graph.
 * @param options.encoding - The encoding to use when reading `file`.
 * @returns A list of `Graph` objects.
 */
export function load(source: string, options: LoadOptions = {}): Graph[] {
  const { model, encoding } = options;
  // importing fs here because it's only valid in node
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require('fs');
  const codec = new PENMANCodec(model);
  return Array.from(codec.iterdecode(fs.readFileSync(source, encoding)));
}

/**
 * Deserialize a list of PENMAN-encoded graphs from a string.
 *
 * `options` consists of the following:
 *  - `model` - The model used for interpreting the graph.
 *
 * @param string - A string containing graph data.
 * @param options - Optional arguments.
 * @param options.model - The model used for interpreting the graph.
 * @returns A list of `Graph` objects.
 */
export function loads(string: string, options: LoadsOptions = {}): Graph[] {
  const { model } = options;
  const codec = new PENMANCodec(model);
  return Array.from(codec.iterdecode(string));
}

/**
 * Serialize each graph in `graphs` to PENMAN notation and write to `file`.
 *
 * **Note:** This function is only available in Node.
 *
 * `options` consists of the following:
 *  - `model` - The model used for interpreting the graph.
 *  - `indent` - How to indent formatted strings.
 *  - `compact` - If `true`, put initial attributes on the first line.
 *  - `encoding` - The encoding to use when writing to `file`.
 *
 * @param graphs - An iterable of Graph objects.
 * @param file - A filename to write to.
 * @param options - Options for dump.
 * @param options.model - The model used for interpreting the graph.
 * @param options.indent - How to indent formatted strings.
 * @param options.compact - If `true`, put initial attributes on the first line.
 * @param options.encoding - The encoding to use when writing to `file`.
 */
export function dump(
  graphs: Graph[],
  file: string,
  options: DumpOptions = {},
): void {
  const { model, indent = -1, compact = false, encoding } = options;
  const codec = new PENMANCodec(model);
  _dumpStream(file, graphs, codec, indent, compact, encoding);
}

/** Helper method for dump() for incremental printing. */
function _dumpStream(
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
  const ss = gs.map((g) => codec.encode(g, { indent, compact }));
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
 * `options` consists of the following:
 *  - `model` - The model used for interpreting the graph.
 *  - `indent` - How to indent formatted strings.
 *  - `compact` - If `true`, put initial attributes on the first line.
 *
 * @param graphs - An iterable of Graph objects.
 * @param options - Optional arguments.
 * @param options.model - The model used for interpreting the graph.
 * @param options.indent - How to indent formatted strings.
 * @param options.compact - If `true`, put initial attributes on the first line.
 * @returns The string of serialized graphs.
 */
export function dumps(graphs: Graph[], options: DumpsOptions = {}): string {
  const { model, indent = -1, compact = false } = options;
  const codec = new PENMANCodec(model);
  const strings = graphs.map((g) => codec.encode(g, { indent, compact }));
  return strings.join('\n\n');
}
