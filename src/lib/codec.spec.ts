import test from 'ava';

import { PENMANCodec } from './codec';
import { EpidataMap } from './epigraph';
import { x1 } from './fixtures';
import { Graph } from './graph';
import * as layout from './layout';
import * as surface from './surface';
import { Node, Triples } from './types';
import { ArrayKeysMap } from './utils';

const codec = new PENMANCodec();

test('parse', (t) => {
  const input = '(a / alpha)';
  const expected: Node = ['a', [['/', 'alpha']]];
  t.true(codec.parse(input).__eq__(expected));
});

test('parse_triples', (t) => {
  const input = 'role(a, b)';
  const expected: Triples = [['a', ':role', 'b']];
  t.deepEqual(codec.parseTriples(input), expected);
});

test('format', (t) => {
  const input: Node = ['a', [['/', 'alpha']]];
  const expected = '(a / alpha)';
  t.is(codec.format(input), expected);
});

test('decode', (t) => {
  // unlabeled single node
  let g = codec.decode('(a)');
  t.is(g.top, 'a');
  t.deepEqual(g.triples, [['a', ':instance', null]]);

  // labeled node
  g = codec.decode('(a / alpha)');
  t.is(g.top, 'a');
  t.deepEqual(g.triples, [['a', ':instance', 'alpha']]);

  // unlabeled edge to unlabeled node
  g = codec.decode('(a : (b))');
  t.is(g.top, 'a');
  t.deepEqual(g.triples, [
    ['a', ':instance', null],
    ['a', ':', 'b'],
    ['b', ':instance', null],
  ]);

  // inverted unlabeled edge
  g = codec.decode('(b :-of (a))');
  t.is(g.top, 'b');
  t.deepEqual(g.triples, [
    ['b', ':instance', null],
    ['a', ':', 'b'],
    ['a', ':instance', null],
  ]);

  // labeled edge to unlabeled node
  g = codec.decode('(a :ARG (b))');
  t.is(g.top, 'a');
  t.deepEqual(g.triples, [
    ['a', ':instance', null],
    ['a', ':ARG', 'b'],
    ['b', ':instance', null],
  ]);

  // inverted edge
  g = codec.decode('(b :ARG-of (a))');
  t.is(g.top, 'b');
  t.deepEqual(g.triples, [
    ['b', ':instance', null],
    ['a', ':ARG', 'b'],
    ['a', ':instance', null],
  ]);

  // fuller examples
  t.deepEqual(codec.decode(x1()[0]).triples, x1()[1]);
});

test('decode_inverted_attributes', (t) => {
  const g = codec.decode('(b :-of 1)');
  t.is(g.top, 'b');
  t.deepEqual(g.triples, [
    ['b', ':instance', null],
    ['b', ':-of', '1'],
  ]);
  t.deepEqual(g.variables(), new Set(['b']));

  const g2 = codec.decode('(a :ARG-of "string")');
  t.is(g2.top, 'a');
  t.deepEqual(g2.triples, [
    ['a', ':instance', null],
    ['a', ':ARG-of', '"string"'],
  ]);
  t.deepEqual(g2.variables(), new Set(['a']));
});

test('decode_atoms', (t) => {
  // string value
  const g = codec.decode('(a :ARG "string")');
  t.deepEqual(g.triples, [
    ['a', ':instance', null],
    ['a', ':ARG', '"string"'],
  ]);

  // symbol value
  const g2 = codec.decode('(a :ARG symbol)');
  t.deepEqual(g2.triples, [
    ['a', ':instance', null],
    ['a', ':ARG', 'symbol'],
  ]);

  // float value
  const g3 = codec.decode('(a :ARG -1.0e-2)');
  t.deepEqual(g3.triples, [
    ['a', ':instance', null],
    ['a', ':ARG', '-1.0e-2'],
  ]);

  // int value
  const g4 = codec.decode('(a :ARG 15)');
  t.deepEqual(g4.triples, [
    ['a', ':instance', null],
    ['a', ':ARG', '15'],
  ]);

  // numeric concept
  const g5 = codec.decode('(one / 1)');
  t.deepEqual(g5.triples, [['one', ':instance', '1']]);

  // string concept
  const g6 = codec.decode('(one / "a string")');
  t.deepEqual(g6.triples, [['one', ':instance', '"a string"']]);

  // numeric symbol (from https://github.com/goodmami/penman/issues/17)
  const g7 = codec.decode('(g / go :null_edge (x20 / 876-9))');
  t.deepEqual(g7.triples, [
    ['g', ':instance', 'go'],
    ['g', ':null_edge', 'x20'],
    ['x20', ':instance', '876-9'],
  ]);
});

test('decode_alignments', (t) => {
  const g = codec.decode('(a / alpha~1)');
  t.deepEqual(g.triples, [['a', ':instance', 'alpha']]);
  const expectedAlignments = new ArrayKeysMap();
  expectedAlignments.set(
    ['a', ':instance', 'alpha'],
    new surface.Alignment([1]),
  );
  t.deepEqual(surface.alignments(g), expectedAlignments);
  t.deepEqual(surface.role_alignments(g), new ArrayKeysMap());

  t.true(codec.decode('(a / alpha~1)').equals(codec.decode('(a / alpha ~1)')));

  const g2 = codec.decode('(a :ARG~e.1,2 b)');
  t.deepEqual(g2.triples, [
    ['a', ':instance', null],
    ['a', ':ARG', 'b'],
  ]);
  t.deepEqual(surface.alignments(g2), new ArrayKeysMap());
  const expectedRoleAlignments = new ArrayKeysMap();
  expectedRoleAlignments.set(
    ['a', ':ARG', 'b'],
    new surface.RoleAlignment([1, 2], 'e.'),
  );
  t.deepEqual(surface.role_alignments(g2), expectedRoleAlignments);

  // https://github.com/goodmami/penman/issues/50
  const g3 = codec.decode('(a :ARG1 "str~ing" :ARG2 "str~ing"~1)');
  t.deepEqual(g3.triples, [
    ['a', ':instance', null],
    ['a', ':ARG1', '"str~ing"'],
    ['a', ':ARG2', '"str~ing"'],
  ]);
  const expectedAlignments2 = new ArrayKeysMap();
  expectedAlignments2.set(
    ['a', ':ARG2', '"str~ing"'],
    new surface.Alignment([1]),
  );
  t.deepEqual(surface.alignments(g3), expectedAlignments2);
  t.deepEqual(surface.role_alignments(g3), new ArrayKeysMap());
});

