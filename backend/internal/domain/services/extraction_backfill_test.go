package services

import (
	"context"
	"testing"

	"github.com/google/uuid"
)

func TestBackfillCampaignRequiresDB(t *testing.T) {
	svc := &ExtractionBackfillService{DB: nil}
	_, err := svc.BackfillCampaign(context.Background(), uuid.New(), 10)
	if err == nil {
		t.Fatalf("expected error when DB is unavailable")
	}
}
