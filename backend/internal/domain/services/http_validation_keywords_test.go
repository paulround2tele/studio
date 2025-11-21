package services

import (
	"reflect"
	"testing"

	"github.com/google/uuid"
)

func TestPartitionKeywordInputs(t *testing.T) {
	setID := uuid.New().String()
	inputs := []string{"  telecom  ", setID, "voice", "", "   ", "data"}

	sets, inline := partitionKeywordInputs(inputs)

	if len(sets) != 1 || sets[0] != setID {
		t.Fatalf("expected set IDs [%s], got %v", setID, sets)
	}

	expectedInline := []string{"telecom", "voice", "data"}
	if !reflect.DeepEqual(inline, expectedInline) {
		t.Fatalf("unexpected inline keywords: got %v want %v", inline, expectedInline)
	}
}

func TestTopKeywordsFromCounts(t *testing.T) {
	counts := map[string]int{
		"telecom": 5,
		"voip":    5,
		"pbx":     2,
		"fiber":   0,
		"":        3,
	}
	got := topKeywordsFromCounts(counts, 3)
	want := []string{"telecom", "voip", "pbx"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("top keywords mismatch: got %v want %v", got, want)
	}
	if v := topKeywordsFromCounts(nil, 2); v != nil {
		t.Fatalf("expected nil for nil counts, got %v", v)
	}
	if v := topKeywordsFromCounts(map[string]int{"one": 1}, 0); v != nil {
		t.Fatalf("expected nil for zero limit, got %v", v)
	}
}
