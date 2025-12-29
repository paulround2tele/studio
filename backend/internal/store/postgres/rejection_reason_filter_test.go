package postgres

import (
	"context"
	"testing"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
)

func TestGetGeneratedDomainsByCampaign_RejectionReasonFilter(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}

	campaignID := uuid.New()
	rejectionReason := models.DomainRejectionReasonQualified

	// Expect query with rejection_reason filter
	// The query should include rejection_reason in both SELECT and WHERE
	mock.ExpectQuery(`SELECT.*rejection_reason.*WHERE.*rejection_reason = \$3`).
		WithArgs(campaignID, int64(0), rejectionReason, 100).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "campaign_id", "domain_name", "source_keyword", "source_pattern",
			"tld", "offset_index", "generated_at", "created_at", "dns_status",
			"dns_ip", "http_status", "http_status_code", "http_title", "http_keywords",
			"lead_score", "lead_status", "last_validated_at", "dns_reason", "http_reason",
			"rejection_reason",
		}))

	filter := &store.ListCampaignDomainsFilter{
		RejectionReason: &rejectionReason,
	}

	_, err = s.GetGeneratedDomainsByCampaign(context.Background(), nil, campaignID, 100, 0, filter)
	if err != nil {
		t.Fatalf("GetGeneratedDomainsByCampaign: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

func TestGetGeneratedDomainsByCampaign_NoFilter_IncludesRejectionReason(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}

	campaignID := uuid.New()

	// Expect query to include rejection_reason column even without filter
	mock.ExpectQuery(`SELECT.*rejection_reason.*FROM generated_domains`).
		WithArgs(campaignID, int64(0), 100).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "campaign_id", "domain_name", "source_keyword", "source_pattern",
			"tld", "offset_index", "generated_at", "created_at", "dns_status",
			"dns_ip", "http_status", "http_status_code", "http_title", "http_keywords",
			"lead_score", "lead_status", "last_validated_at", "dns_reason", "http_reason",
			"rejection_reason",
		}))

	_, err = s.GetGeneratedDomainsByCampaign(context.Background(), nil, campaignID, 100, 0, nil)
	if err != nil {
		t.Fatalf("GetGeneratedDomainsByCampaign: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

func TestGetGeneratedDomainsByCampaign_MultipleFiltersWithRejectionReason(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}

	campaignID := uuid.New()
	dnsStatus := models.DomainDNSStatusOK
	rejectionReason := models.DomainRejectionReasonDNSError

	// Expect query with multiple filters (strong enum types)
	mock.ExpectQuery(`SELECT.*rejection_reason.*WHERE.*dns_status = \$3.*rejection_reason = \$4`).
		WithArgs(campaignID, int64(0), dnsStatus, rejectionReason, 50).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "campaign_id", "domain_name", "source_keyword", "source_pattern",
			"tld", "offset_index", "generated_at", "created_at", "dns_status",
			"dns_ip", "http_status", "http_status_code", "http_title", "http_keywords",
			"lead_score", "lead_status", "last_validated_at", "dns_reason", "http_reason",
			"rejection_reason",
		}))

	filter := &store.ListCampaignDomainsFilter{
		DNSStatus:       &dnsStatus,
		RejectionReason: &rejectionReason,
	}

	_, err = s.GetGeneratedDomainsByCampaign(context.Background(), nil, campaignID, 50, 0, filter)
	if err != nil {
		t.Fatalf("GetGeneratedDomainsByCampaign: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

func TestGetGeneratedDomainsByCampaign_AllTimeoutTypes(t *testing.T) {
	// Test that dns_timeout and http_timeout are distinct filter values
	testCases := []struct {
		name   string
		reason models.DomainRejectionReasonEnum
	}{
		{"dns_timeout", models.DomainRejectionReasonDNSTimeout},
		{"http_timeout", models.DomainRejectionReasonHTTPTimeout},
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

			mock.ExpectQuery(`SELECT.*rejection_reason.*WHERE.*rejection_reason = \$3`).
				WithArgs(campaignID, int64(0), tc.reason, 100).
				WillReturnRows(sqlmock.NewRows([]string{
					"id", "campaign_id", "domain_name", "source_keyword", "source_pattern",
					"tld", "offset_index", "generated_at", "created_at", "dns_status",
					"dns_ip", "http_status", "http_status_code", "http_title", "http_keywords",
					"lead_score", "lead_status", "last_validated_at", "dns_reason", "http_reason",
					"rejection_reason",
				}))

			reason := tc.reason
			filter := &store.ListCampaignDomainsFilter{
				RejectionReason: &reason,
			}

			_, err = s.GetGeneratedDomainsByCampaign(context.Background(), nil, campaignID, 100, 0, filter)
			if err != nil {
				t.Fatalf("GetGeneratedDomainsByCampaign: %v", err)
			}

			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("sql expectations: %v", err)
			}
		})
	}
}

