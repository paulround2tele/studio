package services

import (
	"context"
	"os"
	"testing"

	"github.com/fntelecomllc/studio/backend/internal/featureflags"
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

func TestDualReadEnabledGating(t *testing.T) {
	// Test that the flag is properly read through the centralized function
	os.Setenv("ANALYSIS_DUAL_READ", "true")
	defer os.Unsetenv("ANALYSIS_DUAL_READ")
	
	if !featureflags.IsAnalysisDualReadEnabled() {
		t.Fatalf("expected dual read to be enabled when env var is true")
	}
	
	// Test variance threshold
	os.Setenv("DUAL_READ_VARIANCE_THRESHOLD", "0.5")
	defer os.Unsetenv("DUAL_READ_VARIANCE_THRESHOLD")
	
	threshold := featureflags.GetDualReadVarianceThreshold()
	if threshold != 0.5 {
		t.Fatalf("expected variance threshold to be 0.5, got %f", threshold)
	}
}
