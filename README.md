# penman-js

[![ci](https://img.shields.io/github/actions/workflow/status/chanind/penman-js/ci.yaml?branch=main)](https://github.com/chanind/penman-js)
[![Npm](https://img.shields.io/npm/v/penman-js)](https://www.npmjs.com/package/penman-js)

Javascript port of [Penman Python library](https://github.com/goodmami/penman) for AMR.

## About

This library is a direct port of the Python library, with identical method names and import structure. However, as Python and Javascript do have some differences, this port has the following changes:

- all snake-case function names from the Python library are renamed using camel-case to fit Javascript naming conventions. For example, the function `get_pushed_variable` from Python is renamed to `getPushedVariable` in Javascript.
- Python tuples are replaced with Javascript arrays
- Python dictionaries are replaced with Javascript `Map`
- functions only support positional arguments, since Javascript doesn't support keyword arguments like Python
- All imports use `penman-js` as the base instead of `penman`. For instance, `from penman.graph import Graph` in Python is replaced with `import { Graph } from "penman-js/graph";` in Javascript.

Otherwise, refer to the [Penman Python library docs](https://penman.readthedocs.io/en/latest/index.html) for full documentation.

This library is not officially part of the Penman project.

## Installation

Installation is via NPM:

```
npm install penman-js
```

## Basic usage

```js
import { encode, decode } from 'penman-js';

g = decode('(b / bark-01 :ARG0 (d / dog))');
g.triples;
// [('b', ':instance', 'bark-01'), ('b', ':ARG0', 'd'), ('d', ':instance', 'dog')]
g.edges();
// [Edge(source='b', role=':ARG0', target='d')]

// JS doesn't support keyword parameters, so `undefined` must be passed for optional params
console.log(encode(g, undefined, undefined, 3));
// (b / bark-01
//    :ARG0 (d / dog))
```

For full docs, view the [Penman Python library docs](https://penman.readthedocs.io/en/latest/index.html).

## Contributing

Contributions are welcome! If you notice any bugs or have ideas for improvements, please either file an issue or open a pull request.

## Development

This project is written in Typescript, using yarn for dependency management, eslint for linting, and ava for tests. Install dependencies with `yarn install`. To run linting and tests, run `yarn test`.
