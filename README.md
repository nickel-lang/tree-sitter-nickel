# tree-sitter-nickel
[Nickel](https://github.com/tweag/nickel) grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter).

# Overview
Tree sitter is a parser framework for use in development tools. In particular
it enable semantically aware highlighting, indentation, folding, etc. This
project provides such a grammar for [Nickel](https://github.com/tweag/nickel).

Every editor has to provide specific queries for its own use. Currently, we
provide example highlighting queries in the style of Neovim.

## Neovim
To use these queries with neovim, it is best to clone this repository locally.
From there, one can can configure tree-sitter to use this grammar using the
following example configuration.
```lua
local parser_config = require("nvim-treesitter.parsers").get_parser_configs()
parser_config.nickel = {
  install_info = {
    url = "PATH_TO_WHERE_YOU_CLONED_IT",
    files = {"src/parser.c", "src/scanner.cc"},
    branch = "main",
    generate_requires_npm = false,
    requires_generate_from_grammar = false,
  },
}
```
However, keep in mind these queries will eventually be upstreamed to the neovim
tree-sitter repository, so the above should probably only be done during
development of the grammar.

## Structure
`grammar.js` is the main grammar file of this project, with a custom scanner in
`src/scanner.cc`. The `corpus/` directory contains a multitude of tests.

Building the new grammar is done with `tree-sitter generate`.
Testing against the corpus is done with `tree-sitter test`. Finally, parsing a
specified file is done with `tree-sitter parse FILENAME`, and testing highlight
queries is done with `tree-sitter highlight FILENAME`.

# `shell.nix`
The project comes with a `shell.nix` containing everything needed to work on
the grammar itself.

# Node and Rust bindings
As with other tree-sitter grammars, this repository comes with Node and Rust
bindings. These will eventually be uploaded to crates.io for use with cargo,
and npm.
