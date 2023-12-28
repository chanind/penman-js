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
   * Instantiate the alignment marker from its string `s`.
   *
   * @param s - The string representation of the alignment marker.
   * @returns An instance of Alignment or RoleAlignment based on the provided string.
   * @example
   * import { Alignment, RoleAlignment } from 'penman-js/surface';
   *
   * Alignment.fromString('1');
   * // Alignment([1])
   *
   * RoleAlignment.fromString('e.2,3');
   * // RoleAlignment([2, 3], 'e.')
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
 * Return a mapping of triples to alignments in graph `g`.
 *
 * @param g - A `Graph` object containing alignment data.
 * @returns An object mapping `Triple` objects to their corresponding `Alignment` objects, if any.
 * @example
 * import { decode } from 'penman-js';
 * import { alignments } from 'penman-js/surface';
 *
 * const g = decode(
 *   `(c / chase-01~4
 *      :ARG0~5 (d / dog~7)
 *      :ARG0~3 (c / cat~2))`
 * );
 * alignments(g);
 * // ArrayKeysMap({
 * //   ['c', ':instance', 'chase-01']: Alignment([4]),
 * //   ['d', ':instance', 'dog']: Alignment([7]),
 * //   ['c', ':instance', 'cat']: Alignment([2])
 * // })
 */
export function alignments(g: Graph): _Alignments {
  return _getAlignments(g, Alignment);
}

/**
 * Return a mapping of triples to role alignments in graph `g`.
 *
 * @param g - A `Graph` object containing role alignment data.
 * @returns An object mapping `Triple` objects to their corresponding `RoleAlignment` objects, if any.
 * @example
 * import { decode } from 'penman-js';
 * import { roleAlignments } from 'penman-js/surface';
 *
 * const g = decode(
 *   `(c / chase-01~4
 *      :ARG0~5 (d / dog~7)
 *      :ARG0~3 (c / cat~2))`
 * );
 * roleAlignments(g);
 * // ArrayKeysMap({
 * //   ['c', ':ARG0', 'd']: RoleAlignment([5]),
 * //   ['c', ':ARG0', 'c']: RoleAlignment([3])
 * // })
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
