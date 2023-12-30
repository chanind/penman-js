---
slug: /
---

# Penman JS

[![ci](https://img.shields.io/github/actions/workflow/status/chanind/penman-js/ci.yaml?branch=main)](https://github.com/chanind/penman-js)
[![Npm](https://img.shields.io/npm/v/penman-js)](https://www.npmjs.com/package/penman-js)

Abstract Meaning Representation (AMR) parser and generator for JavaScript.

## About

This library is a manual port of the [Penman Python library](https://github.com/goodmami/penman), with similar method names and import structure. All functionality available in the original library should also be available in this library, with similar usage and semantics. The Python library should still be considered the main project for new features.

The goal of this project is to bring the power of the Penman Python library's AMR parsing and generation to the browser and Node.js. This project does not provide a CLI interface for manipulating AMR, since the Python library already provides the functionality.

### AMR

Abstract meaning representation (AMR) captures the meaning of English sentences in a single rooted, directed graph. AMR incorporates [PropBank](https://propbank.github.io/) semantic roles, and can represent a number of linguistic phenomema including coreference, negation, quantity, modality, questions, and many more. AMR is typically written in PENMAN notation, giving this library its name.

AMR for the sentence "He drives carelessly" is shown below:

```
(d / drive-01
   :ARG0 (h / he)
   :manner (c / care-04
              :polarity -))
```

To learn more about AMR, check out the [AMR project website](http://amr.isi.edu/). To learn more about PENMAN notation and how it's parsed in this library, visit the [Penman Python docs](https://penman.readthedocs.io/en/latest/notation.html).

## Disclaimer

This project is not officially affiliated with [AMR](http://amr.isi.edu/) or the [Penman Python library](https://github.com/goodmami/penman).

## Acknowledgements

This library is a manual port of the Penman Python library, and as such, all credit for the original code goes to [github.com/goodmami/penman](https://github.com/goodmami/penman).
