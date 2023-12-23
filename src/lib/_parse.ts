import { lex, PENMAN_RE, Token, TokenIterator, TRIPLE_RE } from './_lexer';
import { debug, warn } from './logger';
import { Tree } from './tree';
import { BasicTriple, Branch, Node, Target } from './types';

/**
 * Parse PENMAN-notation string *s* into its tree structure.
 *
 * Args:
 *    s: a string containing a single PENMAN-serialized graph
 * Returns:
 *   The tree structure described by *s*.
 * Example:
 *  >>> import penman
 *  >>> penman.parse('(b / bark-01 :ARG0 (d / dog))')  // noqa
 *  Tree(('b', [('/', 'bark-01'), (':ARG0', ('d', [('/', 'dog')]))]))
 */
export const parse = (s: string): Tree => {
  const tokens = lex(s, PENMAN_RE);
  return _parse(tokens);
};

/**
 * Yield trees parsed from *lines*.
 *
 * Args:
 *   lines: a string or open file with PENMAN-serialized graphs
 * Returns:
 *   The :class:`~penman.tree.Tree` object described in *lines*.
 * Example:
 *   >>> import penman
 *   >>> for t in penman.iterparse('(a / alpha) (b / beta)'):
 *   ...     print(repr(t))
 *   ...
 *   Tree(('a', [('/', 'alpha')]))
 *   Tree(('b', [('/', 'beta')]))
 */
export function* iterparse(
  lines: Iterable<string> | string,
): IterableIterator<Tree> {
  const tokens = lex(lines, PENMAN_RE);
  while (['COMMENT', 'LPAREN'].includes(tokens && tokens.peek()[0])) {
    yield _parse(tokens);
  }
}

/**
 * Parse a triple conjunction from *s*.
 *
 * Example:
 *   >>> import penman
 *   >>> for triple in penman.parse_triples('''
 *   ...         instance(b, bark) ^
 *   ...         ARG0(b, d) ^
 *   ...         instance(d, dog)'''):
 *   ...     print(triple)
 *   ('b', ':instance', 'bark')
 *   ('b', ':ARG0', 'd')
 *   ('d', ':instance', 'dog')
 */
export const parseTriples = (s: string): BasicTriple[] => {
  const tokens = lex(s, TRIPLE_RE);
  return _parse_triples(tokens);
};

const _parse = (tokens: TokenIterator): Tree => {
  const metadata = _parse_comments(tokens);
  const node = _parse_node(tokens);
  const tree = new Tree(node, metadata);
  debug(`Parsed: ${tree}`);
  return tree;
};

/**
 * Parse PENMAN comments from *tokens* and return any metadata.
 */
const _parse_comments = (tokens: TokenIterator): { [key: string]: string } => {
  const metadata: { [key: string]: string } = {};
  while (tokens.peek()[0] === 'COMMENT') {
    let comment = tokens.next().value[1];
    while (comment) {
      if (comment.includes('::')) {
        const parts = comment.split('::');
        comment = parts[0];
        const meta = parts.slice(1).join('::');
        const [key, ...values] = meta.split(' ');
        metadata[key] = values.join(' ');
      } else {
        comment = '';
      }
    }
  }
  return metadata;
};

/**
 * Parse a PENMAN node from *tokens*.
 *
 * Nodes have the following pattern::
 *
 *    Node := '(' ID ('/' Concept)? Edge* ')'
 */
const _parse_node = (tokens: TokenIterator): Node => {
  tokens.expect('LPAREN');

  let variable: string | null = null;
  let concept: string | null = null;
  const edges = [];

  if (tokens.peek()[0] !== 'RPAREN') {
    variable = tokens.expect('SYMBOL')[1];
    if (tokens.peek()[0] === 'SLASH') {
      const slash = tokens.next().value;
      // for robustness, don't assume next token is the concept
      if (['SYMBOL', 'STRING'].includes(tokens.peek()[0])) {
        concept = tokens.next().value[1];
        if (tokens.peek()[0] === 'ALIGNMENT') {
          concept += tokens.next().value[1];
        }
      } else {
        concept = null;
        warn(`Missing concept: ${slash[4]}`);
      }
      edges.push(['/', concept]);
    }
    while (tokens.peek()[0] !== 'RPAREN') {
      edges.push(_parse_edge(tokens));
    }
  }

  tokens.expect('RPAREN');
  return [variable, edges];
};

