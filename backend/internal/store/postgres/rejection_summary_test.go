package postgres

import (
	"context"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// P0-4: Test rejection summary - balanced case with all reasons counted
func TestGetRejectionSummary_BalancedCase(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}
	campaignID := uuid.New()

	// Mock a balanced scenario: 10 qualified, 5 low_score, 3 no_keywords, 2 parked, 
	// 1 dns_error, 1 dns_timeout, 1 http_error, 1 http_timeout, 2 pending, 0 null
	// analyzed = 10 + 5 + 3 + 2 + 1 + 1 + 1 + 1 = 24
	// rejected = 5 + 3 + 2 + 4 = 14
	// qualified = 10
	// 24 == 10 + 14 → balanced
	mock.ExpectQuery(`SELECT.*FROM generated_domains.*WHERE campaign_id`).
		WithArgs(campaignID).
		WillReturnRows(sqlmock.NewRows([]string{
			"qualified", "low_score", "no_keywords", "parked",
			"dns_error", "dns_timeout", "http_error", "http_timeout", "pending", "null_count",
		}).AddRow(10, 5, 3, 2, 1, 1, 1, 1, 2, 0))

	summary, err := s.GetRejectionSummary(context.Background(), nil, campaignID)
	if err != nil {
		t.Fatalf("GetRejectionSummary: %v", err)
	}

	// Verify counts
	if summary.Counts.Qualified != 10 {
		t.Errorf("expected 10 qualified, got %d", summary.Counts.Qualified)
	}
	if summary.Counts.LowScore != 5 {
		t.Errorf("expected 5 low_score, got %d", summary.Counts.LowScore)
	}
	if summary.Counts.NoKeywords != 3 {
		t.Errorf("expected 3 no_keywords, got %d", summary.Counts.NoKeywords)
	}
	if summary.Counts.Parked != 2 {
		t.Errorf("expected 2 parked, got %d", summary.Counts.Parked)
	}
	if summary.Counts.DNSError != 1 {
		t.Errorf("expected 1 dns_error, got %d", summary.Counts.DNSError)
	}
	if summary.Counts.DNSTimeout != 1 {
		t.Errorf("expected 1 dns_timeout, got %d", summary.Counts.DNSTimeout)
	}
	if summary.Counts.HTTPError != 1 {
		t.Errorf("expected 1 http_error, got %d", summary.Counts.HTTPError)
	}
	if summary.Counts.HTTPTimeout != 1 {
		t.Errorf("expected 1 http_timeout, got %d", summary.Counts.HTTPTimeout)
	}
	if summary.Counts.Pending != 2 {
		t.Errorf("expected 2 pending, got %d", summary.Counts.Pending)
	}

	// Verify totals
	if summary.Totals.Analyzed != 24 {
		t.Errorf("expected 24 analyzed, got %d", summary.Totals.Analyzed)
	}
	if summary.Totals.Qualified != 10 {
		t.Errorf("expected 10 totals.qualified, got %d", summary.Totals.Qualified)
	}
	if summary.Totals.Errors != 4 {
		t.Errorf("expected 4 errors (1+1+1+1), got %d", summary.Totals.Errors)
	}
	if summary.Totals.Rejected != 14 {
		t.Errorf("expected 14 rejected (5+3+2+4), got %d", summary.Totals.Rejected)
	}

	// Verify balanced
	if !summary.Balanced {
		t.Errorf("expected balanced=true, got %v", summary.Balanced)
	}
	if summary.AuditNote != nil {
		t.Errorf("expected no audit note for balanced case, got %s", *summary.AuditNote)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

// P0-4: Test rejection summary - unbalanced case with NULL rejection_reasons
func TestGetRejectionSummary_UnbalancedWithNulls(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}
	campaignID := uuid.New()

	// Mock scenario with 5 NULL rejection_reasons - should be unbalanced
	mock.ExpectQuery(`SELECT.*FROM generated_domains.*WHERE campaign_id`).
		WithArgs(campaignID).
		WillReturnRows(sqlmock.NewRows([]string{
			"qualified", "low_score", "no_keywords", "parked",
			"dns_error", "dns_timeout", "http_error", "http_timeout", "pending", "null_count",
		}).AddRow(10, 5, 0, 0, 0, 0, 0, 0, 0, 5))

	summary, err := s.GetRejectionSummary(context.Background(), nil, campaignID)
	if err != nil {
		t.Fatalf("GetRejectionSummary: %v", err)
	}

	// Should be unbalanced due to NULL values
	if summary.Balanced {
		t.Errorf("expected balanced=false due to NULL values, got %v", summary.Balanced)
	}
	if summary.AuditNote == nil {
		t.Errorf("expected audit note for NULL values")
	} else if *summary.AuditNote != "Warning: 5 domains have NULL rejection_reason (awaiting classification)" {
		t.Errorf("unexpected audit note: %s", *summary.AuditNote)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

// P0-4: Test each rejection reason is counted independently
func TestGetRejectionSummary_EachReasonCounted(t *testing.T) {
	testCases := []struct {
		name       string
		columnName string
		expected   int64
	}{
		{"qualified_only", "qualified", 100},
		{"low_score_only", "low_score", 50},
		{"no_keywords_only", "no_keywords", 25},
		{"parked_only", "parked", 10},
		{"dns_error_only", "dns_error", 5},
		{"dns_timeout_only", "dns_timeout", 3},
		{"http_error_only", "http_error", 8},
		{"http_timeout_only", "http_timeout", 2},
		{"pending_only", "pending", 15},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			db, mock, err := sqlmock.New()
			if err != nil {
				t.Fatalf("sqlmock.New: %v", err)
			}
			defer db.Close()

			sqlxDB := sqlx.NewDb(db, "postgres")
			s := &campaignStorePostgres{db: sqlxDB}
			campaignID := uuid.New()

			// Build row with only the specific column having the value
			values := map[string]int64{
				"qualified":    0,
				"low_score":    0,
				"no_keywords":  0,
				"parked":       0,
				"dns_error":    0,
				"dns_timeout":  0,
				"http_error":   0,
				"http_timeout": 0,
				"pending":      0,
				"null_count":   0,
			}
			values[tc.columnName] = tc.expected

			mock.ExpectQuery(`SELECT.*FROM generated_domains.*WHERE campaign_id`).
				WithArgs(campaignID).
				WillReturnRows(sqlmock.NewRows([]string{
					"qualified", "low_score", "no_keywords", "parked",
					"dns_error", "dns_timeout", "http_error", "http_timeout", "pending", "null_count",
				}).AddRow(
					values["qualified"], values["low_score"], values["no_keywords"], values["parked"],
					values["dns_error"], values["dns_timeout"], values["http_error"], values["http_timeout"],
					values["pending"], values["null_count"],
				))

			summary, err := s.GetRejectionSummary(context.Background(), nil, campaignID)
			if err != nil {
				t.Fatalf("GetRejectionSummary: %v", err)
			}

			// Verify the specific count
			var actual int64
			switch tc.columnName {
			case "qualified":
				actual = summary.Counts.Qualified
			case "low_score":
				actual = summary.Counts.LowScore
			case "no_keywords":
				actual = summary.Counts.NoKeywords
			case "parked":
				actual = summary.Counts.Parked
			case "dns_error":
				actual = summary.Counts.DNSError
			case "dns_timeout":
				actual = summary.Counts.DNSTimeout
			case "http_error":
				actual = summary.Counts.HTTPError
			case "http_timeout":
				actual = summary.Counts.HTTPTimeout
			case "pending":
				actual = summary.Counts.Pending
			}

			if actual != tc.expected {
				t.Errorf("expected %s=%d, got %d", tc.columnName, tc.expected, actual)
			}

			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("sql expectations: %v", err)
			}
		})
	}
}