// P0-8: Tests for multi-value rejection reason filtering

// TestGetGeneratedDomainsByCampaign_MultiValueRejectionReason tests multi-value IN clause filtering
func TestGetGeneratedDomainsByCampaign_MultiValueRejectionReason(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}

	campaignID := uuid.New()

	// Expect query with rejection_reason IN clause for multiple values
	mock.ExpectQuery(`SELECT.*rejection_reason.*WHERE.*rejection_reason IN \(\$3, \$4, \$5\)`).
		WithArgs(
			campaignID,
			int64(0),
			models.DomainRejectionReasonDNSError,
			models.DomainRejectionReasonDNSTimeout,
			models.DomainRejectionReasonHTTPError,
			100,
		).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "campaign_id", "domain_name", "source_keyword", "source_pattern",
			"tld", "offset_index", "generated_at", "created_at", "dns_status",
			"dns_ip", "http_status", "http_status_code", "http_title", "http_keywords",
			"lead_score", "lead_status", "last_validated_at", "dns_reason", "http_reason",
			"rejection_reason",
		}))

	filter := &store.ListCampaignDomainsFilter{
		RejectionReasons: []models.DomainRejectionReasonEnum{
			models.DomainRejectionReasonDNSError,
			models.DomainRejectionReasonDNSTimeout,
			models.DomainRejectionReasonHTTPError,
		},
	}

	_, err = s.GetGeneratedDomainsByCampaign(context.Background(), nil, campaignID, 100, 0, filter)
	if err != nil {
		t.Fatalf("GetGeneratedDomainsByCampaign: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

// TestGetGeneratedDomainsByCampaign_MultiValueWithOtherFilters tests multi-value combined with other filters
func TestGetGeneratedDomainsByCampaign_MultiValueWithOtherFilters(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}

	campaignID := uuid.New()
	dnsStatus := models.DomainDNSStatusOK

	// Expect query with dns_status filter AND multi-value rejection_reason IN clause
	mock.ExpectQuery(`SELECT.*rejection_reason.*WHERE.*dns_status = \$3.*rejection_reason IN \(\$4, \$5\)`).
		WithArgs(
			campaignID,
			int64(0),
			dnsStatus,
			models.DomainRejectionReasonQualified,
			models.DomainRejectionReasonLowScore,
			50,
		).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "campaign_id", "domain_name", "source_keyword", "source_pattern",
			"tld", "offset_index", "generated_at", "created_at", "dns_status",
			"dns_ip", "http_status", "http_status_code", "http_title", "http_keywords",
			"lead_score", "lead_status", "last_validated_at", "dns_reason", "http_reason",
			"rejection_reason",
		}))

	filter := &store.ListCampaignDomainsFilter{
		DNSStatus: &dnsStatus,
		RejectionReasons: []models.DomainRejectionReasonEnum{
			models.DomainRejectionReasonQualified,
			models.DomainRejectionReasonLowScore,
		},
	}

	_, err = s.GetGeneratedDomainsByCampaign(context.Background(), nil, campaignID, 50, 0, filter)
	if err != nil {
		t.Fatalf("GetGeneratedDomainsByCampaign: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

// TestGetGeneratedDomainsByCampaign_SingleValueInRejectionReasons tests single value in RejectionReasons slice
func TestGetGeneratedDomainsByCampaign_SingleValueInRejectionReasons(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}

	campaignID := uuid.New()

	// Single value in RejectionReasons should still use IN clause
	mock.ExpectQuery(`SELECT.*rejection_reason.*WHERE.*rejection_reason IN \(\$3\)`).
		WithArgs(
			campaignID,
			int64(0),
			models.DomainRejectionReasonParked,
			100,
		).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "campaign_id", "domain_name", "source_keyword", "source_pattern",
			"tld", "offset_index", "generated_at", "created_at", "dns_status",
			"dns_ip", "http_status", "http_status_code", "http_title", "http_keywords",
			"lead_score", "lead_status", "last_validated_at", "dns_reason", "http_reason",
			"rejection_reason",
		}))

	filter := &store.ListCampaignDomainsFilter{
		RejectionReasons: []models.DomainRejectionReasonEnum{
			models.DomainRejectionReasonParked,
		},
	}

	_, err = s.GetGeneratedDomainsByCampaign(context.Background(), nil, campaignID, 100, 0, filter)
	if err != nil {
		t.Fatalf("GetGeneratedDomainsByCampaign: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

// TestGetGeneratedDomainsByCampaign_RejectionReasonsOverridesSingleValue tests that RejectionReasons takes precedence
func TestGetGeneratedDomainsByCampaign_RejectionReasonsOverridesSingleValue(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	defer db.Close()

	sqlxDB := sqlx.NewDb(db, "postgres")
	s := &campaignStorePostgres{db: sqlxDB}

	campaignID := uuid.New()
	singleReason := models.DomainRejectionReasonQualified

	// When both RejectionReason and RejectionReasons are set, RejectionReasons should take precedence
	mock.ExpectQuery(`SELECT.*rejection_reason.*WHERE.*rejection_reason IN \(\$3, \$4\)`).
		WithArgs(
			campaignID,
			int64(0),
			models.DomainRejectionReasonDNSError,
			models.DomainRejectionReasonHTTPError,
			100,
		).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "campaign_id", "domain_name", "source_keyword", "source_pattern",
			"tld", "offset_index", "generated_at", "created_at", "dns_status",
			"dns_ip", "http_status", "http_status_code", "http_title", "http_keywords",
			"lead_score", "lead_status", "last_validated_at", "dns_reason", "http_reason",
			"rejection_reason",
		}))

	filter := &store.ListCampaignDomainsFilter{
		RejectionReason: &singleReason, // This should be ignored
		RejectionReasons: []models.DomainRejectionReasonEnum{
			models.DomainRejectionReasonDNSError,
			models.DomainRejectionReasonHTTPError,
		},
	}

	_, err = s.GetGeneratedDomainsByCampaign(context.Background(), nil, campaignID, 100, 0, filter)
	if err != nil {
		t.Fatalf("GetGeneratedDomainsByCampaign: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("sql expectations: %v", err)
	}
}

