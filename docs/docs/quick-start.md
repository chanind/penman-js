---
sidebar_position: 2
---

# Quick start

## Installation

Install the library from NPM

```
npm install penman-js
```

## Basic usage

The `decode` function make it easy to parse AMR text in Penman notation into a graph. The `encode` function can likewise turn it back into a string.

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
