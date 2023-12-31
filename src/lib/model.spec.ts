import test from 'ava';

import { miniAmr } from './fixtures';
import { Graph } from './graph';
import { Model } from './model';
import { Triple } from './types';

test('init', (t) => {
  const m = new Model();
  t.is(Object.keys(m.roles).length, 0);
  const m1 = new Model({ roles: miniAmr().roles });
  t.is(Object.keys(m1.roles).length, 7);
});

test('from_dict', (t) => {
  t.deepEqual(
    Model.fromDict(miniAmr()),
    new Model({
      roles: miniAmr().roles,
      normalizations: miniAmr().normalizations,
      reifications: miniAmr().reifications,
    }),
  );
});

test('has_role', (t) => {
  const m = new Model();
  t.false(m.hasRole(''));
  t.true(m.hasRole(m.conceptRole));
  t.false(m.hasRole(':ARG0'));
  t.false(m.hasRole(':ARG0-of'));
  const m1 = Model.fromDict(miniAmr());
  t.false(m1.hasRole(''));
  t.true(m1.hasRole(m1.conceptRole));
  t.true(m1.hasRole(':ARG0'));
  t.true(m1.hasRole(':ARG0-of'));
  t.true(m1.hasRole(':mod'));
  t.true(m1.hasRole(':mod-of'));
  t.false(m1.hasRole(':consist'));
  t.true(m1.hasRole(':consist-of'));
  t.true(m1.hasRole(':consist-of-of'));
  t.false(m1.hasRole(':fake'));
  t.true(m1.hasRole(':op1'));
  t.true(m1.hasRole(':op10'));
  t.true(m1.hasRole(':op9999'));
  t.false(m1.hasRole(':op[0-9]+'));
});

test('is_role_inverted', (t) => {
  const m = new Model();
  t.true(m.isRoleInverted(':ARG0-of'));
  t.true(m.isRoleInverted(':-of'));
  t.false(m.isRoleInverted(':ARG0'));
  t.false(m.isRoleInverted(':'));
  t.true(m.isRoleInverted(':consist-of'));

  const m1 = Model.fromDict(miniAmr());
  t.true(m1.isRoleInverted(':mod-of'));
  t.true(m1.isRoleInverted(':domain-of'));
  t.false(m1.isRoleInverted(':mod'));
  t.false(m1.isRoleInverted(':domain'));
  t.true(m1.isRoleInverted(':consist-of-of'));
  t.false(m1.isRoleInverted(':consist-of'));
});

test('invert_role', (t) => {
  const m = new Model();
  t.is(m.invertRole(':ARG0'), ':ARG0-of');
  t.is(m.invertRole(':ARG0-of'), ':ARG0');
  t.is(m.invertRole(':consist-of'), ':consist');
  t.is(m.invertRole(':mod'), ':mod-of');
  t.is(m.invertRole(':domain'), ':domain-of');

  const m1 = Model.fromDict(miniAmr());
  t.is(m1.invertRole(':ARG0'), ':ARG0-of');
  t.is(m1.invertRole(':ARG0-of'), ':ARG0');
  t.is(m1.invertRole(':consist-of'), ':consist-of-of');
  t.is(m1.invertRole(':mod'), ':mod-of');
  t.is(m1.invertRole(':domain'), ':domain-of');
});

test('invert', (t) => {
  const m = new Model();
  t.deepEqual(m.invert(['a', ':ARG0', 'b']), ['b', ':ARG0-of', 'a']);
  t.deepEqual(m.invert(['a', ':ARG0-of', 'b']), ['b', ':ARG0', 'a']);
  t.deepEqual(m.invert(['a', ':consist-of', 'b']), ['b', ':consist', 'a']);
  t.deepEqual(m.invert(['a', ':mod', 'b']), ['b', ':mod-of', 'a']);
  t.deepEqual(m.invert(['a', ':domain', 'b']), ['b', ':domain-of', 'a']);

  const m1 = Model.fromDict(miniAmr());
  t.deepEqual(m1.invert(['a', ':ARG0', 'b']), ['b', ':ARG0-of', 'a']);
  t.deepEqual(m1.invert(['a', ':ARG0-of', 'b']), ['b', ':ARG0', 'a']);
  t.deepEqual(m1.invert(['a', ':consist-of', 'b']), [
    'b',
    ':consist-of-of',
    'a',
  ]);
  t.deepEqual(m1.invert(['a', ':mod', 'b']), ['b', ':mod-of', 'a']);
  t.deepEqual(m1.invert(['a', ':domain', 'b']), ['b', ':domain-of', 'a']);
});

