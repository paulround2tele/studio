package config

import (
	"os"
	"path/filepath"
	"testing"
)

func TestSaveAndLoadKeywordSets(t *testing.T) {
	dir := t.TempDir()

	sets := []KeywordSet{
		{
			ID:          "set-1",
			Name:        "Test Set",
			Description: "A test keyword set",
			Rules: []KeywordRule{
				{ID: "r1", Pattern: "login", Type: "string", CaseSensitive: false, Category: "auth"},
				{ID: "r2", Pattern: "^secret\\d+$", Type: "regex", CaseSensitive: false, Category: "sensitive"},
			},
		},
	}

	if err := SaveKeywordSets(dir, sets); err != nil {
		t.Fatalf("SaveKeywordSets failed: %v", err)
	}

	// Ensure file exists
	cfgPath := filepath.Join(dir, keywordsConfigFilename)
	if _, err := os.Stat(cfgPath); err != nil {
		t.Fatalf("saved file missing: %v", err)
	}

	loaded, err := LoadKeywordSets(dir)
	if err != nil {
		t.Fatalf("LoadKeywordSets failed: %v", err)
	}
	if len(loaded) != 1 {
		t.Fatalf("expected 1 set, got %d", len(loaded))
	}
	if loaded[0].ID != sets[0].ID || loaded[0].Name != sets[0].Name {
		t.Fatalf("loaded set mismatch: %+v vs %+v", loaded[0], sets[0])
	}
	if len(loaded[0].Rules) != 2 {
		t.Fatalf("expected 2 rules, got %d", len(loaded[0].Rules))
	}
}

func TestSaveKeywordSets_InvalidRegex(t *testing.T) {
	dir := t.TempDir()
	sets := []KeywordSet{
		{ID: "bad", Name: "Bad Set", Rules: []KeywordRule{{ID: "r1", Pattern: "(", Type: "regex"}}},
	}
	if err := SaveKeywordSets(dir, sets); err == nil {
		t.Fatalf("expected error for invalid regex, got nil")
	}
}