test('decode_invalid_graphs', (t) => {
  let g = codec.decode('(g / )');
  t.deepEqual(g.triples, [['g', ':instance', null]]);
  g = codec.decode('(g / :ARG0 (i / i))');
  t.deepEqual(g.triples, [
    ['g', ':instance', null],
    ['g', ':ARG0', 'i'],
    ['i', ':instance', 'i'],
  ]);
  g = codec.decode('(g / go :ARG0 :ARG1 (t / there))');
  t.deepEqual(g.triples, [
    ['g', ':instance', 'go'],
    ['g', ':ARG0', null],
    ['g', ':ARG1', 't'],
    ['t', ':instance', 'there'],
  ]);

  // invalid strings
  t.throws(() => codec.decode('('));
  t.throws(() => codec.decode('(a'));
  t.throws(() => codec.decode('(a /'));
  t.throws(() => codec.decode('(a / alpha'));
  t.throws(() => codec.decode('(a b)'));
  // the following is not a problem while numbers are symbols
  // t.throws(() => codec.decode('(1 / one)'));
});

test('decode_recursion_limit', (t) => {
  // Create a graph with n levels of nesting. Inefficient
  // recursive-descent parsers will hit a RecursionError and be
  // unable to parse some graphs. n should be some reasonable
  // minimum.
  const n = 200;
  let s = '';
  for (let i = 1; i < n; i += 1) {
    s += `(a${i} / A :ARG0 `;
  }
  s += `(a${n} / A)`;
  for (let i = 1; i < n; i += 1) {
    s += ')';
  }
  const g = codec.decode(s); // hopefully no RecursionError
  // n :instance triples
  // n - 1 :ARG0 triples
  t.is(g.triples.length, n + n - 1);
});

test('encode', (t) => {
  // empty graph
  let g = new Graph([]);
  t.is(codec.encode(g), '()');

  // unlabeled single node
  g = new Graph([], 'a');
  t.is(codec.encode(g), '(a)');

  // labeled node
  g = new Graph([['a', ':instance', 'alpha']]);
  t.is(codec.encode(g), '(a / alpha)');

  // labeled node (without ':')
  g = new Graph([['a', 'instance', 'alpha']]);
  t.is(codec.encode(g), '(a / alpha)');

  // unlabeled edge to unlabeled node
  g = new Graph([['a', '', 'b']]);
  t.is(codec.encode(g), '(a : b)');
  const epidata = new EpidataMap();
  epidata.set(['a', ':', 'b'], [new layout.Push('b')]);
  g = new Graph([['a', ':', 'b']], undefined, epidata);
  t.is(codec.encode(g), '(a : (b))');

  // inverted unlabeled edge
  g = new Graph([['a', '', 'b']], 'b');
  t.is(codec.encode(g), '(b :-of a)');

  // labeled edge to unlabeled node
  g = new Graph([['a', 'ARG', 'b']]);
  t.is(codec.encode(g), '(a :ARG b)');

  // inverted edge
  g = new Graph([['a', 'ARG', 'b']], 'b');
  t.is(codec.encode(g), '(b :ARG-of a)');
});

test('encode atoms', (t) => {
  // string value
  let g = new Graph([['a', 'ARG', '"string"']]);
  t.is(codec.encode(g), '(a :ARG "string")');

  // symbol value
  g = new Graph([['a', 'ARG', 'symbol']]);
  t.is(codec.encode(g), '(a :ARG symbol)');

  // float value
  g = new Graph([['a', 'ARG', -0.01]]);
  t.is(codec.encode(g), '(a :ARG -0.01)');

  // int value
  g = new Graph([['a', 'ARG', 15]]);
  t.is(codec.encode(g), '(a :ARG 15)');

  // numeric concept
  g = new Graph([['one', 'instance', 1]]);
  t.is(codec.encode(g), '(one / 1)');

  // string concept
  g = new Graph([['one', 'instance', '"a string"']]);
  t.is(codec.encode(g), '(one / "a string")');
});

test('encode issue 61', (t) => {
  const g = new Graph(
    [
      ['i2', ':instance', 'i'],
      ['i', ':instance', 'i'],
      ['i2', ':ARG0', 'i'],
    ],
    'i2',
  );
  t.is(codec.encode(g, undefined, null), '(i2 / i :ARG0 (i / i))');
});

test('encode issue 67', (t) => {
  // https://github.com/goodmami/penman/issues/61
  const triples: Triples = [
    ['h', ':instance', 'have-org-role-91'],
    ['a', ':instance', 'activist'],
    ['h', ':ARG0', 'a'],
    ['h', ':ARG2', 'a'],
  ];
  t.is(
    codec.encode(new Graph(triples, 'a')),
    `(a / activist
   :ARG0-of (h / have-org-role-91)
   :ARG2-of h)`,
  );
  t.is(
    codec.encode(new Graph(triples, 'h')),
    `(h / have-org-role-91
   :ARG0 (a / activist)
   :ARG2 a)`,
  );
});
