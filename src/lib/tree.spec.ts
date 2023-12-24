import test from 'ava';

import { _defaultVariablePrefix, isAtomic, Tree } from './tree';
import { Node } from './types';

const empty_node = (): Node => ['a'];

const simple_node = (): Node => ['a', [['/', 'alpha']]];

const one_arg_node = (): Node => [
  'a',
  [
    ['/', 'alpha'],
    [':ARG0', ['b', [['/', 'beta']]]],
  ],
];

const reentrant = (): Node => [
  'a',
  [
    ['/', 'alpha'],
    [':ARG0', ['b', [['/', 'beta']]]],
    [
      ':ARG1',
      [
        'g',
        [
          ['/', 'gamma'],
          [':ARG0', 'b'],
        ],
      ],
    ],
  ],
];

const var_instance = (): Node => [
  'a',
  [
    ['/', 'alpha'],
    [':ARG0', ['b', [['/', 'b']]]],
  ],
];

test('_init__', (t) => {
  // @ts-ignore
  t.throws(() => new Tree());
  const t1 = new Tree(empty_node());
  t.deepEqual(t1.node, empty_node());
  t.deepEqual(t1.metadata, {});

  const t2 = new Tree(simple_node(), { snt: 'Alpha.' });
  t.deepEqual(t2.node, simple_node());
  t.deepEqual(t2.metadata, { snt: 'Alpha.' });
});

//     def test_nodes(self, one_arg_node, reentrant):
//         t = tree.Tree(one_arg_node)
//         assert t.nodes() == [one_arg_node, ('b', [('/', 'beta')])]

//         t = tree.Tree(reentrant)
//         assert t.nodes() == [reentrant,
//                              ('b', [('/', 'beta')]),
//                              ('g', [('/', 'gamma'), (':ARG0', 'b')])]

test('nodes', (t) => {
  const t1 = new Tree(one_arg_node());
  t.deepEqual(t1.nodes(), [one_arg_node(), ['b', [['/', 'beta']]]]);

  const t2 = new Tree(reentrant());
  t.deepEqual(t2.nodes(), [
    reentrant(),
    ['b', [['/', 'beta']]],
    [
      'g',
      [
        ['/', 'gamma'],
        [':ARG0', 'b'],
      ],
    ],
  ]);
});

//     def test_walk(self, one_arg_node, reentrant):
//         t = tree.Tree(one_arg_node)
//         assert list(t.walk()) == [
//             ((0,), ('/', 'alpha')),
//             ((1,), (':ARG0', ('b', [('/', 'beta')]))),
//             ((1, 0), ('/', 'beta')),
//         ]

//         t = tree.Tree(reentrant)
//         assert list(t.walk()) == [
//             ((0,), ('/', 'alpha')),
//             ((1,), (':ARG0', ('b', [('/', 'beta')]))),
//             ((1, 0), ('/', 'beta')),
//             ((2,), (':ARG1', ('g', [('/', 'gamma'),
//                                     (':ARG0', 'b')]))),
//             ((2, 0), ('/', 'gamma')),
//             ((2, 1), (':ARG0', 'b')),
//         ]

//         t = tree.Tree(('a', [('/', 'alpha'),
//                              (':polarity', '-'),
//                              (':ARG0', ('b', [('/', 'beta')]))]))
//         assert list(t.walk()) == [
//             ((0,), ('/', 'alpha')),
//             ((1,), (':polarity', '-')),
//             ((2,), (':ARG0', ('b', [('/', 'beta')]))),
//             ((2, 0), ('/', 'beta')),
//         ]

test('walk', (t) => {
  const t1 = new Tree(one_arg_node());
  t.deepEqual(Array.from(t1.walk()), [
    [[0], ['/', 'alpha']],
    [[1], [':ARG0', ['b', [['/', 'beta']]]]],
    [
      [1, 0],
      ['/', 'beta'],
    ],
  ]);

  const t2 = new Tree(reentrant());
  t.deepEqual(Array.from(t2.walk()), [
    [[0], ['/', 'alpha']],
    [[1], [':ARG0', ['b', [['/', 'beta']]]]],
    [
      [1, 0],
      ['/', 'beta'],
    ],
    [
      [2],
      [
        ':ARG1',
        [
          'g',
          [
            ['/', 'gamma'],
            [':ARG0', 'b'],
          ],
        ],
      ],
    ],
    [
      [2, 0],
      ['/', 'gamma'],
    ],
    [
      [2, 1],
      [':ARG0', 'b'],
    ],
  ]);

  const t3 = new Tree([
    'a',
    [
      ['/', 'alpha'],
      [':polarity', '-'],
      [':ARG0', ['b', [['/', 'beta']]]],
    ],
  ]);
  t.deepEqual(Array.from(t3.walk()), [
    [[0], ['/', 'alpha']],
    [[1], [':polarity', '-']],
    [[2], [':ARG0', ['b', [['/', 'beta']]]]],
    [
      [2, 0],
      ['/', 'beta'],
    ],
  ]);
});

