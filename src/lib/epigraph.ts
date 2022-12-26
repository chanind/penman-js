/**
Base classes for epigraphical markers.
 */

import { BasicTriple } from './types';

export class Epidatum {
  //: The :attr:`mode` attribute specifies what the Epidatum annotates:
  //:
  //:  * ``mode=0`` -- unspecified
  //:  * ``mode=1`` -- role epidata
  //:  * ``mode=2`` -- target epidata
  mode = 0;
}

export type Epidata = Epidatum[];

export class EpidataMap {
  private _map: { [key: string]: Epidata } = {};

  constructor(entries: [BasicTriple, Epidata][] = []) {
    for (const [triple, epidata] of entries) {
      this.set(triple, epidata);
    }
  }

  [Symbol.iterator]() {
    return this.entries()[Symbol.iterator]();
  }

  private encodeTriple(triple: BasicTriple): string {
    return JSON.stringify(triple);
  }

  get(triple: BasicTriple): Epidata {
    return this._map[this.encodeTriple(triple)];
  }

  set(triple: BasicTriple, epidata: Epidata) {
    this._map[this.encodeTriple(triple)] = epidata;
  }

  has(triple: BasicTriple): boolean {
    return this.encodeTriple(triple) in this._map;
  }

  delete(triple: BasicTriple) {
    delete this._map[this.encodeTriple(triple)];
  }

  entries(): [BasicTriple, Epidata][] {
    return Object.entries(this._map).map(([triple, epidata]) => [
      JSON.parse(triple),
      epidata,
    ]);
  }
}
