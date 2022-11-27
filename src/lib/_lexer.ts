/**
 * Classes and functions for lexing PENMAN strings.
 */

import { DecodeError } from './exceptions';

// These are the regex patterns for parsing. They must not have any
// capturing groups. They are used during lexing and will be
// checked by name during parsing.
const PATTERNS = {
  COMMENT: /#.*$/,
  STRING: /"[^"\\]*(?:\\.[^"\\]*)*"/,
  ALIGNMENT: /~(?:[a-z]\.?)?[0-9]+(?:,[0-9]+)*/,
  // ROLE cannot be made up of COLON + SYMBOL because it then becomes
  // difficult to detect anonymous roles: (a : b) vs (a :b c)
  ROLE: /:[^ \t\r\n\v\f()\/:~]*/,
  SYMBOL: /[^ \t\r\n\v\f()\/:~]+/,
  LPAREN: /\(/,
  RPAREN: /\)/,
  SLASH: /\//, // concept (node label) role
  UNEXPECTED: /[^ \t\r\n\v\f]/,
};

const _compile = (...names: string[]): RegExp => {
  const pat = names.map((name) => `(?<${name}>${PATTERNS[name]})`).join('\n|');
  return new RegExp(pat, 'x');
};

// The order matters in these pattern lists as more permissive patterns
// can short-circuit stricter patterns.
const PENMAN_RE = _compile(
  'COMMENT',
  'STRING',
  'LPAREN',
  'RPAREN',
  'SLASH',
  'ROLE',
  'SYMBOL',
  'ALIGNMENT',
  'UNEXPECTED'
);
export const TRIPLE_RE = _compile(
  'COMMENT',
  'STRING',
  'LPAREN',
  'RPAREN',
  'SYMBOL',
  'UNEXPECTED'
);

/**
 * A lexed token.
 */
type Token = [
  type: string,
  text: string,
  lineno: number,
  offset: number,
  line: string
];

// class TokenIterator(Iterator[Token]):
//     """
//     An iterator of Tokens with L1 lookahead.
//     """

/**
 * An iterator of Tokens with L1 lookahead.
 */
export class TokenIterator {
  _next: IteratorResult<Token, Token> | null;
  _last: IteratorResult<Token, Token> | null;
  iterator: IterableIterator<Token>;

  constructor(iterator: IterableIterator<Token>) {
    this._next = iterator.next();
    if (this._next.done) {
      this._next = null;
    }
    this._last = null;
    this.iterator = iterator;
  }

  [Symbol.iterator]() {
    return this;
  }

  __bool__() {
    return this._next !== null;
  }

  /**
   * Return the next token but do not advance the iterator.
   *
   * If the iterator is exhausted then a DecodeError is raised.
   */
  peek(): Token {
    if (this._next === null) {
      throw this.error('Unexpected end of input');
    }
    return this._next.value;
  }

  /**
   * Advance the iterator and return the next token.
   *
   * Raises:
   *    StopIteration
   *       If the iterator is already exhausted.
   */
  next(): IteratorResult<Token> {
    const current = this._next;
    this._next = this.iterator.next();
    if (this._next.done) {
      if (current.value == null) {
        return this._next;
      }
      this._next = null;
    }
    this._last = current;
    return current;
  }

  /**
   * Return the next token if its type is in *choices*.
   *
   * The iterator is advanced if successful.
   *
   * Raises:
   *   ~penman.exceptions.DecodeError
   *      If the next token type is not in *choices*.
   */
  expect(...choices: string[]): Token {
    const token = this.next();
    if (token.done) {
      throw this.error('Unexpected end of input');
    }
    if (!choices.includes(token.value[0])) {
      throw this.error(`Expected: ${choices.join(', ')}`, token.value);
    }
    return token.value;
  }

  /**
   * Return the next token if its type is in *choices*.
   *
   * The iterator is advanced if successful. If unsuccessful,
   * ``None`` is returned.
   */
  accept(...choices: string[]): Token | null {
    if (this._next != null && choices.includes(this._next.value[0])) {
      return this.next().value;
    }
    return null;
  }

  error(message: string, token?: Token): DecodeError {
    let line: string | null = null;
    let lineno: number;
    let offset: number;
    if (token == null) {
      if (this._last != null) {
        lineno = this._last.value[2];
        offset = this._last.value[3] + this._last.value[1].length;
        line = this._last.value[4];
      } else {
        lineno = offset = 0;
      }
    } else {
      lineno = token[2];
      offset = token[3];
      line = token[4];
    }
    return new DecodeError(message, undefined, lineno, offset, line);
  }
}

/**
 * Yield PENMAN tokens matched in *lines*.
 *
 * By default, this lexes strings in *lines* using the basic pattern
 * for PENMAN graphs. If *pattern* is given, it is used for lexing
 * instead.
 *
 * Args:
 *   lines: iterable of lines to lex
 *   pattern: pattern to use for lexing instead of the default ones
 *
 * Returns:
 *   A :class:`TokenIterator` object
 */
export const lex = (
  lines: Iterable<string> | string,
  pattern: RegExp | string = PENMAN_RE
): TokenIterator => {
  if (typeof lines === 'string') {
    // from https://stackoverflow.com/a/68114825/245362
    lines = lines.split(/\r\n|(?!\r\n)[\n-\r\x85\u2028\u2029]/);
  }
  let regex: RegExp;
  if (pattern != null) {
    if (typeof pattern === 'string') {
      regex = new RegExp(pattern, 'x');
    } else {
      regex = pattern;
    }
  } else {
    regex = PENMAN_RE;
  }
  const tokens = _lex(lines, regex);
  return new TokenIterator(tokens);
};

const _lex = function* (
  lines: Iterable<string>,
  regex: RegExp
): IterableIterator<Token> {
  let i = 0;
  for (const line of lines) {
    if (i > 0) {
      const matches = [...line.matchAll(regex)];
      for (const m of matches) {
        const typ = m[m.length - 1];
        const val = m[0];
        if (typ == null) {
          throw new Error(
            'Lexer pattern generated a match without a named ' +
              `capturing group:\n${regex.source}`
          );
        }
        const token: Token = [typ, val, i, m.index, line];
        yield token;
      }
      i += 1;
    }
  }
};
