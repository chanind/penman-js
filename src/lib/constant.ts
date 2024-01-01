/** Functions for working with constant values. */

import { ConstantError } from './exceptions';
import { Constant } from './types';

export enum ConstantType {
  SYMBOL = 'Symbol', //: Symbol constants (e.g., :code:`(... :polarity -)`)
  STRING = 'String', //: String constants (e.g., :code:`(... :op1 "Kim")`)
  INTEGER = 'Integer', //: Integer constants (e.g., :code:`(... :value 12)`)
  FLOAT = 'Float', //: Float constants (e.g., :code:`(... :value 1.2)`)
  NULL = 'Null', //: Empty values (e.g., :code:`(... :ARG1 )`)
}

/**
 * Return the type of constant encoded by `constantString`.
 *
 * @param constantString - The string representation of the constant.
 * @returns The type of the constant.
 * @example
 * import { constantType } from 'penman-js';
 *
 * console.log(constantType('-')); // Outputs: 'Symbol'
 * console.log(constantType('"foo"')); // Outputs: 'String'
 * console.log(constantType('1')); // Outputs: 'Integer'
 * console.log(constantType('1.2')); // Outputs: 'Float'
 * console.log(constantType('')); // Outputs: 'Null'
 */
export const constantType = (
  constant_string: string | null | undefined,
): ConstantType => {
  if (constant_string == null) {
    return ConstantType.NULL;
  } else {
    const value = evaluateConstant(constant_string);
    if (
      typeof value === 'string' &&
      constant_string.startsWith('"') &&
      constant_string.endsWith('"')
    ) {
      return ConstantType.STRING;
    } else if (typeof value === 'string') {
      return ConstantType.SYMBOL;
    } else if (typeof value === 'number') {
      // check for integer
      if (value % 1 === 0) {
        return ConstantType.INTEGER;
      } else {
        return ConstantType.FLOAT;
      }
    } else {
      return ConstantType.NULL;
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
 * import { evaluateConstant } from 'penman-js';
 *
 * console.log(evaluateConstant('-')); // Outputs: '-'
 * console.log(evaluateConstant('"foo"')); // Outputs: 'foo'
 * console.log(evaluateConstant('1')); // Outputs: 1
 * console.log(evaluateConstant('1.2')); // Outputs: 1.2
 * console.log(evaluateConstant('') === null); // Outputs: true
 */
export const evaluateConstant = (
  constantString: string | null | undefined,
): Constant => {
  let value: Constant = constantString ?? null;
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
 * import { quoteConstant } from 'penman-js';
 *
 * console.log(quoteConstant(null)); // Outputs: '""'
 * console.log(quoteConstant('')); // Outputs: '""'
 * console.log(quoteConstant('foo')); // Outputs: '"foo"'
 * console.log(quoteConstant('"foo"')); // Outputs: '"\\"foo\\""'
 * console.log(quoteConstant(1)); // Outputs: '"1"'
 * console.log(quoteConstant(1.5)); // Outputs: '"1.5"'
 */
export const quoteConstant = (constant: Constant): string => {
  if (constant == null) {
    return '""';
  } else {
    return JSON.stringify(`${constant}`);
  }
};
