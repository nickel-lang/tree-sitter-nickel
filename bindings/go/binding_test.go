package tree_sitter_nickel_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_nickel "github.com/nickel-lang/tree-sitter-nickel/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_nickel.Language())
	if language == nil {
		t.Errorf("Error loading Nickel grammar")
	}
}
