import test from 'ava';

import { Graph } from './graph';
import { Triples } from './types';

// def x1():
//     return (
//         '(e2 / _try_v_1\n'
//         '    :ARG1 (x1 / named\n'
//         '              :CARG "Abrams"\n'
//         '              :RSTR-of (_1 / proper_q))\n'
//         '    :ARG2 (e3 / _sleep_v_1\n'
//         '              :ARG1 x1))',
//         [
//             ('e2', ':instance', '_try_v_1'),
//             ('e2', ':ARG1', 'x1'),
//             ('x1', ':instance', 'named'),
//             ('x1', ':CARG', '"Abrams"'),
//             ('_1', ':RSTR', 'x1'),
//             ('_1', ':instance', 'proper_q'),
//             ('e2', ':ARG2', 'e3'),
//             ('e3', ':instance', '_sleep_v_1'),
//             ('e3', ':ARG1', 'x1'),
//         ]
//     )

// fixture
const x1 = (): [string, Triples] => {
  return [
    '(e2 / _try_v_1\n' +
      '    :ARG1 (x1 / named\n' +
      '              :CARG "Abrams"\n' +
      '              :RSTR-of (_1 / proper_q))\n' +
      '    :ARG2 (e3 / _sleep_v_1\n' +
      '              :ARG1 x1))',
    [
      ['e2', ':instance', '_try_v_1'],
      ['e2', ':ARG1', 'x1'],
      ['x1', ':instance', 'named'],
      ['x1', ':CARG', '"Abrams"'],
      ['_1', ':RSTR', 'x1'],
      ['_1', ':instance', 'proper_q'],
      ['e2', ':ARG2', 'e3'],
      ['e3', ':instance', '_sleep_v_1'],
      ['e3', ':ARG1', 'x1'],
    ],
  ];
};

// class TestGraph(object):
//     def test_init(self):
//         # empty graph
//         g = Graph()
//         assert g.triples == []
//         assert g.top is None

//         # single node
//         g = Graph([('a', 'instance', None)])
//         assert g.triples == [('a', ':instance', None)]
//         assert g.top == 'a'

//         # single node one edge (default concept)
//         g = Graph([('a', 'ARG1', 'b')])
//         assert g.triples == [('a', ':ARG1', 'b')]
//         assert g.top == 'a'

//         # first triple determines top
//         g = Graph([('b', ':instance', None), ('a', ':ARG1', 'b')])
//         assert g.triples == [
//             ('b', ':instance', None),
//             ('a', ':ARG1', 'b')
//         ]
//         assert g.top == 'b'

test('init', (t) => {
  // empty graph
  const g = new Graph();
  t.deepEqual(g.triples, []);
  t.is(g.top, null);

  // single node
  const g1 = new Graph([['a', ':instance', null]]);
  t.deepEqual(g1.triples, [['a', ':instance', null]]);
  t.is(g1.top, 'a');

  // single node one edge (default concept)
  const g2 = new Graph([['a', ':ARG1', 'b']]);
  t.deepEqual(g2.triples, [['a', ':ARG1', 'b']]);
  t.is(g2.top, 'a');

  // first triple determines top
  const g3 = new Graph([
    ['b', ':instance', null],
    ['a', ':ARG1', 'b'],
  ]);
  t.deepEqual(g3.triples, [
    ['b', ':instance', null],
    ['a', ':ARG1', 'b'],
  ]);
  t.is(g3.top, 'b');
});

//     def test__or__(self):
//         p = Graph()
//         g = p | p
//         assert g.triples == []
//         assert g.top is None
//         assert g is not p

//         q = Graph([('a', ':instance', 'alpha')])
//         g = p | q
//         assert g.triples == [('a', ':instance', 'alpha')]
//         assert g.top == 'a'
//         assert g is not q is not p  # noqa: E714  <-- pycodestyle bug fixed upstream

//         r = Graph([('a', ':ARG', 'b'), ('b', ':instance', 'beta')], top='b')
//         g = q | r
//         assert g.triples == [('a', ':instance', 'alpha'),
//                              ('a', ':ARG', 'b'),
//                              ('b', ':instance', 'beta')]
//         assert g.top == 'a'

