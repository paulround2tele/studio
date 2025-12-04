package services

import (
	"context"
	"reflect"
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

type noopHTTPLogger struct{}

func (l *noopHTTPLogger) Debug(ctx context.Context, msg string, f map[string]interface{}) {}
func (l *noopHTTPLogger) Info(ctx context.Context, msg string, f map[string]interface{})  {}
func (l *noopHTTPLogger) Warn(ctx context.Context, msg string, f map[string]interface{})  {}
func (l *noopHTTPLogger) Error(ctx context.Context, msg string, err error, f map[string]interface{}) {
}

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

func TestHTTPValidationValidateAcceptsKeywordSetOnly(t *testing.T) {
	svc := &httpValidationService{deps: Dependencies{Logger: &noopHTTPLogger{}}}
	cfg := &models.HTTPPhaseConfigRequest{
		PersonaIDs:    []string{"persona-1"},
		KeywordSetIDs: []string{uuid.New().String()},
	}
	if err := svc.Validate(context.Background(), cfg); err != nil {
		t.Fatalf("expected keyword-set-only config to be valid, got %v", err)
	}
}

func TestCoalesceKeywordSources(t *testing.T) {
	explicit := uuid.New().String()
	legacy := uuid.New().String()
	cfg := &models.HTTPPhaseConfigRequest{
		KeywordSetIDs: []string{explicit, explicit},
		Keywords:      []string{"alpha", legacy, "", "beta"},
	}
	sets, inline := coalesceKeywordSources(cfg)
	expectedSets := []string{explicit, legacy}
	if !reflect.DeepEqual(sets, expectedSets) {
		t.Fatalf("unexpected keyword set IDs: got %v want %v", sets, expectedSets)
	}
	expectedInline := []string{"alpha", "beta"}
	if !reflect.DeepEqual(inline, expectedInline) {
		t.Fatalf("unexpected inline keywords: got %v want %v", inline, expectedInline)
	}
}
