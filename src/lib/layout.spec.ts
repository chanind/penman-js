import test from 'ava';

import { PENMANCodec } from './codec';
import { LayoutError } from './exceptions';
import { miniAmr } from './fixtures';
import { Graph } from './graph';
import {
  appearsInverted,
  configure,
  getPushedVariable,
  interpret,
  nodeContexts,
  rearrange,
  reconfigure,
} from './layout';
import { Model } from './model';
import { Tree } from './tree';

const codec = new PENMANCodec();
const model = new Model();

const amrModel = () => {
  return Model.fromDict(miniAmr());
};

test('interpret', (t) => {
  const t1 = codec.parse('(a / A)');
  t.true(interpret(t1).equals(new Graph([['a', ':instance', 'A']], 'a')));

  const t2 = codec.parse('(a / A :consist-of (b / B))');
  t.true(
    interpret(t2).equals(
      new Graph(
        [
          ['a', ':instance', 'A'],
          ['b', ':consist', 'a'],
          ['b', ':instance', 'B'],
        ],
        'a',
      ),
    ),
  );
  t.true(
    interpret(t2, amrModel()).equals(
      new Graph(
        [
          ['a', ':instance', 'A'],
          ['a', ':consist-of', 'b'],
          ['b', ':instance', 'B'],
        ],
        'a',
      ),
    ),
  );
});

test('rearrange', (t) => {
  const t1 = codec.parse(`
        (a / alpha
            :ARG0 (b / beta
                      :ARG0 (g / gamma)
                      :ARG1 (d / delta))
            :ARG0-of d
            :ARG1 (e / epsilon))`);
  rearrange(t1, model.originalOrder);
  t.is(
    codec.format(t1),
    `(a / alpha
   :ARG0 (b / beta
            :ARG0 (g / gamma)
            :ARG1 (d / delta))
   :ARG0-of d
   :ARG1 (e / epsilon))`,
  );

  rearrange(t1, model.canonicalOrder.bind(model));
  t.is(
    codec.format(t1),
    `(a / alpha
   :ARG0 (b / beta
            :ARG0 (g / gamma)
            :ARG1 (d / delta))
   :ARG1 (e / epsilon)
   :ARG0-of d)`,
  );
});
test('configure', (t) => {
  const g = codec.decode('(a / A)');
  t.deepEqual(configure(g), new Tree(['a', [['/', 'A']]]));
  t.throws(() => configure(g, 'A'), { instanceOf: LayoutError });

  const g1 = codec.decode('(a / A :consist-of (b / B))');
  t.deepEqual(
    configure(g1),
    new Tree([
      'a',
      [
        ['/', 'A'],
        [':consist-of', ['b', [['/', 'B']]]],
      ],
    ]),
  );
  t.deepEqual(
    configure(g1, 'b'),
    new Tree([
      'b',
      [
        ['/', 'B'],
        [':consist', ['a', [['/', 'A']]]],
      ],
    ]),
  );

  const amrCodec = new PENMANCodec(amrModel());
  const g2 = amrCodec.decode('(a / A :consist-of (b / B))');
  t.deepEqual(
    configure(g2, undefined, amrModel()),
    new Tree([
      'a',
      [
        ['/', 'A'],
        [':consist-of', ['b', [['/', 'B']]]],
      ],
    ]),
  );
  t.deepEqual(
    configure(g2, 'b', amrModel()),
    new Tree([
      'b',
      [
        ['/', 'B'],
        [':consist-of-of', ['a', [['/', 'A']]]],
      ],
    ]),
  );
});

test('issue 34', (t) => {
  // https://github.com/goodmami/penman/issues/34
  const g = codec.decode(`
    # ::snt I think you failed to not not act.
    (t / think
        :ARG0 (i / i)
        :ARG1 (f / fail
            :ARG0 (y / you)
            :ARG1 (a / act
                :polarity -
                :polarity -)))`);
  t.true(
    configure(g).equals(
      new Tree([
        't',
        [
          ['/', 'think'],
          [':ARG0', ['i', [['/', 'i']]]],
          [
            ':ARG1',
            [
              'f',
              [
                ['/', 'fail'],
                [':ARG0', ['y', [['/', 'you']]]],
                [
                  ':ARG1',
                  [
                    'a',
                    [
                      ['/', 'act'],
                      [':polarity', '-'],
                      [':polarity', '-'],
                    ],
                  ],
                ],
              ],
            ],
          ],
        ],
      ]),
    ),
  );
});

// TODO: figure out how to port this test to JS
// def test_issue_85(monkeypatch, caplog):
//     # https://github.com/goodmami/penman/issues/85
//     # Emulate multiprocessing by reassigning POP
//     with monkeypatch.context() as m:
//         m.setattr(layout, 'POP', layout.Pop())
//         g = codec.decode('(a / alpha :ARG0 (b / beta))')
//     caplog.set_level(logging.WARNING)
//     codec.encode(g, indent=None)
//     assert 'epigraphical marker ignored: POP' not in caplog.text

