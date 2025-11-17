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
