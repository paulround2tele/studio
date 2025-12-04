package extraction

import (
	"context"
	"testing"
	"time"
)

func TestReconcileRequiresConnection(t *testing.T) {
	_, err := ReconcileStuckBuilding(context.Background(), nil, ReconcileOptions{OlderThan: time.Minute})
	if err == nil {
		t.Fatalf("expected error when connection is nil")
	}
}