/**
 * Parse a PENMAN edge from *tokens*.
 *
 * Edges have the following pattern::
 *
 *   Edge := Role (Constant | Node)
 */
const _parse_edge = (tokens: TokenIterator): Branch => {
  const roleToken = tokens.expect('ROLE');
  let role = roleToken[1];
  if (tokens.peek()[0] === 'ALIGNMENT') {
    role += tokens.next().value[1];
  }

  let target: string | Node | null = null;
  const _next = tokens.peek();
  const nextType = _next[0];
  if (['SYMBOL', 'STRING'].includes(nextType)) {
    target = tokens.next().value[1];
    if (tokens.peek()[0] === 'ALIGNMENT') {
      target += tokens.next().value[1];
    }
  } else if (nextType === 'LPAREN') {
    target = _parse_node(tokens);
  } else if (!['ROLE', 'RPAREN'].includes(nextType)) {
    throw tokens.error('Expected: SYMBOL, STRING, LPAREN', _next);
  } else {
    warn(`Missing target: ${roleToken[4]}`);
  }
  return [role, target];
};

const _parse_triples = (tokens: TokenIterator): BasicTriple[] => {
  let target: Target;
  const triples = [];
  let stripCaret = false;
  while (true) {
    let role = tokens.expect('SYMBOL')[1];
    if (stripCaret && role.startsWith('^')) {
      role = role.slice(1);
    }
    if (!role.startsWith(':')) {
      role = ':' + role;
    }
    tokens.expect('LPAREN');
    const symbol = tokens.expect('SYMBOL');
    const parsedTriple = _parse_triple(symbol, tokens);
    const source = parsedTriple[0];
    target = parsedTriple[1];
    tokens.expect('RPAREN');

    if (target == null) {
      warn(`Triple without a target: ${symbol[4]}`);
    }

    triples.push([source, role, target]);

    // continue only if triple is followed by ^
    if (tokens.hasNext()) {
      const _next = tokens.peek();
      if (_next[0] !== 'SYMBOL' || !_next[1].startsWith('^')) {
        break;
      } else if (_next[1] === '^') {
        stripCaret = false;
        tokens.next();
      } else {
        stripCaret = true;
      }
    } else {
      break;
    }
  }
  return triples;
};

const _parse_triple = (
  symbol: Token,
  tokens: TokenIterator,
): [string, Target] => {
  // SYMBOL may contain commas, so handle it here. If there
  // is no space between the comma and the next SYMBOL, they
  // will be grouped as one.
  const [source, ...remaining] = symbol[1].split(',');
  const hasComma = remaining.length > 0;
  const rest = remaining.join(',');
  let target: Target = null;
  if (rest.length) {
    // role(a,b)
    target = rest;
  } else {
    if (hasComma) {
      // role(a, b) OR role(a,)
      const _next = tokens.accept('SYMBOL');
      if (_next) {
        target = _next[1];
      }
    } else {
      // role(a , b) OR role(a ,b) OR role(a ,) OR role(a)
      const _next = tokens.accept('SYMBOL');
      if (!_next) {
        // role(a)
      } else if (_next[1] === ',') {
        // role(a , b) OR role(a ,)
        const _next = tokens.accept('SYMBOL');
        if (_next) {
          // role(a , b)
          target = _next[1];
        }
      } else if (_next[1].startsWith(',')) {
        // role(a ,b)
        target = _next[1].slice(1);
      } else {
        // role(a b)
        throw tokens.error("Expected: ','", _next);
      }
    }
  }
  return [source, target];
};
