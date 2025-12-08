package services

import (
	"context"
	"database/sql"
	"math"
	"regexp"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
)

type stubAggregatesRepo struct {
	db *sql.DB
}

func (s stubAggregatesRepo) DB() *sql.DB {
	return s.db
}

func TestGetCampaignStatusReturnsPhaseData(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	repo := stubAggregatesRepo{db: db}
	cache := NewAggregatesCache()

	campaignID := uuid.New()

	startedGeneration := time.Now().Add(-2 * time.Hour).UTC()
	completedGeneration := startedGeneration.Add(30 * time.Minute)
	startedDNS := time.Now().Add(-90 * time.Minute).UTC()
	completedDNS := startedDNS.Add(20 * time.Minute)
	startedHTTP := time.Now().Add(-60 * time.Minute).UTC()

	query := `SELECT phase_type, phase_order, status, progress_percentage, started_at, completed_at, failed_at, error_message
	               FROM campaign_phases
	               WHERE campaign_id = $1
	               ORDER BY phase_order ASC`

	rows := sqlmock.NewRows([]string{"phase_type", "phase_order", "status", "progress_percentage", "started_at", "completed_at", "failed_at", "error_message"}).
		AddRow("domain_generation", 1, "completed", 100.0, startedGeneration, completedGeneration, nil, nil).
		AddRow("dns_validation", 2, "completed", 100.0, startedDNS, completedDNS, nil, nil).
		AddRow("http_keyword_validation", 3, "in_progress", 75.0, startedHTTP, nil, nil, nil).
		AddRow("enrichment", 4, "configured", nil, nil, nil, nil, nil)

	mock.ExpectQuery(regexp.QuoteMeta(query)).
		WithArgs(campaignID).
		WillReturnRows(rows)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT error_message FROM lead_generation_campaigns WHERE id = $1`)).
		WithArgs(campaignID).
		WillReturnRows(sqlmock.NewRows([]string{"error_message"}).AddRow(nil))

	dto, err := GetCampaignStatus(context.Background(), repo, cache, campaignID)
	if err != nil {
		t.Fatalf("GetCampaignStatus returned error: %v", err)
	}

	if len(dto.Phases) < 5 {
		t.Fatalf("expected at least 5 phases, got %d", len(dto.Phases))
	}

	ph := make(map[string]PhaseStatusItem, len(dto.Phases))
	for _, phase := range dto.Phases {
		ph[phase.Phase] = phase
	}

	if phase, ok := ph["domain_generation"]; !ok {
		t.Fatalf("expected domain_generation phase to be present")
	} else {
		if phase.Status != "completed" {
			t.Fatalf("expected domain_generation status completed, got %s", phase.Status)
		}
		if phase.ProgressPercentage != 100 {
			t.Fatalf("expected domain_generation progress 100, got %f", phase.ProgressPercentage)
		}
		if phase.StartedAt == nil || phase.CompletedAt == nil {
			t.Fatalf("expected timestamps for domain_generation phase")
		}
	}

	if phase, ok := ph["http_keyword_validation"]; !ok {
		t.Fatalf("expected http_keyword_validation phase to be present")
	} else {
		if phase.Status != "in_progress" {
			t.Fatalf("expected http phase in_progress, got %s", phase.Status)
		}
		if math.Abs(phase.ProgressPercentage-75.0) > 0.001 {
			t.Fatalf("expected http phase progress 75, got %f", phase.ProgressPercentage)
		}
	}

	if phase, ok := ph["enrichment"]; !ok {
		t.Fatalf("expected enrichment phase to be present")
	} else {
		if phase.Status != "configured" {
			t.Fatalf("expected enrichment status configured, got %s", phase.Status)
		}
		if phase.ProgressPercentage != 0 {
			t.Fatalf("expected enrichment progress 0, got %f", phase.ProgressPercentage)
		}
	}

	if math.Abs(dto.OverallProgressPercentage-55.0) > 0.001 {
		t.Fatalf("expected overall progress ~55, got %f", dto.OverallProgressPercentage)
	}

	// Second call should hit cache and not query again.
	if _, err := GetCampaignStatus(context.Background(), repo, cache, campaignID); err != nil {
		t.Fatalf("second GetCampaignStatus returned error: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

func TestGetCampaignStatusDefaultsWhenNoRows(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	repo := stubAggregatesRepo{db: db}
	cache := NewAggregatesCache()

	campaignID := uuid.New()

	query := `SELECT phase_type, phase_order, status, progress_percentage, started_at, completed_at, failed_at, error_message
	               FROM campaign_phases
	               WHERE campaign_id = $1
	               ORDER BY phase_order ASC`

	rows := sqlmock.NewRows([]string{"phase_type", "phase_order", "status", "progress_percentage", "started_at", "completed_at", "failed_at", "error_message"})

	mock.ExpectQuery(regexp.QuoteMeta(query)).
		WithArgs(campaignID).
		WillReturnRows(rows)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT error_message FROM lead_generation_campaigns WHERE id = $1`)).
		WithArgs(campaignID).
		WillReturnRows(sqlmock.NewRows([]string{"error_message"}).AddRow(nil))

	dto, err := GetCampaignStatus(context.Background(), repo, cache, campaignID)
	if err != nil {
		t.Fatalf("GetCampaignStatus returned error: %v", err)
	}

	if len(dto.Phases) < 5 {
		t.Fatalf("expected default phases to be returned, got %d", len(dto.Phases))
	}

	for _, phase := range dto.Phases {
		if phase.Status != "not_started" {
			t.Fatalf("expected default phase status not_started, got %s", phase.Status)
		}
		if phase.ProgressPercentage != 0 {
			t.Fatalf("expected default phase progress 0, got %f", phase.ProgressPercentage)
		}
		if phase.StartedAt != nil || phase.CompletedAt != nil {
			t.Fatalf("expected no timestamps for default phase, got %+v", phase)
		}
	}

	if dto.OverallProgressPercentage != 0 {
		t.Fatalf("expected overall progress 0, got %f", dto.OverallProgressPercentage)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}