// TestGetGeneratedDomainsByCampaign_AllRejectionReasonValues tests all valid rejection reason enum values
func TestGetGeneratedDomainsByCampaign_AllRejectionReasonValues(t *testing.T) {
	allReasons := []models.DomainRejectionReasonEnum{
		models.DomainRejectionReasonQualified,
		models.DomainRejectionReasonLowScore,
		models.DomainRejectionReasonNoKeywords,
		models.DomainRejectionReasonParked,
		models.DomainRejectionReasonDNSError,
		models.DomainRejectionReasonDNSTimeout,
		models.DomainRejectionReasonHTTPError,
		models.DomainRejectionReasonHTTPTimeout,
		models.DomainRejectionReasonPending,
	}

	for _, reason := range allReasons {
		t.Run(string(reason), func(t *testing.T) {
			db, mock, err := sqlmock.New()
			if err != nil {
				t.Fatalf("sqlmock.New: %v", err)
			}
			defer db.Close()

			sqlxDB := sqlx.NewDb(db, "postgres")
			s := &campaignStorePostgres{db: sqlxDB}

			campaignID := uuid.New()

			mock.ExpectQuery(`SELECT.*rejection_reason.*WHERE.*rejection_reason IN \(\$3\)`).
				WithArgs(campaignID, int64(0), reason, 100).
				WillReturnRows(sqlmock.NewRows([]string{
					"id", "campaign_id", "domain_name", "source_keyword", "source_pattern",
					"tld", "offset_index", "generated_at", "created_at", "dns_status",
					"dns_ip", "http_status", "http_status_code", "http_title", "http_keywords",
					"lead_score", "lead_status", "last_validated_at", "dns_reason", "http_reason",
					"rejection_reason",
				}))

			filter := &store.ListCampaignDomainsFilter{
				RejectionReasons: []models.DomainRejectionReasonEnum{reason},
			}

			_, err = s.GetGeneratedDomainsByCampaign(context.Background(), nil, campaignID, 100, 0, filter)
			if err != nil {
				t.Fatalf("GetGeneratedDomainsByCampaign with %s: %v", reason, err)
			}

			if err := mock.ExpectationsWereMet(); err != nil {
				t.Fatalf("sql expectations for %s: %v", reason, err)
			}
		})
	}
}
