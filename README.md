# tree-sitter-nickel

[Nickel](https://github.com/tweag/nickel) grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter).

## Overview

Tree sitter is a parser framework for programming language tooling. Tree sitter
enables semantically aware highlighting, indentation, folding, and much more.
This project provides a tree sitter grammar definition for
[Nickel](https://github.com/tweag/nickel).

Every editor has to provide specific queries for its own use. Currently, we
provide example highlighting queries in the style of Neovim.

## With Neovim

The Nickel language has been added to
[nvim-treesitter](https://github.com/nvim-treesitter). Please refer to
`nvim-treesitter`'s installation guide there to get Nickel highlighting out of
the box. Note that while `nvim-treesitter` uses the latest grammar definition
from this repository automatically, the highlighting queries are hosted directly
by `nvim-treesitter`. They were copied at some point in time from this
repository, but they might not always be up to date.

## With Neovim locally

You can use a local version of those queries with Neovim for developing, testing
or customization purpose:

1. Clone this repository
2. Configure tree-sitter to use this grammar:

    ```lua
    local parser_config = require("nvim-treesitter.parsers").get_parser_configs()
    parser_config.nickel = {
      install_info = {
        url = "PATH_TO_WHERE_YOU_CLONED_IT",
        files = {"src/parser.c", "src/scanner.c"},
        branch = "main",
        generate_requires_npm = false,
        requires_generate_from_grammar = false,
      },
    }
    ```

## Hacking

### Structure

- `grammar.js` is the main grammar definition. Most other files are generated
    from `grammar.js` and this is most probably the file you want to modify
    when updating the grammar
- `src/scanner.c` contains a custom scanner required by the Nickel grammar
- `src/*` most other files in `src` are auto-generated and shouldn't be modified
    directly
- `corpus/` contains a test suite

### Requirements

The project comes with a `shell.nix` containing everything needed to work on the
grammar itself via [Nix](https://nixos.org/). Just run `nix-shell` at the root
of this repository to be dropped in a shell with all the needed commands
available.

Without Nix, you have to install `tree-sitter` and other dependencies manually.
You should be able to deduce a list of requirements easily by reading
`shell.nix`.

### Actions

- `tree-sitter generate` will build the grammar from the current definition
- `tree-sitter test` tests the built grammar against corpus
- `tree-sitter parse <FILE>` parses the given file.
- `tree-sitter highlight <FILE>` tests highlighting of the given file

## Bindings

As with other tree-sitter grammars, this repository comes with Node and Rust
bindings. These will eventually be uploaded to `crates.io` for use with cargo
and npm.
