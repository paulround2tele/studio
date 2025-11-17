package postgres

import (
	"context"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/models"
)

func TestUpdateDomainsBulkDNSStatusSetsLeadStatus(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	store := &campaignStorePostgres{db: sqlxDB}

	now := time.Now()
	reason := "NXDOMAIN"
	results := []models.DNSValidationResult{{
		ID:               uuid.New(),
		DNSCampaignID:    uuid.New(),
		DomainName:       "example.com",
		ValidationStatus: string(models.DomainDNSStatusError),
		Reason:           &reason,
		LastCheckedAt:    &now,
		CreatedAt:        now,
	}}

	mock.ExpectExec(`lead_status\s*=\s*CASE\s+WHEN v\.validation_status NOT IN \('ok','pending'\)\s+THEN 'no_match'::domain_lead_status_enum`).
		WithArgs(results[0].DomainName, results[0].ValidationStatus, results[0].LastCheckedAt, results[0].Reason).
		WillReturnResult(sqlmock.NewResult(0, 1))

	if err := store.UpdateDomainsBulkDNSStatus(context.Background(), sqlxDB, results); err != nil {
		t.Fatalf("UpdateDomainsBulkDNSStatus: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

func TestUpdateDomainsBulkHTTPStatusSetsLeadStatus(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	store := &campaignStorePostgres{db: sqlxDB}

	now := time.Now()
	reason := "ECONNRESET"
	code := int32(504)
	results := []models.HTTPKeywordResult{{
		ID:                    uuid.New(),
		HTTPKeywordCampaignID: uuid.New(),
		DomainName:            "example.org",
		ValidationStatus:      string(models.DomainHTTPStatusError),
		Reason:                &reason,
		HTTPStatusCode:        &code,
		LastCheckedAt:         &now,
		CreatedAt:             now,
	}}

	mock.ExpectExec(`lead_status\s*=\s*CASE\s+WHEN v\.validation_status NOT IN \('ok','pending'\)\s+THEN 'no_match'::domain_lead_status_enum`).
		WithArgs(results[0].DomainName, results[0].ValidationStatus, results[0].HTTPStatusCode, results[0].LastCheckedAt, results[0].Reason).
		WillReturnResult(sqlmock.NewResult(0, 1))

	if err := store.UpdateDomainsBulkHTTPStatus(context.Background(), sqlxDB, results); err != nil {
		t.Fatalf("UpdateDomainsBulkHTTPStatus: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}
