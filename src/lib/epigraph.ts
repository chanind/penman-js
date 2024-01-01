/** Base classes for epigraphical markers. */

import { Triple } from './types';
import { ArrayKeysMap } from './utils';

export class Epidatum {
  /**
   * The `mode` attribute specifies what the Epidatum annotates:
   *
   * - `mode = 0` -- unspecified
   * - `mode = 1` -- role epidata
   * - `mode = 2` -- target epidata
   */
  mode = 0;
}

export type Epidata = Epidatum[];

export class EpidataMap extends ArrayKeysMap<Triple, Epidata> {}