test('deinvert', (t) => {
  const m = new Model();
  t.deepEqual(m.deinvert(['a', ':ARG0', 'b']), ['a', ':ARG0', 'b']);
  t.deepEqual(m.deinvert(['a', ':ARG0-of', 'b']), ['b', ':ARG0', 'a']);
  t.deepEqual(m.deinvert(['a', ':consist-of', 'b']), ['b', ':consist', 'a']);
  t.deepEqual(m.deinvert(['a', ':mod', 'b']), ['a', ':mod', 'b']);
  t.deepEqual(m.deinvert(['a', ':domain', 'b']), ['a', ':domain', 'b']);

  const m1 = Model.fromDict(miniAmr());
  t.deepEqual(m1.deinvert(['a', ':ARG0', 'b']), ['a', ':ARG0', 'b']);
  t.deepEqual(m1.deinvert(['a', ':ARG0-of', 'b']), ['b', ':ARG0', 'a']);
  t.deepEqual(m1.deinvert(['a', ':consist-of', 'b']), [
    'a',
    ':consist-of',
    'b',
  ]);
  t.deepEqual(m1.deinvert(['a', ':mod', 'b']), ['a', ':mod', 'b']);
  t.deepEqual(m1.deinvert(['a', ':domain', 'b']), ['a', ':domain', 'b']);
});

test('canonicalizeRole', (t) => {
  const m = new Model();
  t.is(m.canonicalizeRole(':ARG0'), ':ARG0');
  t.is(m.canonicalizeRole(':ARG0-of'), ':ARG0-of');
  t.is(m.canonicalizeRole(':ARG0-of-of'), ':ARG0');
  t.is(m.canonicalizeRole(':consist'), ':consist');
  t.is(m.canonicalizeRole(':consist-of'), ':consist-of');
  t.is(m.canonicalizeRole(':consist-of-of'), ':consist');
  t.is(m.canonicalizeRole(':mod'), ':mod');
  t.is(m.canonicalizeRole(':mod-of'), ':mod-of');
  t.is(m.canonicalizeRole(':domain'), ':domain');
  t.is(m.canonicalizeRole(':domain-of'), ':domain-of');
  // without :
  t.is(m.canonicalizeRole('ARG0'), ':ARG0');
  t.is(m.canonicalizeRole('ARG0-of'), ':ARG0-of');
  t.is(m.canonicalizeRole('ARG0-of-of'), ':ARG0');

  const m1 = Model.fromDict(miniAmr());
  t.is(m1.canonicalizeRole(':ARG0'), ':ARG0');
  t.is(m1.canonicalizeRole(':ARG0-of'), ':ARG0-of');
  t.is(m1.canonicalizeRole(':ARG0-of-of'), ':ARG0');
  t.is(m1.canonicalizeRole(':consist'), ':consist-of-of');
  t.is(m1.canonicalizeRole(':consist-of'), ':consist-of');
  t.is(m1.canonicalizeRole(':consist-of-of'), ':consist-of-of');
  t.is(m1.canonicalizeRole(':mod'), ':mod');
  t.is(m1.canonicalizeRole(':mod-of'), ':domain');
  t.is(m1.canonicalizeRole(':domain'), ':domain');
  t.is(m1.canonicalizeRole(':domain-of'), ':mod');
  // without :
  t.is(m1.canonicalizeRole('consist'), ':consist-of-of');
  t.is(m1.canonicalizeRole('consist-of'), ':consist-of');
  t.is(m1.canonicalizeRole('consist-of-of'), ':consist-of-of');
});