// P0-4: Test empty campaign returns all zeros and balanced
func TestGetRejectionSummary_EmptyCampaign(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}
	campaignID := uuid.New()

	// Mock empty campaign - all zeros
	mock.ExpectQuery(`SELECT.*FROM generated_domains.*WHERE campaign_id`).
		WithArgs(campaignID).
		WillReturnRows(sqlmock.NewRows([]string{
			"qualified", "low_score", "no_keywords", "parked",
			"dns_error", "dns_timeout", "http_error", "http_timeout", "pending", "null_count",
		}).AddRow(0, 0, 0, 0, 0, 0, 0, 0, 0, 0))

	summary, err := s.GetRejectionSummary(context.Background(), nil, campaignID)
	if err != nil {
		t.Fatalf("GetRejectionSummary: %v", err)
	}

	// Empty campaign should be balanced (0 == 0 + 0)
	if !summary.Balanced {
		t.Errorf("expected balanced=true for empty campaign, got %v", summary.Balanced)
	}
	if summary.Totals.Analyzed != 0 {
		t.Errorf("expected 0 analyzed, got %d", summary.Totals.Analyzed)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

// P0-4: Test audit equation: analyzed = qualified + rejected
func TestGetRejectionSummary_AuditEquation(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}
	campaignID := uuid.New()

	// Set up specific values to verify audit equation
	// qualified=20, low_score=10, no_keywords=5, parked=3, dns_error=1, dns_timeout=1, http_error=2, http_timeout=1
	// errors = 1+1+2+1 = 5
	// rejected = 10+5+3+5 = 23
	// analyzed = 20+23 = 43
	mock.ExpectQuery(`SELECT.*FROM generated_domains.*WHERE campaign_id`).
		WithArgs(campaignID).
		WillReturnRows(sqlmock.NewRows([]string{
			"qualified", "low_score", "no_keywords", "parked",
			"dns_error", "dns_timeout", "http_error", "http_timeout", "pending", "null_count",
		}).AddRow(20, 10, 5, 3, 1, 1, 2, 1, 0, 0))

	summary, err := s.GetRejectionSummary(context.Background(), nil, campaignID)
	if err != nil {
		t.Fatalf("GetRejectionSummary: %v", err)
	}

	// Verify audit equation components
	expectedErrors := int64(1 + 1 + 2 + 1)
	if summary.Totals.Errors != expectedErrors {
		t.Errorf("expected errors=%d, got %d", expectedErrors, summary.Totals.Errors)
	}

	expectedRejected := int64(10 + 5 + 3 + 5) // low_score + no_keywords + parked + errors
	if summary.Totals.Rejected != expectedRejected {
		t.Errorf("expected rejected=%d, got %d", expectedRejected, summary.Totals.Rejected)
	}

	expectedAnalyzed := int64(20 + 23) // qualified + rejected
	if summary.Totals.Analyzed != expectedAnalyzed {
		t.Errorf("expected analyzed=%d, got %d", expectedAnalyzed, summary.Totals.Analyzed)
	}

	// Verify the equation holds
	if summary.Totals.Analyzed != summary.Totals.Qualified+summary.Totals.Rejected {
		t.Errorf("audit equation violated: analyzed(%d) != qualified(%d) + rejected(%d)",
			summary.Totals.Analyzed, summary.Totals.Qualified, summary.Totals.Rejected)
	}

	if !summary.Balanced {
		t.Errorf("expected balanced=true, got %v", summary.Balanced)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}
