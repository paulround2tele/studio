package extraction

import (
	"context"
	"os"
	"testing"
	"time"
)

// NOTE: Without a live pgx.Conn this test only exercises flag gating path.
func TestReconcileFlagDisabled(t *testing.T) {
	os.Unsetenv("EXTRACTION_FEATURE_TABLE_ENABLED")
	cnt, err := ReconcileStuckBuilding(context.Background(), nil, ReconcileOptions{OlderThan: time.Minute})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if cnt != 0 {
		t.Fatalf("expected 0 updates when flag disabled")
	}
}