test('canonicalize', (t) => {
  const m1 = new Model();
  t.deepEqual(m1.canonicalize(['a', ':ARG0', 'b']), ['a', ':ARG0', 'b']);
  t.deepEqual(m1.canonicalize(['a', ':ARG0-of', 'b']), ['a', ':ARG0-of', 'b']);
  t.deepEqual(m1.canonicalize(['a', ':ARG0-of-of', 'b']), ['a', ':ARG0', 'b']);
  t.deepEqual(m1.canonicalize(['a', ':consist', 'b']), ['a', ':consist', 'b']);
  t.deepEqual(m1.canonicalize(['a', ':consist-of', 'b']), [
    'a',
    ':consist-of',
    'b',
  ]);
  t.deepEqual(m1.canonicalize(['a', ':consist-of-of', 'b']), [
    'a',
    ':consist',
    'b',
  ]);
  t.deepEqual(m1.canonicalize(['a', ':mod', 'b']), ['a', ':mod', 'b']);
  t.deepEqual(m1.canonicalize(['a', ':mod-of', 'b']), ['a', ':mod-of', 'b']);
  t.deepEqual(m1.canonicalize(['a', ':domain', 'b']), ['a', ':domain', 'b']);
  t.deepEqual(m1.canonicalize(['a', ':domain-of', 'b']), [
    'a',
    ':domain-of',
    'b',
  ]);
  // without :
  t.deepEqual(m1.canonicalize(['a', 'ARG0', 'b']), ['a', ':ARG0', 'b']);
  t.deepEqual(m1.canonicalize(['a', 'ARG0-of', 'b']), ['a', ':ARG0-of', 'b']);
  t.deepEqual(m1.canonicalize(['a', 'ARG0-of-of', 'b']), ['a', ':ARG0', 'b']);

  const m2 = Model.fromDict(miniAmr());
  t.deepEqual(m2.canonicalize(['a', ':ARG0', 'b']), ['a', ':ARG0', 'b']);
  t.deepEqual(m2.canonicalize(['a', ':ARG0-of', 'b']), ['a', ':ARG0-of', 'b']);
  t.deepEqual(m2.canonicalize(['a', ':ARG0-of-of', 'b']), ['a', ':ARG0', 'b']);
  t.deepEqual(m2.canonicalize(['a', ':consist', 'b']), [
    'a',
    ':consist-of-of',
    'b',
  ]);
  t.deepEqual(m2.canonicalize(['a', ':consist-of', 'b']), [
    'a',
    ':consist-of',
    'b',
  ]);
  t.deepEqual(m2.canonicalize(['a', ':consist-of-of', 'b']), [
    'a',
    ':consist-of-of',
    'b',
  ]);
  t.deepEqual(m2.canonicalize(['a', ':mod', 'b']), ['a', ':mod', 'b']);
  t.deepEqual(m2.canonicalize(['a', ':mod-of', 'b']), ['a', ':domain', 'b']);
  t.deepEqual(m2.canonicalize(['a', ':domain', 'b']), ['a', ':domain', 'b']);
  t.deepEqual(m2.canonicalize(['a', ':domain-of', 'b']), ['a', ':mod', 'b']);
  // without :
  t.deepEqual(m2.canonicalize(['a', 'consist', 'b']), [
    'a',
    ':consist-of-of',
    'b',
  ]);
  t.deepEqual(m2.canonicalize(['a', 'consist-of', 'b']), [
    'a',
    ':consist-of',
    'b',
  ]);
  t.deepEqual(m2.canonicalize(['a', 'consist-of-of', 'b']), [
    'a',
    ':consist-of-of',
    'b',
  ]);
});

test('isRoleReifiable', (t) => {
  const m1 = new Model();
  t.false(m1.isRoleReifiable(':ARG0'));
  t.false(m1.isRoleReifiable(':accompanier'));
  t.false(m1.isRoleReifiable(':domain'));
  t.false(m1.isRoleReifiable(':mod'));
  const m2 = Model.fromDict(miniAmr());
  t.false(m2.isRoleReifiable(':ARG0'));
  t.true(m2.isRoleReifiable(':accompanier'));
  t.false(m2.isRoleReifiable(':domain'));
  t.true(m2.isRoleReifiable(':mod'));
});

