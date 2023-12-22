import test from 'ava';

import { partition } from './utils';

test('partition basic usage', (t) => {
  const input = 'a b c';
  const expected = ['a ', 'b', ' c'];
  t.deepEqual(partition(input, 'b'), expected);
});

test('partition with multiple matches', (t) => {
  const input = 'a b c';
  const expected = ['a', ' ', 'b c'];
  t.deepEqual(partition(input, ' '), expected);
});

test('partition with no matches', (t) => {
  const input = 'a b c';
  const expected = ['a b c', '', ''];
  t.deepEqual(partition(input, 'd'), expected);
});
