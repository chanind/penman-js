/**
 * Surface strings, tokens, and alignments.
 */

import { Epidatum } from './epigraph';
import { SurfaceError } from './exceptions';
import { Graph } from './graph';
import { BasicTriple } from './types';
import { ArrayKeysMap, lstrip } from './utils';

export class AlignmentMarker extends Epidatum {
  indices: number[];
  prefix: string | null;

  constructor(indices: number[], prefix: string | null = null) {
    super();
    this.indices = indices;
    this.prefix = prefix;
  }

  /**
   * Instantiate the alignment marker from its string *s*.
   *
   * Examples:
   *    >>> from penman import surface
   *    >>> surface.Alignment.from_string('1')
   *    Alignment((1,))
   *    >>> surface.RoleAlignment.from_string('e.2,3')
   *    RoleAlignment((2, 3), prefix='e.')
   */
  static fromString<T extends AlignmentMarker>(s: string): T {
    let _s = lstrip(s, '~');
    let prefix: string | null = null;
    try {
      // ...~e
      if (_s[0].match(/[a-zA-Z]/)) {
        let i = 1;
        // ...~e.
        if (_s[1] === '.') {
          i = 2;
        }
        prefix = _s.slice(0, i);
        _s = _s.slice(i);
      }
    } catch (exc) {
      throw new SurfaceError(`invalid alignment marker: ${s}`);
    }

    let indices: number[];
    try {
      indices = _s.split(',').map((i) => parseInt(i));
    } catch (exc) {
      throw new SurfaceError(`invalid alignments: ${s}`);
    }

    const obj = new this(indices, prefix);
    return <T>obj;
  }

  __repr__(): string {
    let args = this.indices.toString();
    if (this.prefix) {
      args += `, prefix=${this.prefix}`;
    }
    const name = this.constructor.name;
    return `${name}(${args})`;
  }

  repr(): string {
    return this.__repr__();
  }

  toString(): string {
    return `~${this.prefix || ''}${this.indices.join(',')}`;
  }

  equals(other: AlignmentMarker): boolean {
    return this.prefix === other.prefix && this.indices === other.indices;
  }
}

export class Alignment extends AlignmentMarker {
  mode = 2;
}

export class RoleAlignment extends AlignmentMarker {
  mode = 1;
}

type _Alignments = ArrayKeysMap<BasicTriple, AlignmentMarker>;

/**
 * Return a mapping of triples to alignments in graph *g*.
 *
 * Args:
 *    g: a :class:`~penman.graph.Graph` containing alignment data
 * Returns:
 *    A :class:`dict` mapping :class:`~penman.graph.Triple` objects
 *    to their corresponding :class:`Alignment` objects, if any.
 * Example:
 *    >>> from penman import decode
 *    >>> from penman import surface
 *    >>> g = decode(
 *     ...   '(c / chase-01~4'
 *    ...   '   :ARG0~5 (d / dog~7)'
 *    ...   '   :ARG0~3 (c / cat~2))')
 *    >>> surface.alignments(g)  // doctest: +NORMALIZE_WHITESPACE
 *    {('c', ':instance', 'chase-01'): Alignment((4,)),
 *    ('d', ':instance', 'dog'): Alignment((7,)),
 *    ('c', ':instance', 'cat'): Alignment((2,))}
 */
export function alignments(g: Graph): _Alignments {
  return _getAlignments(g, Alignment);
}

/**
 * Return a mapping of triples to role alignments in graph *g*.
 *
 * Args:
 *   g: a :class:`~penman.graph.Graph` containing role alignment
 *   data
 * Returns:
 *   A :class:`dict` mapping :class:`~penman.graph.Triple` objects
 *   to their corresponding :class:`RoleAlignment` objects, if any.
 *   Example:
 *    >>> from penman import decode
 *   >>> from penman import surface
 *   >>> g = decode(
 *   ...   '(c / chase-01~4'
 *   ...   '   :ARG0~5 (d / dog~7)'
 *   ...   '   :ARG0~3 (c / cat~2))')
 *   >>> surface.role_alignments(g)  // doctest: +NORMALIZE_WHITESPACE
 *   {('c', ':ARG0', 'd'): RoleAlignment((5,)),
 *   ('c', ':ARG0', 'c'): RoleAlignment((3,))}
 */
export function roleAlignments(g: Graph): _Alignments {
  return _getAlignments(g, RoleAlignment);
}

const _getAlignments = (
  g: Graph,
  alignmentType: typeof AlignmentMarker,
): _Alignments => {
  const alns = new ArrayKeysMap<BasicTriple, AlignmentMarker>();
  for (const [triple, epidata] of g.epidata) {
    for (const epidatum of epidata) {
      if (epidatum instanceof alignmentType) {
        alns.set(triple, epidatum);
      }
    }
  }
  return alns;
};
