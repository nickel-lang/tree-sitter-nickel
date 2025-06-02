{
  description = "A tree-sitter grammar for Nickel";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs, ... }@inputs:
    let
      version = "0.4.0";

      # Matches pkgs.tree-sitter
      supportedSystems = [
        "aarch64-darwin"
        "aarch64-linux"
        "i686-linux"
        "x86_64-darwin"
        "x86_64-linux"
      ];

      pkgsFor = nixpkgs.lib.genAttrs supportedSystems (system: import nixpkgs {
        inherit system;
      });

      forAllSystems = fn: nixpkgs.lib.genAttrs supportedSystems (system: fn rec {
        inherit system;
        pkgs = pkgsFor.${system};
        inherit (pkgs) lib;
      });
    in
    {
      overlays = {
        tree-sitter-grammars = final: prev: {
          tree-sitter-grammars = prev.tree-sitter-grammars // {
            tree-sitter-nickel = self.packages.${prev.system}.tree-sitter-nickel;
          };
        };
      };

      packages = forAllSystems ({ system, pkgs, ... }: {
        tree-sitter-nickel = pkgs.callPackage (nixpkgs + "/pkgs/development/tools/parsing/tree-sitter/grammar.nix") { }
          {
            language = "nickel";
            src = ./.;
            inherit version;
          };

        default = self.packages.${system}.tree-sitter-nickel;
      });

      devShells = forAllSystems ({ system, pkgs, ... }: {
        default = pkgs.mkShell {
          inputsFrom = builtins.concatMap builtins.attrValues [
            self.checks.${system}
            self.packages.${system}
          ];
          env = {
            npm_config_build_from_source = true;
          };
        };
      });

      checks = forAllSystems ({ pkgs, ... }: {
        default = pkgs.stdenv.mkDerivation {
          pname = "tree-sitter-nickel-test";
          inherit version;

          src = self;

          nativeBuildInputs = [
            pkgs.nodejs_latest
            pkgs.tree-sitter
            pkgs.clang
          ];

          buildPhase = ''
            echo 'Running corpus tests'
            HOME=$(mktemp -d) tree-sitter test
          '';

          # Write nothing to the store
          installPhase = "touch $out";
        };
      });
    };
}
