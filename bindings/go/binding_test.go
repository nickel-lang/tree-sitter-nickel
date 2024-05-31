package tree_sitter_nickel_test

import (
	"testing"

	tree_sitter "github.com/smacker/go-tree-sitter"
	"github.com/tree-sitter/tree-sitter-nickel"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_nickel.Language())
	if language == nil {
		t.Errorf("Error loading Nickel grammar")
	}
}