test('reify', (t) => {
  const m1 = new Model();
  t.throws(() => m1.reify(['a', ':ARG0', 'b']));
  t.throws(() => m1.reify(['a', ':accompanier', 'b']));
  t.throws(() => m1.reify(['a', ':domain', 'b']));
  t.throws(() => m1.reify(['a', ':mod', 'b']));
  const m2 = Model.fromDict(miniAmr());
  t.throws(() => m2.reify(['a', ':ARG0', 'b']));
  t.deepEqual(m2.reify(['a', ':accompanier', 'b']), [
    ['_', ':ARG0', 'a'],
    ['_', ':instance', 'accompany-01'],
    ['_', ':ARG1', 'b'],
  ]);
  t.throws(() => m2.reify(['a', ':domain', 'b']));
  t.deepEqual(m2.reify(['a', ':mod', 'b']), [
    ['_', ':ARG1', 'a'],
    ['_', ':instance', 'have-mod-91'],
    ['_', ':ARG2', 'b'],
  ]);
  // ensure unique ids if variables is specified
  t.deepEqual(
    m2.reify(['a', ':mod', 'b'], { variables: new Set(['a', 'b', '_']) }),
    [
      ['_2', ':ARG1', 'a'],
      ['_2', ':instance', 'have-mod-91'],
      ['_2', ':ARG2', 'b'],
    ],
  );
});

test('isConceptDereifiable', (t) => {
  const m1 = new Model();
  t.false(m1.isConceptDereifiable('chase-01'));
  t.false(m1.isConceptDereifiable(':mod'));
  t.false(m1.isConceptDereifiable('have-mod-91'));
  const m2 = Model.fromDict(miniAmr());
  t.false(m2.isConceptDereifiable('chase-01'));
  t.false(m2.isConceptDereifiable(':mod'));
  t.true(m2.isConceptDereifiable('have-mod-91'));
});

test('dereify', (t) => {
  // (a :ARG1-of (_ / age-01 :ARG2 b)) -> (a :age b)
  const t1: Triple = ['_', ':instance', 'have-mod-91'];
  const t1b: Triple = ['_', ':instance', 'chase-01'];
  const t2: Triple = ['_', ':ARG1', 'a'];
  const t3: Triple = ['_', ':ARG2', 'b'];
  const m1 = new Model();
  t.throws(() => (m1 as any).dereify(t1));
  t.throws(() => (m1 as any).dereify(t1, t2));
  t.throws(() => (m1 as any).dereify(t1, t2, t3));
  const m2 = Model.fromDict(miniAmr());
  t.deepEqual(m2.dereify(t1, t2, t3), ['a', ':mod', 'b']);
  t.deepEqual(m2.dereify(t1, t3, t2), ['a', ':mod', 'b']);
  t.throws(() => m2.dereify(t1b, t2, t3));
});

test('errors', (t) => {
  const m = new Model();
  const a = Model.fromDict(miniAmr());
  // basic roles
  let g = new Graph([['a', ':instance', 'alpha']]);
  t.deepEqual(m.errors(g), {});
  g = new Graph([
    ['a', ':instance', 'alpha'],
    ['a', ':mod', '1'],
  ]);
  t.deepEqual(m.errors(g), {
    [['a', ':mod', '1'].toString()]: ['invalid role'],
  });
  t.deepEqual(a.errors(g), {});
  // regex role names
  g = new Graph([
    ['n', ':instance', 'name'],
    ['n', ':op1', 'Foo'],
    ['n', ':op2', 'Bar'],
  ]);
  t.deepEqual(a.errors(g), {});
  // disconnected graph
  g = new Graph([
    ['a', ':instance', 'alpha'],
    ['b', ':instance', 'beta'],
  ]);
  t.deepEqual(m.errors(g), {
    [['b', ':instance', 'beta'].toString()]: ['unreachable'],
  });
  t.deepEqual(a.errors(g), {
    [['b', ':instance', 'beta'].toString()]: ['unreachable'],
  });
});
