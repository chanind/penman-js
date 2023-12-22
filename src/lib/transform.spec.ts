import test from 'ava';

import { PENMANCodec } from './codec';
import { Graph } from './graph';
import { Model } from './model';
import amrModel from './models/amr';
import {
  canonicalizeRoles,
  dereifyEdges,
  indicateBranches,
  reifyAttributes,
  reifyEdges,
} from './transform';

const defModel = new Model();
const defCodec = new PENMANCodec(defModel);
const amrCodec = new PENMANCodec(amrModel);

const makeNorm =
  (func: (x: any, model: Model) => any, model: Model) => (x: any) =>
    func(x, model);

const makeForm = (func: (x: any, indent?: number) => string) => (x: any) =>
  func(x, null);

test('canonicalize_roles_default_codec', (t) => {
  const parse = defCodec.parse;
  const norm = makeNorm(canonicalizeRoles, defModel);
  const form = makeForm(defCodec.format);

  let r = norm(parse('(a / alpha :ARG1 (b / beta))'));
  t.is(form(r), '(a / alpha :ARG1 (b / beta))');

  r = norm(parse('(a / alpha :ARG1-of-of (b / beta))'));
  t.is(form(r), '(a / alpha :ARG1 (b / beta))');

  r = norm(parse('(a / alpha :mod-of (b / beta))'));
  t.is(form(r), '(a / alpha :mod-of (b / beta))');
});

test('canonicalize_roles_amr_codec', (t) => {
  const parse = amrCodec.parse;
  const norm = makeNorm(canonicalizeRoles, amrModel);
  const form = makeForm(amrCodec.format);

  let r = norm(parse('(a / alpha :ARG1 (b / beta))'));
  t.is(form(r), '(a / alpha :ARG1 (b / beta))');

  r = norm(parse('(a / alpha :ARG1-of-of (b / beta))'));
  t.is(form(r), '(a / alpha :ARG1 (b / beta))');

  r = norm(parse('(a / alpha :mod-of (b / beta))'));
  t.is(form(r), '(a / alpha :domain (b / beta))');

  r = norm(parse('(a / alpha :mod-of~1 (b / beta))'));
  t.is(form(r), '(a / alpha :domain~1 (b / beta))');
});

test('reify_edges_default_codec', (t) => {
  const decode = defCodec.decode.bind(defCodec);
  const norm = makeNorm(reifyEdges, defModel);
  const form = makeForm((g: Graph, indent?: number) =>
    defCodec.encode(g, undefined, indent),
  );

  let r = norm(decode('(a / alpha :mod 5)'));
  t.is(form(r), '(a / alpha :mod 5)');

  r = norm(decode('(a / alpha :mod-of (b / beta))'));
  t.is(form(r), '(a / alpha :mod-of (b / beta))');
});

test('reify_edges_amr_codec', (t) => {
  const decode = amrCodec.decode.bind(amrCodec);
  const norm = makeNorm(reifyEdges, amrModel);
  const form = makeForm((g: Graph, indent?: number) =>
    amrCodec.encode(g, undefined, indent),
  );

  let r = norm(decode('(a / alpha :mod 5)'));
  t.is(form(r), '(a / alpha :ARG1-of (_ / have-mod-91 :ARG2 5))');

  r = norm(decode('(a / alpha :mod-of (b / beta))'));
  t.is(form(r), '(a / alpha :ARG2-of (_ / have-mod-91 :ARG1 (b / beta)))');

  r = norm(decode('(a / alpha :mod-of (b / beta :polarity -))'));
  t.is(
    form(r),
    '(a / alpha :ARG2-of (_ / have-mod-91 :ARG1 (b / beta :ARG1-of (_2 / have-polarity-91 :ARG2 -))))',
  );

  r = norm(decode('(a / alpha :mod-of~1 (b / beta~2 :polarity -))'));
  t.is(
    form(r),
    '(a / alpha :ARG2-of (_ / have-mod-91~1 :ARG1 (b / beta~2 :ARG1-of (_2 / have-polarity-91 :ARG2 -))))',
  );
});

