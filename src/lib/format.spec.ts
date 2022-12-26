import test from 'ava';

import { format, formatTriples } from './_format';
import { BasicTriple, Node } from './types';

test('format', (t) => {
  const input: Node = [
    'b',
    [
      ['/', 'bark-01'],
      [':ARG0', ['d', [['/', 'dog']]]],
    ],
  ];
  const expected = '(b / bark-01\n   :ARG0 (d / dog))';
  t.is(format(input), expected);
});

test('format_triples', (t) => {
  const triples: BasicTriple[] = [
    ['b', 'instance', 'bark-01'],
    ['b', 'ARG0', 'd'],
    ['d', 'instance', 'dog'],
  ];
  const expected = 'instance(b, bark-01) ^\nARG0(b, d) ^\ninstance(d, dog)';
  t.is(formatTriples(triples), expected);
});
