# Quick start

## Installation

Install the library from NPM

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

The `decode` and `encode` functions work with one PENMAN
graph. The `load` and `dump` functions work with
collections of graphs.
