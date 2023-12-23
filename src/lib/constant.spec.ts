import test from 'ava';

import * as constant from './constant';

test('evaluate() returns null for null', (t) => {
  t.is(constant.evaluate(null), null);
});

test('evaluate() returns null for empty string', (t) => {
  t.is(constant.evaluate(''), null);
});

test('evaluate() returns true for "true"', (t) => {
  t.is(constant.evaluate('true'), 'true');
});

test('evaluate() returns false for "false"', (t) => {
  t.is(constant.evaluate('false'), 'false');
});

test('evaluate() returns number for number', (t) => {
  t.is(constant.evaluate('42'), 42);
});

test('evaluate() returns number for float', (t) => {
  t.is(constant.evaluate('3.14'), 3.14);
});

test('type() returns "null" for null', (t) => {
  t.is(constant.type(null), constant.NULL);
});

test('type() returns "null" for empty string', (t) => {
  t.is(constant.type(''), constant.NULL);
});

test('type() returns "string" for string', (t) => {
  t.is(constant.type('"foo"'), constant.STRING);
});

test('type() returns "integer" for ints', (t) => {
  t.is(constant.type('42'), constant.INTEGER);
});

test('type() returns "float" for floats', (t) => {
  t.is(constant.type('3.14'), constant.FLOAT);
});

test('type() returns "symbol" for symbols', (t) => {
  t.is(constant.type(':foo'), constant.SYMBOL);
});

test('type() returns "symbol" for dash', (t) => {
  t.is(constant.type('-'), constant.SYMBOL);
});

test('quote() with already quoted string', (t) => {
  t.is(constant.quote('"foo"'), '"\\"foo\\""');
});

test('quote() with unquoted string', (t) => {
  t.is(constant.quote('foo'), '"foo"');
});

test('quote() with empty string', (t) => {
  t.is(constant.quote(''), '""');
});

test('quote() with null', (t) => {
  t.is(constant.quote(null), '""');
});