test('dereify_edges_default_codec', (t) => {
  const decode = defCodec.decode.bind(defCodec);
  const norm = makeNorm(dereifyEdges, defModel);
  const form = makeForm((g: Graph, indent?: number) =>
    defCodec.encode(g, undefined, indent),
  );

  let r = norm(
    decode(
      '(a / alpha :ARG1-of (_ / have-mod-91' +
        '                       :ARG2 (b / beta)))',
    ),
  );
  t.is(form(r), '(a / alpha :ARG1-of (_ / have-mod-91 :ARG2 (b / beta)))');

  r = norm(
    decode(
      '(a / alpha :ARG2-of (_ / have-mod-91' +
        '                       :ARG1 (b / beta)))',
    ),
  );
  t.is(form(r), '(a / alpha :ARG2-of (_ / have-mod-91 :ARG1 (b / beta)))');
});

test('dereify_edges_amr_codec', (t) => {
  const decode = amrCodec.decode.bind(amrCodec);
  const norm = makeNorm(dereifyEdges, amrModel);
  const form = makeForm((g: Graph, indent?: number) =>
    amrCodec.encode(g, undefined, indent),
  );

  const r = norm(
    decode(`
        (a / alpha
            :ARG1-of (b / beta
                        :ARG0 p)
            :ARG1-of (g / gamma
                        :ARG1-of (_ / own-01
                                    :ARG0 (p / pi))))`),
  );
  t.is(
    form(r),
    '(a / alpha :ARG1-of (b / beta :ARG0 p)' +
      ' :ARG1-of (g / gamma :poss (p / pi)))',
  );
});

test('reify_attributes', (t) => {
  const decode = defCodec.decode.bind(defCodec);
  const norm = reifyAttributes;
  const form = makeForm((g: Graph, indent?: number) =>
    defCodec.encode(g, undefined, indent),
  );

  let r = norm(decode('(a / alpha :mod 5)'));
  t.is(form(r), '(a / alpha :mod (_ / 5))');

  r = norm(decode('(a / alpha :mod~1 5~2)'));
  t.is(form(r), '(a / alpha :mod~1 (_ / 5~2))');
});

test('indicate_branches', (t) => {
  const decode = defCodec.decode.bind(defCodec);
  const norm = makeNorm(indicateBranches, defModel);
  const form = makeForm((g: Graph, indent?: number) =>
    defCodec.encode(g, undefined, indent),
  );

  let r = norm(decode('(a / alpha :mod 5)'));
  t.is(form(r), '(a / alpha :mod 5)');

  r = norm(decode('(a / alpha :mod-of (b / beta))'));
  t.is(form(r), '(a / alpha :TOP b :mod-of (b / beta))');
});

test('issue_35', (t) => {
  // https://github.com/goodmami/penman/issues/35

  // don't re-encode; these (presumably) bad graphs probably won't
  // round-trip without changes. Changes may be predictable, but I
  // don't want to test and guarantee some particular output

  let g = amrCodec.decode('(a / alpha :mod b :mod (b / beta))');
  g = reifyEdges(g, amrModel);
  t.deepEqual(g.triples, [
    ['a', ':instance', 'alpha'],
    ['_', ':ARG1', 'a'],
    ['_', ':instance', 'have-mod-91'],
    ['_', ':ARG2', 'b'],
    ['_2', ':ARG1', 'a'],
    ['_2', ':instance', 'have-mod-91'],
    ['_2', ':ARG2', 'b'],
    ['b', ':instance', 'beta'],
  ]);

  g = amrCodec.decode('(a / alpha :mod 7 :mod 7))');
  g = reifyAttributes(g);
  t.deepEqual(g.triples, [
    ['a', ':instance', 'alpha'],
    ['a', ':mod', '_'],
    ['_', ':instance', '7'],
    ['a', ':mod', '_2'],
    ['_2', ':instance', '7'],
  ]);
});
