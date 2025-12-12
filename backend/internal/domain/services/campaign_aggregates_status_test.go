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

	query := `SELECT 
		COALESCE(cp.phase_type::text, pe.phase_type::text) AS phase_type,
		COALESCE(cp.phase_order, 0) AS phase_order,
		COALESCE(pe.status::text, cp.status::text) AS status,
		COALESCE(pe.progress_percentage, cp.progress_percentage) AS progress_percentage,
		COALESCE(pe.started_at, cp.started_at) AS started_at,
		COALESCE(pe.completed_at, cp.completed_at) AS completed_at,
		COALESCE(pe.failed_at, cp.failed_at) AS failed_at,
		pe.error_details->>'message' AS error_message,
		pe.error_details
	   FROM campaign_phases cp
	   FULL OUTER JOIN phase_executions pe ON pe.campaign_id = cp.campaign_id AND pe.phase_type = cp.phase_type
	   WHERE COALESCE(cp.campaign_id, pe.campaign_id) = $1
	   ORDER BY COALESCE(cp.phase_order, 0) ASC`

	rows := sqlmock.NewRows([]string{"phase_type", "phase_order", "status", "progress_percentage", "started_at", "completed_at", "failed_at", "error_message", "error_details"}).
		AddRow("domain_generation", 1, "completed", 100.0, startedGeneration, completedGeneration, nil, nil, nil).
		AddRow("dns_validation", 2, "completed", 100.0, startedDNS, completedDNS, nil, nil, nil).
		AddRow("http_keyword_validation", 3, "in_progress", 75.0, startedHTTP, nil, nil, nil, nil).
		AddRow("extraction", 4, "configured", 0.0, nil, nil, nil, nil, nil).
		AddRow("analysis", 5, "configured", nil, nil, nil, nil, nil, nil).
		AddRow("enrichment", 6, "configured", nil, nil, nil, nil, nil, nil)

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

	if len(dto.Phases) < 6 {
		t.Fatalf("expected at least 6 phases, got %d", len(dto.Phases))
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

	if phase, ok := ph["extraction"]; !ok {
		t.Fatalf("expected extraction phase to be present")
	} else {
		if phase.Status != "configured" {
			t.Fatalf("expected extraction status configured, got %s", phase.Status)
		}
		if phase.ProgressPercentage != 0 {
			t.Fatalf("expected extraction progress 0, got %f", phase.ProgressPercentage)
		}
	}

	if phase, ok := ph["analysis"]; !ok {
		t.Fatalf("expected analysis phase to be present")
	} else {
		if phase.Status != "configured" {
			t.Fatalf("expected analysis status configured, got %s", phase.Status)
		}
		if phase.ProgressPercentage != 0 {
			t.Fatalf("expected analysis progress 0, got %f", phase.ProgressPercentage)
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

	if math.Abs(dto.OverallProgressPercentage-45.8333333333) > 0.001 {
		t.Fatalf("expected overall progress ~45.83, got %f", dto.OverallProgressPercentage)
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

	query := `SELECT 
		COALESCE(cp.phase_type::text, pe.phase_type::text) AS phase_type,
		COALESCE(cp.phase_order, 0) AS phase_order,
		COALESCE(pe.status::text, cp.status::text) AS status,
		COALESCE(pe.progress_percentage, cp.progress_percentage) AS progress_percentage,
		COALESCE(pe.started_at, cp.started_at) AS started_at,
		COALESCE(pe.completed_at, cp.completed_at) AS completed_at,
		COALESCE(pe.failed_at, cp.failed_at) AS failed_at,
		pe.error_details->>'message' AS error_message,
		pe.error_details
	   FROM campaign_phases cp
	   FULL OUTER JOIN phase_executions pe ON pe.campaign_id = cp.campaign_id AND pe.phase_type = cp.phase_type
	   WHERE COALESCE(cp.campaign_id, pe.campaign_id) = $1
	   ORDER BY COALESCE(cp.phase_order, 0) ASC`

	rows := sqlmock.NewRows([]string{"phase_type", "phase_order", "status", "progress_percentage", "started_at", "completed_at", "failed_at", "error_message", "error_details"})

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

	if len(dto.Phases) < 6 {
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

func TestGetCampaignStatusIncludesErrorDetails(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	repo := stubAggregatesRepo{db: db}
	cache := NewAggregatesCache()

	campaignID := uuid.New()

	failedAt := time.Now().Add(-10 * time.Minute).UTC()
	errorDetailsJSON := []byte(`{"code":"TIMEOUT","message":"DNS resolver timeout","context":{"timeout_ms":5000,"resolver":"8.8.8.8"}}`)

	query := `SELECT 
		COALESCE(cp.phase_type::text, pe.phase_type::text) AS phase_type,
		COALESCE(cp.phase_order, 0) AS phase_order,
		COALESCE(pe.status::text, cp.status::text) AS status,
		COALESCE(pe.progress_percentage, cp.progress_percentage) AS progress_percentage,
		COALESCE(pe.started_at, cp.started_at) AS started_at,
		COALESCE(pe.completed_at, cp.completed_at) AS completed_at,
		COALESCE(pe.failed_at, cp.failed_at) AS failed_at,
		pe.error_details->>'message' AS error_message,
		pe.error_details
	   FROM campaign_phases cp
	   FULL OUTER JOIN phase_executions pe ON pe.campaign_id = cp.campaign_id AND pe.phase_type = cp.phase_type
	   WHERE COALESCE(cp.campaign_id, pe.campaign_id) = $1
	   ORDER BY COALESCE(cp.phase_order, 0) ASC`

	rows := sqlmock.NewRows([]string{"phase_type", "phase_order", "status", "progress_percentage", "started_at", "completed_at", "failed_at", "error_message", "error_details"}).
		AddRow("dns_validation", 2, "failed", 45.0, time.Now().Add(-30*time.Minute), nil, failedAt, "DNS resolver timeout", errorDetailsJSON)

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

	var dnsPhase *PhaseStatusItem
	for i, phase := range dto.Phases {
		if phase.Phase == "dns_validation" {
			dnsPhase = &dto.Phases[i]
			break
		}
	}

	if dnsPhase == nil {
		t.Fatalf("expected dns_validation phase to be present")
	}

	if dnsPhase.Status != "failed" {
		t.Fatalf("expected dns phase status failed, got %s", dnsPhase.Status)
	}

	if dnsPhase.ErrorMessage == nil || *dnsPhase.ErrorMessage != "DNS resolver timeout" {
		t.Fatalf("expected error message to be present")
	}

	if dnsPhase.ErrorDetails == nil {
		t.Fatalf("expected errorDetails to be present")
	}

	if code, ok := dnsPhase.ErrorDetails["code"].(string); !ok || code != "TIMEOUT" {
		t.Fatalf("expected errorDetails.code to be TIMEOUT, got %v", dnsPhase.ErrorDetails["code"])
	}

	if msg, ok := dnsPhase.ErrorDetails["message"].(string); !ok || msg != "DNS resolver timeout" {
		t.Fatalf("expected errorDetails.message to be 'DNS resolver timeout', got %v", dnsPhase.ErrorDetails["message"])
	}

	if context, ok := dnsPhase.ErrorDetails["context"].(map[string]interface{}); !ok {
		t.Fatalf("expected errorDetails.context to be present")
	} else {
		if timeout, ok := context["timeout_ms"].(float64); !ok || timeout != 5000 {
			t.Fatalf("expected errorDetails.context.timeout_ms to be 5000, got %v", context["timeout_ms"])
		}
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}
