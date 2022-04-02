{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {

  nativeBuildInputs = with pkgs; [
    tree-sitter
    nodejs # tree-sitter generate
    graphviz # tree-sitter test --debug-graph && xdg-open log.html

    clang-tools # C language server
  ];

  buildInputs = with pkgs; [
  ];

}