test('__or__', (t) => {
  const p = new Graph();
  const g = p.__or__(p);
  t.deepEqual(g.triples, []);
  t.is(g.top, null);
  t.not(g, p);

  const q = new Graph([['a', ':instance', 'alpha']]);
  const g1 = p.__or__(q);
  t.deepEqual(g1.triples, [['a', ':instance', 'alpha']]);
  t.is(g1.top, 'a');
  t.not(g1, q);
  t.not(g1, p);

  const r = new Graph(
    [
      ['a', ':ARG', 'b'],
      ['b', ':instance', 'beta'],
    ],
    'b'
  );
  const g2 = q.__or__(r);

  t.deepEqual(g2.triples, [
    ['a', ':instance', 'alpha'],
    ['a', ':ARG', 'b'],
    ['b', ':instance', 'beta'],
  ]);
  t.is(g2.top, 'a');
});

//     def test__ior__(self):
//         g = Graph()
//         original = g
//         g |= Graph()
//         assert g.triples == []
//         assert g.top is None
//         assert g is original

//         p = Graph([('a', ':instance', 'alpha')])
//         g |= p
//         assert g.triples == [('a', ':instance', 'alpha')]
//         assert g.top == 'a'
//         assert g is original

test('__ior__', (t) => {
  const g = new Graph();
  const original = g;
  g.__ior__(new Graph());
  t.deepEqual(g.triples, []);
  t.is(g.top, null);
  t.is(g, original);

  const p = new Graph([['a', ':instance', 'alpha']]);
  g.__ior__(p);
  t.deepEqual(g.triples, [['a', ':instance', 'alpha']]);
  t.is(g.top, 'a');
  t.is(g, original);
});

//     def test__sub__(self):
//         p = Graph()
//         g = p - p
//         assert g.triples == []
//         assert g.top is None
//         assert g is not p

//         q = Graph([('a', ':instance', 'alpha')])
//         g = q - p
//         assert g.triples == [('a', ':instance', 'alpha')]
//         assert g.top == 'a'
//         assert g is not q is not p  # noqa: E714  <-- pycodestyle bug fixed upstream

//         g = p - q
//         assert g.triples == []
//         assert g.top is None

//         g = q - q
//         assert g.triples == []
//         assert g.top is None

test('__sub__', (t) => {
  const p = new Graph();
  const g = p.__sub__(p);
  t.deepEqual(g.triples, []);
  t.is(g.top, null);
  t.not(g, p);

  const q = new Graph([['a', ':instance', 'alpha']]);
  const g1 = q.__sub__(p);
  t.deepEqual(g1.triples, [['a', ':instance', 'alpha']]);
  t.is(g1.top, 'a');
  t.not(g1, q);
  t.not(g1, p);

  const g2 = p.__sub__(q);
  t.deepEqual(g2.triples, []);
  t.is(g2.top, null);

  const g3 = q.__sub__(q);
  t.deepEqual(g3.triples, []);
  t.is(g3.top, null);
});

//     def test__isub__(self):
//         g = Graph()
//         original = g
//         g -= Graph()
//         assert g.triples == []
//         assert g.top is None
//         assert g is original

//         g = Graph([('a', ':instance', 'alpha'),
//                    ('a', ':ARG', 'b'),
//                    ('b', ':instance', 'beta')])
//         original = g
//         g -= Graph([('a', ':instance', 'alpha'), ('a', ':ARG', 'b')])
//         assert g.triples == [('b', ':instance', 'beta')]
//         assert g.top == 'b'
//         assert g is original

test('__isub__', (t) => {
  const g = new Graph();
  const original = g;
  g.__isub__(new Graph());
  t.deepEqual(g.triples, []);
  t.is(g.top, null);
  t.is(g, original);

  const g1 = new Graph([
    ['a', ':instance', 'alpha'],
    ['a', ':ARG', 'b'],
    ['b', ':instance', 'beta'],
  ]);
  const original1 = g1;
  g1.__isub__(
    new Graph([
      ['a', ':instance', 'alpha'],
      ['a', ':ARG', 'b'],
    ])
  );
  t.deepEqual(g1.triples, [['b', ':instance', 'beta']]);
  t.is(g1.top, 'b');
  t.is(g1, original1);
});

