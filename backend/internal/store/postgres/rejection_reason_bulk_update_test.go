package postgres

import (
	"context"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/models"
)

// P0-3: Test that bulk DNS status updates only set rejection_reason for terminal errors

func TestUpdateDomainsBulkDNSStatus_OnlySetsRejectionForTerminalErrors(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}

	now := time.Now()
	results := []models.DNSValidationResult{
		{DomainName: "timeout.example.com", ValidationStatus: "timeout", LastCheckedAt: &now},
		{DomainName: "error.example.com", ValidationStatus: "error", LastCheckedAt: &now},
		{DomainName: "ok.example.com", ValidationStatus: "ok", LastCheckedAt: &now},
		{DomainName: "pending.example.com", ValidationStatus: "pending", LastCheckedAt: &now},
	}

	// Verify query uses correct CASE logic:
	// - timeout -> dns_timeout
	// - error -> dns_error
	// - ok/pending -> preserve existing (gd.rejection_reason)
	mock.ExpectExec(`UPDATE generated_domains gd.*rejection_reason = CASE.*WHEN v.validation_status = 'timeout' THEN 'dns_timeout'.*WHEN v.validation_status = 'error' THEN 'dns_error'.*ELSE gd.rejection_reason.*END`).
		WithArgs(
			"timeout.example.com", "timeout", now, nil,
			"error.example.com", "error", now, nil,
			"ok.example.com", "ok", now, nil,
			"pending.example.com", "pending", now, nil,
		).
		WillReturnResult(sqlmock.NewResult(0, 4))

	err = s.UpdateDomainsBulkDNSStatus(context.Background(), nil, results)
	if err != nil {
		t.Fatalf("UpdateDomainsBulkDNSStatus: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

func TestUpdateDomainsBulkHTTPStatus_OnlySetsRejectionForTerminalErrors(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}

	now := time.Now()
	statusCode200 := int32(200)
	results := []models.HTTPKeywordResult{
		{DomainName: "timeout.example.com", ValidationStatus: "timeout", LastCheckedAt: &now},
		{DomainName: "error.example.com", ValidationStatus: "error", LastCheckedAt: &now},
		{DomainName: "ok.example.com", ValidationStatus: "ok", HTTPStatusCode: &statusCode200, LastCheckedAt: &now},
		{DomainName: "pending.example.com", ValidationStatus: "pending", LastCheckedAt: &now},
	}

	// Verify query uses correct CASE logic:
	// - timeout -> http_timeout
	// - error -> http_error
	// - ok/pending -> preserve existing (gd.rejection_reason)
	mock.ExpectExec(`UPDATE generated_domains gd.*rejection_reason = CASE.*WHEN v.validation_status = 'timeout' THEN 'http_timeout'.*WHEN v.validation_status = 'error' THEN 'http_error'.*ELSE gd.rejection_reason.*END`).
		WithArgs(
			"timeout.example.com", "timeout", nil, now, nil,
			"error.example.com", "error", nil, now, nil,
			"ok.example.com", "ok", &statusCode200, now, nil,
			"pending.example.com", "pending", nil, now, nil,
		).
		WillReturnResult(sqlmock.NewResult(0, 4))

	err = s.UpdateDomainsBulkHTTPStatus(context.Background(), nil, results)
	if err != nil {
		t.Fatalf("UpdateDomainsBulkHTTPStatus: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

// TestDNSUpdate_DoesNotOverwritePriorRejectionReason verifies that a prior
// rejection_reason (e.g., "qualified" from enrichment) is preserved when
// DNS phase later updates the status to 'ok'
func TestDNSUpdate_DoesNotOverwritePriorRejectionReason(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}

	now := time.Now()
	// Domain already has rejection_reason = 'qualified' from enrichment
	// DNS update with status 'ok' should NOT overwrite it
	results := []models.DNSValidationResult{
		{DomainName: "existing-qualified.example.com", ValidationStatus: "ok", LastCheckedAt: &now},
	}

	// The query should have ELSE gd.rejection_reason, preserving existing value
	mock.ExpectExec(`UPDATE generated_domains gd.*rejection_reason = CASE.*ELSE gd.rejection_reason.*END`).
		WithArgs("existing-qualified.example.com", "ok", now, nil).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = s.UpdateDomainsBulkDNSStatus(context.Background(), nil, results)
	if err != nil {
		t.Fatalf("UpdateDomainsBulkDNSStatus: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

// TestHTTPUpdate_DoesNotOverwritePriorRejectionReason verifies that a prior
// rejection_reason is preserved when HTTP phase updates status to 'ok'
func TestHTTPUpdate_DoesNotOverwritePriorRejectionReason(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}

	now := time.Now()
	statusCode200 := int32(200)
	// Domain already has rejection_reason = 'low_score' from enrichment
	// HTTP update with status 'ok' should NOT overwrite it
	results := []models.HTTPKeywordResult{
		{DomainName: "existing-lowscore.example.com", ValidationStatus: "ok", HTTPStatusCode: &statusCode200, LastCheckedAt: &now},
	}

	// The query should have ELSE gd.rejection_reason, preserving existing value
	mock.ExpectExec(`UPDATE generated_domains gd.*rejection_reason = CASE.*ELSE gd.rejection_reason.*END`).
		WithArgs("existing-lowscore.example.com", "ok", &statusCode200, now, nil).
		WillReturnResult(sqlmock.NewResult(0, 1))

	err = s.UpdateDomainsBulkHTTPStatus(context.Background(), nil, results)
	if err != nil {
		t.Fatalf("UpdateDomainsBulkHTTPStatus: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

// TestBulkDNSUpdate_SetsTerminalReasonCorrectly verifies that terminal
// DNS errors correctly set the rejection_reason
func TestBulkDNSUpdate_SetsTerminalReasonCorrectly(t *testing.T) {
	testCases := []struct {
		name           string
		status         string
		expectedReason string
	}{
		{"timeout sets dns_timeout", "timeout", "dns_timeout"},
		{"error sets dns_error", "error", "dns_error"},
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

			now := time.Now()
			results := []models.DNSValidationResult{
				{DomainName: "test.example.com", ValidationStatus: tc.status, LastCheckedAt: &now},
			}

			// Verify the correct rejection reason is in the query
			pattern := `UPDATE generated_domains gd.*WHEN v.validation_status = '` + tc.status + `' THEN '` + tc.expectedReason + `'`
			mock.ExpectExec(pattern).
				WithArgs("test.example.com", tc.status, now, nil).
				WillReturnResult(sqlmock.NewResult(0, 1))

			err = s.UpdateDomainsBulkDNSStatus(context.Background(), nil, results)
			if err != nil {
				t.Fatalf("UpdateDomainsBulkDNSStatus: %v", err)
			}

			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("sql expectations: %v", err)
			}
		})
	}
}

// TestBulkHTTPUpdate_SetsTerminalReasonCorrectly verifies that terminal
// HTTP errors correctly set the rejection_reason
func TestBulkHTTPUpdate_SetsTerminalReasonCorrectly(t *testing.T) {
	testCases := []struct {
		name           string
		status         string
		expectedReason string
	}{
		{"timeout sets http_timeout", "timeout", "http_timeout"},
		{"error sets http_error", "error", "http_error"},
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

			now := time.Now()
			results := []models.HTTPKeywordResult{
				{DomainName: "test.example.com", ValidationStatus: tc.status, LastCheckedAt: &now},
			}

			// Verify the correct rejection reason is in the query
			pattern := `UPDATE generated_domains gd.*WHEN v.validation_status = '` + tc.status + `' THEN '` + tc.expectedReason + `'`
			mock.ExpectExec(pattern).
				WithArgs("test.example.com", tc.status, nil, now, nil).
				WillReturnResult(sqlmock.NewResult(0, 1))

			err = s.UpdateDomainsBulkHTTPStatus(context.Background(), nil, results)
			if err != nil {
				t.Fatalf("UpdateDomainsBulkHTTPStatus: %v", err)
			}

			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("sql expectations: %v", err)
			}
		})
	}
}
