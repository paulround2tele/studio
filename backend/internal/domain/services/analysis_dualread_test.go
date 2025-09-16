package services

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
)

// minimal fake to satisfy Dependencies for dualReadFetchFeatures call; we only need DB nil path
func TestDualReadDisabledGating(t *testing.T) {
	os.Unsetenv("ANALYSIS_DUAL_READ")
	s := &analysisService{}
	feats, err := s.dualReadFetchFeatures(context.Background(), uuid.New())
	if err != nil {
		t.Fatalf("expected nil err when dual read disabled, got %v", err)
	}
	if feats != nil {
		t.Fatalf("expected nil features when disabled")
	}
}
