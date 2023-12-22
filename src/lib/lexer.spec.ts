import test from 'ava';

import { lex, TRIPLE_RE } from './_lexer';

test('lex_penman', (t) => {
  const _lex = (s: Iterable<string> | string) =>
    Array.from(lex(s)).map((tok) => tok[0]);

  t.deepEqual(_lex(''), []);
  t.deepEqual(_lex('(a / alpha)'), [
    'LPAREN',
    'SYMBOL',
    'SLASH',
    'SYMBOL',
    'RPAREN',
  ]);
  t.deepEqual(_lex('(a/alpha\n  :ROLE b)'), [
    'LPAREN',
    'SYMBOL',
    'SLASH',
    'SYMBOL',
    'ROLE',
    'SYMBOL',
    'RPAREN',
  ]);
  t.deepEqual(_lex(['(a / alpha', '  :ROLE b)']), _lex('(a/alpha\n  :ROLE b)'));
  t.deepEqual(_lex('(a :INT 1 :STR "hi there" :FLOAT -1.2e3)'), [
    'LPAREN',
    'SYMBOL',
    'ROLE',
    'SYMBOL',
    'ROLE',
    'STRING',
    'ROLE',
    'SYMBOL',
    'RPAREN',
  ]);
  t.deepEqual(_lex('(a :ROLE~e.1,2 b~3)'), [
    'LPAREN',
    'SYMBOL',
    'ROLE',
    'ALIGNMENT',
    'SYMBOL',
    'ALIGNMENT',
    'RPAREN',
  ]);
  t.deepEqual(_lex('# comment\n# (n / nope)\n(a / alpha)'), [
    'COMMENT',
    'COMMENT',
    'LPAREN',
    'SYMBOL',
    'SLASH',
    'SYMBOL',
    'RPAREN',
  ]);
});

test('lexing_issue_50', (t) => {
  // https://github.com/goodmami/penman/issues/50
  t.deepEqual(
    Array.from(lex('(a :ROLE "a~b"~1)')).map((tok) => tok[0]),
    ['LPAREN', 'SYMBOL', 'ROLE', 'STRING', 'ALIGNMENT', 'RPAREN'],
  );
});

test('lex_triples', (t) => {
  const _lex = (s: Iterable<string> | string) =>
    Array.from(lex(s, TRIPLE_RE)).map((tok) => tok[0]);

  t.deepEqual(_lex(''), []);
  // SYMBOL may contain commas, so sometimes they get grouped together
  t.deepEqual(_lex('instance(a, alpha)'), [
    'SYMBOL',
    'LPAREN',
    'SYMBOL',
    'SYMBOL',
    'RPAREN',
  ]);
  t.deepEqual(_lex('instance(a , alpha)'), [
    'SYMBOL',
    'LPAREN',
    'SYMBOL',
    'SYMBOL',
    'SYMBOL',
    'RPAREN',
  ]);
  t.deepEqual(_lex('instance(a ,alpha)'), [
    'SYMBOL',
    'LPAREN',
    'SYMBOL',
    'SYMBOL',
    'RPAREN',
  ]);
  t.deepEqual(_lex('instance(a, alpha) ^ VAL(a, 1.0)'), [
    'SYMBOL',
    'LPAREN',
    'SYMBOL',
    'SYMBOL',
    'RPAREN',
    'SYMBOL',
    'SYMBOL',
    'LPAREN',
    'SYMBOL',
    'SYMBOL',
    'RPAREN',
  ]);
  t.deepEqual(_lex('instance(a, 1,000)'), [
    'SYMBOL',
    'LPAREN',
    'SYMBOL',
    'SYMBOL',
    'RPAREN',
  ]);
  t.deepEqual(_lex('instance(a,1,000)'), [
    'SYMBOL',
    'LPAREN',
    'SYMBOL',
    'RPAREN',
  ]);
  t.deepEqual(_lex('role(a,b) ^ role(b,c)'), [
    'SYMBOL',
    'LPAREN',
    'SYMBOL',
    'RPAREN',
    'SYMBOL',
    'SYMBOL',
    'LPAREN',
    'SYMBOL',
    'RPAREN',
  ]);
  t.deepEqual(_lex('role(a,b)^role(b,c)'), [
    'SYMBOL',
    'LPAREN',
    'SYMBOL',
    'RPAREN',
    'SYMBOL',
    'LPAREN',
    'SYMBOL',
    'RPAREN',
  ]);
});

// def test_TokenIterator():
//     pass  # TODO: write tests for expect() and accept()

test('nonbreaking_space_issue_99', (t) => {
  // https://github.com/goodmami/penman/issues/99
  t.deepEqual(
    Array.from(lex('1 2')).map((tok) => tok[0]),
    ['SYMBOL', 'SYMBOL'],
  );
  t.deepEqual(
    Array.from(lex('1\t2')).map((tok) => tok[0]),
    ['SYMBOL', 'SYMBOL'],
  );
  t.deepEqual(
    Array.from(lex('1\n2')).map((tok) => tok[0]),
    ['SYMBOL', 'SYMBOL'],
  );
  t.deepEqual(
    Array.from(lex('1\r2')).map((tok) => tok[0]),
    ['SYMBOL', 'SYMBOL'],
  );
  t.deepEqual(
    Array.from(lex('1\u00a02')).map((tok) => tok[0]),
    ['SYMBOL'],
  );
  t.deepEqual(
    Array.from(lex('あ　い')).map((tok) => tok[0]),
    ['SYMBOL'],
  );
});
