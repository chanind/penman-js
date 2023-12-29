/** Functions for working with constant values. */

import { ConstantError } from './exceptions';
import { Constant } from './types';

export enum Type {
  SYMBOL = 'Symbol',
  STRING = 'String',
  INTEGER = 'Integer',
  FLOAT = 'Float',
  NULL = 'Null',
}

// Make them available at the module level
export const SYMBOL = Type.SYMBOL; //: Symbol constants (e.g., :code:`(... :polarity -)`)
export const STRING = Type.STRING; //: String constants (e.g., :code:`(... :op1 "Kim")`)
export const INTEGER = Type.INTEGER; //: Integer constants (e.g., :code:`(... :value 12)`)
export const FLOAT = Type.FLOAT; //: Float constants (e.g., :code:`(... :value 1.2)`)
export const NULL = Type.NULL; //: Empty values (e.g., :code:`(... :ARG1 )`)

/**
 * Return the type of constant encoded by `constantString`.
 *
 * @param constantString - The string representation of the constant.
 * @returns The type of the constant.
 * @example
 * import { type } from 'penman-js';
 *
 * console.log(type('-')); // Outputs: 'Symbol'
 * console.log(type('"foo"')); // Outputs: 'String'
 * console.log(type('1')); // Outputs: 'Integer'
 * console.log(type('1.2')); // Outputs: 'Float'
 * console.log(type('')); // Outputs: 'Null'
 */
export const type = (constant_string: string | null | undefined): Type => {
  if (constant_string == null) {
    return Type.NULL;
  } else {
    const value = evaluate(constant_string);
    if (
      typeof value === 'string' &&
      constant_string.startsWith('"') &&
      constant_string.endsWith('"')
    ) {
      return Type.STRING;
    } else if (typeof value === 'string') {
      return Type.SYMBOL;
    } else if (typeof value === 'number') {
      // check for integer
      if (value % 1 === 0) {
        return Type.INTEGER;
      } else {
        return Type.FLOAT;
      }
    } else {
      return Type.NULL;
    }
  }
};

/**
 * Evaluate and return the value of `constantString`.
 *
 * If `constantString` is `null` or an empty symbol (`''`), this
 * function returns `null`. An empty string constant (`'""'`) returns an empty string (`''`).
 * Symbols are returned unchanged, while strings get quotes removed and escape sequences unescaped.
 * Note that this means it is impossible to recover the original type of
 * strings and symbols once they have been evaluated. For integer and
 * float constants, this function returns the equivalent JavaScript
 * `Number` object.
 *
 * @param constantString - The string representation of the constant.
 * @returns The evaluated value of the constant.
 * @example
 * import { evaluate } from 'penman-js/constant';
 *
 * console.log(evaluate('-')); // Outputs: '-'
 * console.log(evaluate('"foo"')); // Outputs: 'foo'
 * console.log(evaluate('1')); // Outputs: 1
 * console.log(evaluate('1.2')); // Outputs: 1.2
 * console.log(evaluate('') === null); // Outputs: true
 */

export const evaluate = (
  constantString: string | null | undefined,
): Constant => {
  let value: Constant = constantString;
  if (constantString == null || constantString === '') {
    value = null;
  } else {
    if (typeof constantString !== 'string') {
      throw new ConstantError(`Invalid constant: ${constantString}`);
    }
    if (constantString.startsWith('"') !== constantString.endsWith('"')) {
      throw new ConstantError(`unbalanced quotes: ${constantString}`);
    }
    if (!['true', 'false', 'null'].includes(constantString)) {
      try {
        value = JSON.parse(constantString);
      } catch (e) {
        value = constantString;
      }
    }
  }

  if (
    !(value == null || typeof value === 'string' || typeof value === 'number')
  ) {
    throw new ConstantError(`invalid constant: ${value}`);
  }
  return value;
};

/**
 * Return `constant` as a quoted string.
 *
 * If `constant` is `null`, this function returns an empty string
 * constant (`'""'`). All other types are cast to a string and
 * quoted.
 *
 * @param constant - The value to quote.
 * @returns The quoted string representation of the constant.
 * @example
 * import { quote } from 'penman-js/constant';
 *
 * console.log(quote(null)); // Outputs: '""'
 * console.log(quote('')); // Outputs: '""'
 * console.log(quote('foo')); // Outputs: '"foo"'
 * console.log(quote('"foo"')); // Outputs: '"\\"foo\\""'
 * console.log(quote(1)); // Outputs: '"1"'
 * console.log(quote(1.5)); // Outputs: '"1.5"'
 */
export const quote = (constant: Constant): string => {
  if (constant == null) {
    return '""';
  } else {
    return JSON.stringify(`${constant}`);
  }
};
