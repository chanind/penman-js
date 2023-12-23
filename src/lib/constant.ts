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
 * Return the type of constant encoded by *constant_string*.
 *
 * Examples:
 *     >>> from penman import constant
 *     >>> constant.type('-')
 *     <Type.SYMBOL: 'Symbol'>
 *     >>> constant.type('"foo"')
 *     <Type.STRING: 'String'>
 *     >>> constant.type('1')
 *     <Type.INTEGER: 'Integer'>
 *     >>> constant.type('1.2')
 *     <Type.FLOAT: 'Float'>
 *     >>> constant.type('')
 *     <Type.NULL: 'Null'>
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
 * Evaluate and return *constant_string*.
 *
 * If *constant_string* is ``None`` or an empty symbol (``''``), this
 * function returns ``None``, while an empty string constant
 * (``'""'``) returns an empty :py:class:`str` object
 * (``''``). Otherwise, symbols are returned unchanged while strings
 * get quotes removed and escape sequences are unescaped. Note that
 * this means it is impossible to recover the original type of
 * strings and symbols once they have been evaluated. For integer and
 * float constants, this function returns the equivalent Python
 * :py:class:`int` or :py:class:`float` objects.

 * Examples:
 *     >>> from penman import constant
 *     >>> constant.evaluate('-')
 *     '-'
 *     >>> constant.evaluate('"foo"')
 *     'foo'
 *     >>> constant.evaluate('1')
 *     1
 *     >>> constant.evaluate('1.2')
 *     1.2
 *     >>> constant.evaluate('') is None
 *     True
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
 * Return *constant* as a quoted string.
 *
 * If *constant* is ``None``, this function returns an empty string
 * constant (``'""'``). All other types are cast to a string and
 * quoted.
 *
 * Examples:
 *     >>> from penman import constant
 *     >>> constant.quote(None)
 *     '""'
 *     >>> constant.quote('')
 *     '""'
 *     >>> constant.quote('foo')
 *     '"foo"'
 *     >>> constant.quote('"foo"')
 *     '"\\\\"foo\\\\""'
 *     >>> constant.quote(1)
 *     '"1"'
 *     >>> constant.quote(1.5)
 *     '"1.5"'
 */
export const quote = (constant: Constant): string => {
  if (constant == null) {
    return '""';
  } else {
    return JSON.stringify(`${constant}`);
  }
};