//     def test_top(self, x1):
//         assert Graph([('a', ':instance', None)]).top == 'a'
//         assert Graph(
//             [('b', ':instance', None), ('a', ':ARG', 'b')]
//         ).top == 'b'
//         assert Graph(x1[1]).top == 'e2'

test('top', (t) => {
  t.is(new Graph([['a', ':instance', null]]).top, 'a');
  t.is(
    new Graph([
      ['b', ':instance', null],
      ['a', ':ARG', 'b'],
    ]).top,
    'b'
  );
  t.is(new Graph(x1()[1]).top, 'e2');
});

//     def test_variables(self, x1):
//         assert Graph([('a', ':ARG', 'b')]).variables() == set('a')
//         assert Graph(x1[1]).variables() == set(['e2', 'x1', '_1', 'e3'])
//         assert Graph([('a', ':ARG', 'b')], top='b').variables() == set('ab')

test('variables', (t) => {
  t.deepEqual(new Graph([['a', ':ARG', 'b']]).variables(), new Set(['a']));
  t.deepEqual(
    new Graph(x1()[1]).variables(),
    new Set(['e2', 'x1', '_1', 'e3'])
  );
  t.deepEqual(
    new Graph([['a', ':ARG', 'b']], 'b').variables(),
    new Set(['a', 'b'])
  );
});

//     def test_instances(self, x1):
//         g = Graph(x1[1])
//         assert g.instances() == [
//             ('e2', ':instance', '_try_v_1'),
//             ('x1', ':instance', 'named'),
//             ('_1', ':instance', 'proper_q'),
//             ('e3', ':instance', '_sleep_v_1'),
//         ]

test('instances', (t) => {
  const g = new Graph(x1()[1]);
  t.deepEqual(g.instances(), [
    ['e2', ':instance', '_try_v_1'],
    ['x1', ':instance', 'named'],
    ['_1', ':instance', 'proper_q'],
    ['e3', ':instance', '_sleep_v_1'],
  ]);
});

//     def test_edges(self, x1):
//         g = Graph(x1[1])
//         assert g.edges() == [
//             ('e2', ':ARG1', 'x1'),
//             ('_1', ':RSTR', 'x1'),
//             ('e2', ':ARG2', 'e3'),
//             ('e3', ':ARG1', 'x1'),
//         ]
//         assert g.edges(source='e2') == [
//             ('e2', ':ARG1', 'x1'),
//             ('e2', ':ARG2', 'e3'),
//         ]
//         assert g.edges(source='e3') == [
//             ('e3', ':ARG1', 'x1')
//         ]
//         assert g.edges(target='e3') == [
//             ('e2', ':ARG2', 'e3')
//         ]
//         assert g.edges(role=':RSTR') == [
//             ('_1', ':RSTR', 'x1')
//         ]

test('edges', (t) => {
  const g = new Graph(x1()[1]);
  t.deepEqual(g.edges(), [
    ['e2', ':ARG1', 'x1'],
    ['_1', ':RSTR', 'x1'],
    ['e2', ':ARG2', 'e3'],
    ['e3', ':ARG1', 'x1'],
  ]);
  t.deepEqual(g.edges('e2'), [
    ['e2', ':ARG1', 'x1'],
    ['e2', ':ARG2', 'e3'],
  ]);
  t.deepEqual(g.edges('e3'), [['e3', ':ARG1', 'x1']]);
  t.deepEqual(g.edges(null, null, 'e3'), [['e2', ':ARG2', 'e3']]);
  t.deepEqual(g.edges(null, ':RSTR'), [['_1', ':RSTR', 'x1']]);
});

//     def test_edges_issue_81(self, x1):
//         g = Graph([('s', ':instance', 'sleep-01'),
//                    ('s', ':ARG0', 'i'),
//                    ('i', ':instance', 'i')])
//         assert g.edges() == [
//             ('s', ':ARG0', 'i')
//         ]
//         assert g.instances() == [
//             ('s', ':instance', 'sleep-01'),
//             ('i', ':instance', 'i')
//         ]