test('reconfigure', (t) => {
  const g = codec.decode(`
    (a / alpha
        :ARG0 b
        :ARG1 (g / gamma
            :ARG0-of (b / beta)))`);
  // original order reconfiguration puts node definitions at first
  // appearance of a variable
  t.deepEqual(
    reconfigure(g),
    new Tree([
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
              [':ARG0-of', 'b'],
            ],
          ],
        ],
      ],
    ]),
  );
  // canonical order reconfiguration can also shift things like
  // inverted arguments
  t.deepEqual(
    reconfigure(g, undefined, undefined, model.canonicalOrder.bind(model)),
    new Tree([
      'a',
      [
        ['/', 'alpha'],
        [
          ':ARG0',
          [
            'b',
            [
              ['/', 'beta'],
              [':ARG0', ['g', [['/', 'gamma']]]],
            ],
          ],
        ],
        [':ARG1', 'g'],
      ],
    ]),
  );
});

test('issue 90', (t) => {
  // https://github.com/goodmami/penman/issues/90
  const g = new Graph(
    [
      ['i', ':instance', 'iota'],
      ['i2', ':instance', 'i'],
      ['i', ':ARG0', 'i2'],
    ],
    'i',
  );
  t.deepEqual(
    reconfigure(g),
    new Tree([
      'i',
      [
        ['/', 'iota'],
        [':ARG0', ['i2', [['/', 'i']]]],
      ],
    ]),
  );
});

test('get pushed variable', (t) => {
  const g = codec.decode(`
    (a / alpha
        :ARG0 (b / beta)
        :ARG1-of (g / gamma))`);
  t.is(getPushedVariable(g, ['a', ':instance', 'alpha']), null);
  t.deepEqual(getPushedVariable(g, ['a', ':ARG0', 'b']), 'b');
  t.deepEqual(getPushedVariable(g, ['g', ':ARG1', 'a']), 'g');
});

test('appears inverted', (t) => {
  const g = codec.decode(`
    (a / alpha
        :ARG0 (b / beta)
        :ARG1-of (g / gamma))`);
  t.false(appearsInverted(g, ['a', ':instance', 'alpha']));
  t.false(appearsInverted(g, ['a', ':ARG0', 'b']));
  t.true(appearsInverted(g, ['g', ':ARG1', 'a']));
});

test('issue 47', (t) => {
  // https://github.com/goodmami/penman/issues/47
  const g = codec.decode(`
    (a / alpha
        :ARG0 (b / beta)
        :ARG1 (g / gamma
                  :ARG0 (d / delta)
                  :ARG1-of (e / epsilon)
                  :ARG1-of b))`);
  t.false(appearsInverted(g, ['a', ':ARG0', 'b']));
  t.false(appearsInverted(g, ['g', ':ARG0', 'd']));
  t.true(appearsInverted(g, ['e', ':ARG1', 'g']));
  t.true(appearsInverted(g, ['b', ':ARG1', 'g']));
});

test('issue 87', (t) => {
  // https://github.com/goodmami/penman/issues/87

  // The duplicate triple (i, :ARG0, c) below means the graph is bad
  // so the output is not guaranteed. Just check for errors.
  let g = codec.decode('(c / company :ARG0-of (i / insure-02 :ARG0 c))');
  appearsInverted(g, ['i', ':ARG0', 'c']);
  t.truthy(codec.encode(g));
  g = codec.decode('(c / company :ARG0-of i :ARG0-of (i / insure-02))');
  appearsInverted(g, ['i', ':ARG0', 'c']);
  t.truthy(codec.encode(g));
});

test('node_contexts', (t) => {
  let g = codec.decode('(a / alpha)');
  t.deepEqual(nodeContexts(g), ['a']);

  // note here and below: the first 'a' is for ('a', ':instance', None)
  g = codec.decode('(a :ARG0 (b / beta))');
  t.deepEqual(nodeContexts(g), ['a', 'a', 'b']);

  g = codec.decode('(a :ARG0-of (b / beta))');
  t.deepEqual(nodeContexts(g), ['a', 'a', 'b']);

  // also ('b', ':instance', None) here
  g = codec.decode('(a :ARG0 (b) :ARG1 (g / gamma))');
  t.deepEqual(nodeContexts(g), ['a', 'a', 'b', 'a', 'g']);
});

test('issue 92', (t) => {
  // https://github.com/goodmami/penman/issues/92
  const g = codec.decode('(a / alpha :ARG0~e.0 (b / beta))');
  t.deepEqual(
    configure(g),
    new Tree([
      'a',
      [
        ['/', 'alpha'],
        [':ARG0~e.0', ['b', [['/', 'beta']]]],
      ],
    ]),
  );
  t.deepEqual(
    configure(g, 'b'),
    new Tree([
      'b',
      [
        ['/', 'beta'],
        [':ARG0-of~e.0', ['a', [['/', 'alpha']]]],
      ],
    ]),
  );
});

test('issue 93', (t) => {
  // https://github.com/goodmami/penman/issues/93
  const g = codec.decode('(a / alpha :ARG0 b~1)');
  g.triples.push(['b', ':instance', 'beta']);
  t.deepEqual(
    configure(g),
    new Tree([
      'a',
      [
        ['/', 'alpha'],
        [':ARG0', ['b', [['/', 'beta']]]],
      ],
    ]),
  );
});