//     def test_reset_variables(self, one_arg_node, reentrant, var_instance):

//         def _vars(t):
//             return [v for v, _ in t.nodes()]

//         t = tree.Tree(one_arg_node)
//         assert _vars(t) == ['a', 'b']

//         t.reset_variables(fmt='a{i}')
//         assert _vars(t) == ['a0', 'a1']

//         t.reset_variables(fmt='a{j}')
//         assert _vars(t) == ['a', 'a2']

//         t.reset_variables()
//         assert _vars(t) == ['a', 'b']

//         t = tree.Tree(reentrant)
//         assert _vars(t) == ['a', 'b', 'g']

//         t.reset_variables(fmt='a{i}')
//         assert _vars(t) == ['a0', 'a1', 'a2']
//         assert t == (
//             'a0', [('/', 'alpha'),
//                    (':ARG0', ('a1', [('/', 'beta')])),
//                    (':ARG1', ('a2', [('/', 'gamma'),
//                                      (':ARG0', 'a1')]))])

//         t.reset_variables()
//         assert _vars(t) == ['a', 'b', 'g']

//         t = tree.Tree(var_instance)
//         assert _vars(t) == ['a', 'b']

//         t.reset_variables(fmt='a{i}')
//         assert _vars(t) == ['a0', 'a1']
//         assert t == (
//             'a0', [('/', 'alpha'),
//                    (':ARG0', ('a1', [('/', 'b')]))])

//         t.reset_variables()
//         assert _vars(t) == ['a', 'b']

test('reset_variables', (t) => {
  const _vars = (t) => t.nodes().map(([v]) => v);

  const t1 = new Tree(one_arg_node());
  t.deepEqual(_vars(t1), ['a', 'b']);

  t1.resetVariables('a{i}');
  t.deepEqual(_vars(t1), ['a0', 'a1']);

  t1.resetVariables('a{j}');
  t.deepEqual(_vars(t1), ['a', 'a2']);

  t1.resetVariables();
  t.deepEqual(_vars(t1), ['a', 'b']);

  const t2 = new Tree(reentrant());
  t.deepEqual(_vars(t2), ['a', 'b', 'g']);

  t2.resetVariables('a{i}');
  t.deepEqual(_vars(t2), ['a0', 'a1', 'a2']);
  t.deepEqual(
    t2,
    new Tree([
      'a0',
      [
        ['/', 'alpha'],
        [':ARG0', ['a1', [['/', 'beta']]]],
        [
          ':ARG1',
          [
            'a2',
            [
              ['/', 'gamma'],
              [':ARG0', 'a1'],
            ],
          ],
        ],
      ],
    ]),
  );

  t2.resetVariables();
  t.deepEqual(_vars(t2), ['a', 'b', 'g']);

  const t3 = new Tree(var_instance());
  t.deepEqual(_vars(t3), ['a', 'b']);

  t3.resetVariables('a{i}');
  t.deepEqual(_vars(t3), ['a0', 'a1']);
  t.deepEqual(
    t3,
    new Tree([
      'a0',
      [
        ['/', 'alpha'],
        [':ARG0', ['a1', [['/', 'b']]]],
      ],
    ]),
  );

  t3.resetVariables();
  t.deepEqual(_vars(t3), ['a', 'b']);
});

// def test_is_atomic():
//     assert tree.is_atomic('a')
//     assert tree.is_atomic(None)
//     assert tree.is_atomic(3.14)
//     assert not tree.is_atomic(('a', [('/', 'alpha')]))

test('is_atomic', (t) => {
  t.true(isAtomic('a'));
  t.true(isAtomic(null));
  t.true(isAtomic(3.14));
  t.false(isAtomic(['a', [['/', 'alpha']]]));
});

// def test_default_variable_prefix():
//     assert tree._default_variable_prefix('Alphabet') == 'a'
//     assert tree._default_variable_prefix('chase-01') == 'c'
//     assert tree._default_variable_prefix('"string"') == 's'
//     assert tree._default_variable_prefix('_predicate_n_1"') == 'p'
//     assert tree._default_variable_prefix(1) == '_'
//     assert tree._default_variable_prefix(None) == '_'
//     assert tree._default_variable_prefix('') == '_'

test('default_variable_prefix', (t) => {
  t.is(_defaultVariablePrefix('Alphabet'), 'a');
  t.is(_defaultVariablePrefix('chase-01'), 'c');
  t.is(_defaultVariablePrefix('"string"'), 's');
  t.is(_defaultVariablePrefix('_predicate_n_1"'), 'p');
  t.is(_defaultVariablePrefix(1), '_');
  t.is(_defaultVariablePrefix(null), '_');
  t.is(_defaultVariablePrefix(''), '_');
});
