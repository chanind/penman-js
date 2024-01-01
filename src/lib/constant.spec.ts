import test from 'ava';

import {
  ConstantType,
  constantType,
  evaluateConstant,
  quoteConstant,
} from './constant';

test('evaluate() returns null for null', (t) => {
  t.is(evaluateConstant(null), null);
});

test('evaluate() returns null for empty string', (t) => {
  t.is(evaluateConstant(''), null);
});

test('evaluate() returns true for "true"', (t) => {
  t.is(evaluateConstant('true'), 'true');
});

test('evaluate() returns false for "false"', (t) => {
  t.is(evaluateConstant('false'), 'false');
});

test('evaluate() returns number for number', (t) => {
  t.is(evaluateConstant('42'), 42);
});

test('evaluate() returns number for float', (t) => {
  t.is(evaluateConstant('3.14'), 3.14);
});

test('type() returns "null" for null', (t) => {
  t.is(constantType(null), ConstantType.NULL);
});

test('type() returns "null" for empty string', (t) => {
  t.is(constantType(''), ConstantType.NULL);
});

test('type() returns "string" for string', (t) => {
  t.is(constantType('"foo"'), ConstantType.STRING);
});

test('type() returns "integer" for ints', (t) => {
  t.is(constantType('42'), ConstantType.INTEGER);
});

test('type() returns "float" for floats', (t) => {
  t.is(constantType('3.14'), ConstantType.FLOAT);
});

test('type() returns "symbol" for symbols', (t) => {
  t.is(constantType(':foo'), ConstantType.SYMBOL);
});

test('type() returns "symbol" for dash', (t) => {
  t.is(constantType('-'), ConstantType.SYMBOL);
});

test('quote() with already quoted string', (t) => {
  t.is(quoteConstant('"foo"'), '"\\"foo\\""');
});

test('quote() with unquoted string', (t) => {
  t.is(quoteConstant('foo'), '"foo"');
});

test('quote() with empty string', (t) => {
  t.is(quoteConstant(''), '""');
});

test('quote() with null', (t) => {
  t.is(quoteConstant(null), '""');
});
