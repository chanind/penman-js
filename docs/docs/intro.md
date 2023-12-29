---
sidebar_position: 1
slug: /
---

# Penman JS

[![ci](https://img.shields.io/github/actions/workflow/status/chanind/penman-js/ci.yaml?branch=main)](https://github.com/chanind/penman-js)
[![Npm](https://img.shields.io/npm/v/penman-js)](https://www.npmjs.com/package/penman-js)

PENMAN notation (e.g. AMR) parser and generator for JavaScript

## About

This library is a manual port of the Penman Python library, with identical method names and import structure. However, as Python and Javascript do have some differences, this port has the following changes:

- all snake-case function names from the Python library are renamed using camel-case to fit Javascript naming conventions. For example, the function `get_pushed_variable` from Python is renamed to `getPushedVariable` in Javascript.
- Python tuples are replaced with Javascript arrays
- Python dictionaries are replaced with Javascript `Map`
- functions only support positional arguments, since Javascript doesn't support keyword arguments like Python
- All imports use `penman-js` as the base instead of `penman`. For instance, `from penman.graph import Graph` in Python is replaced with `import { Graph } from "penman-js/graph";` in Javascript.

Otherwise, refer to the [Penman Python library docs](https://penman.readthedocs.io/en/latest/index.html) for full documentation.

## Disclaimer

This project is not officially affiliated with [AMR](http://amr.isi.edu/) or the [Penman Python library](https://github.com/goodmami/penman).
