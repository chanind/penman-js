# penman-js

[![ci](https://img.shields.io/github/actions/workflow/status/chanind/penman-js/ci.yaml?branch=main)](https://github.com/chanind/penman-js)
[![Npm](https://img.shields.io/npm/v/penman-js)](https://www.npmjs.com/package/penman-js)

Javascript port of the [Penman Python library](https://github.com/goodmami/penman) for Abstract Meaning Representation (AMR).

Full docs: [https://chanind.github.io/penman-js](https://chanind.github.io/penman-js/)

## About

This library, including documentation, is a manual port of the [Penman Python library](https://github.com/goodmami/penman). All functionality available in the original library should also be available in this library, with similar usage and semantics. The Python library should still be considered the main project for new features. If you find that behavior differs between these libraries, please [open an issue](https://github.com/chanind/penman-js/issues).

The goal of this project is to bring the power of the Penman Python library's AMR parsing and generation to the browser and Node.js. This project does not provide a CLI interface for manipulating AMR, since the Python library already provides that functionality.

## Installation

Installation is via NPM:

```
npm install penman-js
```

## Basic usage

The most faithful representation of AMR text in the library is the `Tree` class. The `parse` function turns an AMR text string into a `Tree`, and `format` does the reverse, turning a `Tree` back into a string.

```js
import { parse, format } from 'penman-js';

const t = penman.parse('(w / want-01 :ARG0 (b / boy) :ARG1 (g / go :ARG0 b))');
const [variable, branches] = t.node;
console.log(variable); // ouput: 'w'
console.log(branches.length); // output: 3
const [role, target] = branches[2];
console.log(role); // output: ':ARG1'
console.log(format(target));
// (g / go
//     :ARG0 b)
```

Users wanting to interact with graphs might find the `decode` and
`encode` functions a good place to start.

```js
import { encode, decode } from 'penman-js';
const g = penman.decode('(w / want-01 :ARG0 (b / boy) :ARG1 (g / go :ARG0 b))');
console.log(g.top);
// 'w'
console.log(g.triples.length);
// 6
console.log(g.instances().map((instance) => instance[2]));
// ['want-01', 'boy', 'go']

console.log(encode(g, { top: 'b' }));
// (b / boy
//    :ARG0-of (w / want-01
//                :ARG1 (g / go
//                         :ARG0 b)))
```

See [https://chanind.github.io/penman-js](https://chanind.github.io/penman-js/) for full docs.

## Contributing

Contributions are welcome! If you notice any bugs or have ideas for improvements, please either file an issue or open a pull request.

## Development

This project is written in Typescript, using yarn for dependency management, eslint for linting, and ava for tests. Install dependencies with `yarn install`. To run linting and tests, run `yarn test`.

## Acknowledgements

This library, including documentation, is a manual port of the Penman Python library, and as such, all credit for the original code and docs work goes to [github.com/goodmami/penman](https://github.com/goodmami/penman).
