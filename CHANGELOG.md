## [2.0.2](https://github.com/chanind/penman-js/compare/v2.0.1...v2.0.2) (2024-01-02)


### Bug Fixes

* add author field to package.json ([1b94a6c](https://github.com/chanind/penman-js/commit/1b94a6c621e690e3bd8ddcb5aaabfd7d9b007074))

## [2.0.1](https://github.com/chanind/penman-js/compare/v2.0.0...v2.0.1) (2024-01-01)


### Bug Fixes

* stricter type checking ([ca276d8](https://github.com/chanind/penman-js/commit/ca276d89be32ce4dcf7cff0f937d433006893f70))

# [2.0.0](https://github.com/chanind/penman-js/compare/v1.0.2...v2.0.0) (2024-01-01)


* making API more javascripty (#2) ([cc75de2](https://github.com/chanind/penman-js/commit/cc75de27efee6afbb0566040ea9d87f5c5f1c0b4)), closes [#2](https://github.com/chanind/penman-js/issues/2)


### BREAKING CHANGES

* This PR removes all submodules, and instead exports everything only from the main index.ts entry point
* This PR replaces any functions that have multiple optional parameters with an optional options object instead, to avoid needing to pass undefined for unused function arguments
* This PR renames all constant module functions and exports by adding the word Constant to their names

## [1.0.2](https://github.com/chanind/penman-js/compare/v1.0.1...v1.0.2) (2023-12-26)


### Bug Fixes

* cleaning up deps ([aef5378](https://github.com/chanind/penman-js/commit/aef53786e2b1b1a6eab5e1598d212c37829c0c3e))

## [1.0.1](https://github.com/chanind/penman-js/compare/v1.0.0...v1.0.1) (2023-12-24)


### Bug Fixes

* bump ([d6c69b1](https://github.com/chanind/penman-js/commit/d6c69b1608ad923d3eab68d7a489e6305384ce64))

# 1.0.0 (2023-12-24)


### Bug Fixes

* updating readme and keywords and setting up semantic release ([ed243de](https://github.com/chanind/penman-js/commit/ed243def07d60abe09cc8e493e2378bc1bb8c1c2))
