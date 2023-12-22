/**
 * Helper to mimic Python's defaultdict plus-equal operator.
 */
export const defaultdictPlusEqual = <T>(
  mapping: Map<T, number>,
  key: T,
  value: number,
): void => {
  const curVal = mapping.get(key) ?? 0;
  mapping.set(key, curVal + value);
};

/**
 * Helper to mimic python's lstrip function
 */
export const lstrip = (str: string, chars: string): string => {
  const regex = new RegExp(`^${chars}+`);
  return str.replace(regex, '');
};

/**
 * Helper method to mimic python's partition function
 */
export const partition = (
  str: string,
  sep: string,
): [string, string, string] => {
  const index = str.indexOf(sep);
  if (index === -1) {
    return [str, '', ''];
  }
  return [str.slice(0, index), sep, str.slice(index + sep.length)];
};

/**
 * Helper map to work with array keys, by stringifying them before use.
 * Otherwise, JS will use the default object equality check, which will
 * not work for arrays.
 */
export class ArrayKeysMap<K, T> {
  private _map: { [key: string]: T } = {};

  constructor(entries: [K, T][] = []) {
    for (const [key, val] of entries) {
      this.set(key, val);
    }
  }

  [Symbol.iterator]() {
    return this.entries()[Symbol.iterator]();
  }

  private encodeKey(key: K): string {
    return JSON.stringify(key);
  }

  get(key: K): T {
    return this._map[this.encodeKey(key)];
  }

  set(key: K, val: T) {
    this._map[this.encodeKey(key)] = val;
  }

  has(key: K): boolean {
    return this.encodeKey(key) in this._map;
  }

  delete(key: K) {
    delete this._map[this.encodeKey(key)];
  }

  pop(key: K): T {
    const val = this.get(key);
    this.delete(key);
    return val;
  }

  entries(): [K, T][] {
    return Object.entries(this._map).map(([key, val]) => [
      JSON.parse(key),
      val,
    ]);
  }
}