test('edges_issue_81', (t) => {
  const g = new Graph([
    ['s', ':instance', 'sleep-01'],
    ['s', ':ARG0', 'i'],
    ['i', ':instance', 'i'],
  ]);
  t.deepEqual(g.edges(), [['s', ':ARG0', 'i']]);
  t.deepEqual(g.instances(), [
    ['s', ':instance', 'sleep-01'],
    ['i', ':instance', 'i'],
  ]);
});

//     def test_attributes(self, x1):
//         g = Graph(x1[1])
//         assert g.attributes() == [
//             ('x1', ':CARG', '"Abrams"'),
//         ]
//         assert g.attributes(source='x1') == [
//             ('x1', ':CARG', '"Abrams"'),
//         ]
//         assert g.attributes(target='"Abrams"') == [
//             ('x1', ':CARG', '"Abrams"'),
//         ]
//         assert g.attributes(role=':instance') == []

test('attributes', (t) => {
  const g = new Graph(x1()[1]);
  t.deepEqual(g.attributes(), [['x1', ':CARG', '"Abrams"']]);
  t.deepEqual(g.attributes('x1'), [['x1', ':CARG', '"Abrams"']]);
  t.deepEqual(g.attributes(null, null, '"Abrams"'), [
    ['x1', ':CARG', '"Abrams"'],
  ]);
  t.deepEqual(g.attributes(null, ':instance'), []);
});

//     def test_attributes_issue_29(self):
//         # https://github.com/goodmami/penman/issues/29
//         #
//         # added :polarity triple to distinguish instances() from
//         # attributes()
//         g = Graph([('f', ':instance', 'follow'),
//                    ('f', ':polarity', '-'),
//                    ('f', ':ARG0', 'i'),
//                    ('i', ':instance', 'it'),
//                    ('f', ':ARG1', 'i2'),
//                    ('i2', ':instance', 'i')])
//         assert g.instances() == [
//             ('f', ':instance', 'follow'),
//             ('i', ':instance', 'it'),
//             ('i2', ':instance', 'i'),
//         ]
//         assert g.attributes() == [
//             ('f', ':polarity', '-'),
//         ]

test('attributes_issue_29', (t) => {
  // https://github.com/goodmami/penman/issues/29
  //
  // added :polarity triple to distinguish instances() from
  // attributes()
  const g = new Graph([
    ['f', ':instance', 'follow'],
    ['f', ':polarity', '-'],
    ['f', ':ARG0', 'i'],
    ['i', ':instance', 'it'],
    ['f', ':ARG1', 'i2'],
    ['i2', ':instance', 'i'],
  ]);
  t.deepEqual(g.instances(), [
    ['f', ':instance', 'follow'],
    ['i', ':instance', 'it'],
    ['i2', ':instance', 'i'],
  ]);
  t.deepEqual(g.attributes(), [['f', ':polarity', '-']]);
});

//     def test_reentrancies(self, x1):
//         g = Graph(x1[1])
//         assert g.reentrancies() == {'x1': 2}
//         # top has an implicit entrancy
//         g = Graph([
//             ('b', ':instance', 'bark'),
//             ('b', ':ARG1', 'd'),
//             ('d', ':instance', 'dog'),
//             ('w', ':ARG1', 'b'),
//             ('w', ':instance', 'wild'),
//         ])
//         assert g.reentrancies() == {'b': 1}

test('reentrancies', (t) => {
  const g = new Graph(x1()[1]);
  t.deepEqual(g.reentrancies(), new Map([['x1', 2]]));
  // top has an implicit entrancy
  const g2 = new Graph([
    ['b', ':instance', 'bark'],
    ['b', ':ARG1', 'd'],
    ['d', ':instance', 'dog'],
    ['w', ':ARG1', 'b'],
    ['w', ':instance', 'wild'],
  ]);
  t.deepEqual(g2.reentrancies(), new Map([['b', 1]]));
});
