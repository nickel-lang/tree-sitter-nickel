{
  description = "A tree-sitter grammar for Nickel";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs { inherit system; };
        version = "0.2.0";
        tree-sitter-nickel = pkgs.callPackage (nixpkgs + "/pkgs/development/tools/parsing/tree-sitter/grammar.nix") { }
          {
            language = "nickel";
            src = ./.;
            inherit version;
          };
      in
      {
        packages.default = tree-sitter-nickel;

        devShells.default = pkgs.mkShell {
          nativeBuildInputs = with pkgs; [
            nodejs_latest
            tree-sitter
            clang
          ];
          profile = ''
            export npm_config_build_from_source=true
          '';
        };

        checks.default =
          pkgs.stdenv.mkDerivation {
            pname = "tree-sitter-nickel-test";
            inherit version;

            src = self;

            nativeBuildInputs = with pkgs; [
              nodejs_latest
              tree-sitter
              clang
            ];

            buildPhase = ''
              echo 'Running corpus tests'
              HOME=$(mktemp -d) tree-sitter test
            '';

            # Write nothing to the store
            installPhase = "touch $out";
          };
      }
    )
  ;
}
