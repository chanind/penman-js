# Quick start

## Installation

Install the library from NPM

```
npm install penman-js
```

## Basic usage

The most faithful representation of AMR text in the library is the `Tree` class. The `Tree.fromPenman()` method turns an AMR text string into a `Tree`, and `tree.toPenman()` does the reverse, turning a `Tree` back into a string.

```js
import { Tree } from 'penman-js';

const tree = Tree.fromPenman(
  '(w / want-01 :ARG0 (b / boy) :ARG1 (g / go :ARG0 b))',
);
const [variable, branches] = tree.node;
console.log(variable); // ouput: 'w'
console.log(branches.length); // output: 3
const [role, target] = branches[2];
console.log(role); // output: ':ARG1'
const subtree = new Tree(target);
console.log(subtree.toPenman());
// (g / go
//     :ARG0 b)
```

Users wanting to interact with graphs might find the `Graph.fromPenman()` and
`graph.toPenman()` methods a good place to start.

```js
import { Graph } from 'penman-js';
const graph = Graph.fromPenman(
  '(w / want-01 :ARG0 (b / boy) :ARG1 (g / go :ARG0 b))',
);
console.log(graph.top);
// 'w'
console.log(graph.triples.length);
// 6
console.log(graph.instances().map((instance) => instance[2]));
// ['want-01', 'boy', 'go']

console.log(graph.toPenman({ top: 'b' }));
// (b / boy
//    :ARG0-of (w / want-01
//                :ARG1 (g / go
//                         :ARG0 b)))
```
