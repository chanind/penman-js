/**
Base classes for epigraphical markers.
 */

export class Epidatum {
  //: The :attr:`mode` attribute specifies what the Epidatum annotates:
  //:
  //:  * ``mode=0`` -- unspecified
  //:  * ``mode=1`` -- role epidata
  //:  * ``mode=2`` -- target epidata
  mode = 0;
}

export type Epidata = Epidatum[];
