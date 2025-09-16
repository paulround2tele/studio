package services

import (
	"context"
	"os"
	"testing"

	"github.com/google/uuid"
)

// Since current BackfillCampaign only fully persists with *pgx.Conn, we at least test flag gating path.
func TestBackfillCampaignFlagDisabled(t *testing.T) {
	os.Unsetenv("EXTRACTION_FEATURE_TABLE_ENABLED")
	svc := &ExtractionBackfillService{DB: nil}
	count, err := svc.BackfillCampaign(context.Background(), uuid.New(), 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if count != 0 {
		t.Fatalf("expected 0 when flag disabled, got %d", count)
	}
}
