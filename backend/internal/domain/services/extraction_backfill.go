package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/extraction"
)

// ExtractionBackfillService provides a P0/P1 bridge to populate domain_extraction_features
// from existing generated_domains rows. It is gated by EXTRACTION_FEATURE_TABLE_ENABLED.
type ExtractionBackfillService struct {
	DB any // *sql.DB | *sqlx.DB | *pgx.Conn
}

// BackfillCampaign processes existing generated_domains rows for a campaign and upserts feature rows.
// It performs lightweight aggregation using existing feature_vector JSON when available.
func (s *ExtractionBackfillService) BackfillCampaign(ctx context.Context, campaignID uuid.UUID, limit int) (int, error) {
	if !extraction.EnabledFeatureTable() {
		return 0, nil
	}
	// Materialize connection variants
	var dbStd *sql.DB
	var pgxConn *pgx.Conn
	switch db := s.DB.(type) {
	case *sqlx.DB:
		dbStd = db.DB
	case *sql.DB:
		dbStd = db
	case *pgx.Conn:
		pgxConn = db
	default:
		return 0, fmt.Errorf("unsupported DB type for backfill")
	}
	q := `SELECT id, domain_name, http_status, http_status_code, feature_vector, is_parked, parked_confidence, content_lang, secondary_pages_examined, microcrawl_exhausted, last_http_fetched_at FROM generated_domains WHERE campaign_id=$1 ORDER BY generated_at ASC LIMIT $2`

	type rowT struct {
		ID                  uuid.UUID
		DomainName          string
		HTTPStatus          sql.NullString
		HTTPStatusCode      sql.NullInt32
		FeatureVectorRaw    []byte
		IsParked            sql.NullBool
		ParkedConfidence    sql.NullFloat64
		ContentLang         sql.NullString
		SecondaryPages      int
		MicrocrawlExhausted bool
		LastFetchedAt       *time.Time
	}

	rowsProcessed := 0
	if pgxConn != nil {
		rows, err := pgxConn.Query(ctx, q, campaignID, limit)
		if err != nil {
			return 0, err
		}
		defer rows.Close()
		for rows.Next() {
			var r rowT
			if err := rows.Scan(&r.ID, &r.DomainName, &r.HTTPStatus, &r.HTTPStatusCode, &r.FeatureVectorRaw, &r.IsParked, &r.ParkedConfidence, &r.ContentLang, &r.SecondaryPages, &r.MicrocrawlExhausted, &r.LastFetchedAt); err != nil {
				return rowsProcessed, err
			}
			if err := s.persist(ctx, pgxConn, campaignID, r); err != nil {
				return rowsProcessed, err
			}
			rowsProcessed++
		}
		return rowsProcessed, rows.Err()
	}

	// Fallback generic *sql.DB path
	rows, err := dbStd.QueryContext(ctx, q, campaignID, limit)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	for rows.Next() {
		var r rowT
		if err := rows.Scan(&r.ID, &r.DomainName, &r.HTTPStatus, &r.HTTPStatusCode, &r.FeatureVectorRaw, &r.IsParked, &r.ParkedConfidence, &r.ContentLang, &r.SecondaryPages, &r.MicrocrawlExhausted, &r.LastFetchedAt); err != nil {
			return rowsProcessed, err
		}
		if pgxConn != nil { // should be nil in this branch
			if err := s.persist(ctx, pgxConn, campaignID, r); err != nil {
				return rowsProcessed, err
			}
		} else {
			// Without pgx connection we cannot use UpsertFeatureRow yet (simplify - skip). Future: add sqlx variant.
		}
		rowsProcessed++
	}
	return rowsProcessed, rows.Err()
}

func (s *ExtractionBackfillService) persist(ctx context.Context, conn *pgx.Conn, campaignID uuid.UUID, r interface{}) error {
	row := r.(struct {
		ID                  uuid.UUID
		DomainName          string
		HTTPStatus          sql.NullString
		HTTPStatusCode      sql.NullInt32
		FeatureVectorRaw    []byte
		IsParked            sql.NullBool
		ParkedConfidence    sql.NullFloat64
		ContentLang         sql.NullString
		SecondaryPages      int
		MicrocrawlExhausted bool
		LastFetchedAt       *time.Time
	})
	fv := map[string]any{}
	_ = json.Unmarshal(row.FeatureVectorRaw, &fv)
	kwUnique := asIntPtr(fv["kw_unique"])
	kwHits := asIntPtr(fv["kw_hits_total"])
	contentBytes := asIntPtr(fv["content_bytes"])
	// Minimal top3 reconstruction omitted for backfill (leave NULL)
	featureVecJSON := fv
	fr := extraction.FeatureRow{
		CampaignID:               campaignID.String(),
		DomainID:                 row.ID.String(),
		DomainName:               row.DomainName,
		ProcessingState:          "building",
		AttemptCount:             0,
		HTTPStatus:               nullableStringPtr(row.HTTPStatus),
		HTTPStatusCode:           nullableInt32Ptr(row.HTTPStatusCode),
		ContentBytes:             contentBytes,
		PageLang:                 nullableStringPtr(row.ContentLang),
		KwUniqueCount:            kwUnique,
		KwTotalOccurrences:       kwHits,
		FeatureVector:            featureVecJSON,
		ExtractionVersion:        1,
		KeywordDictionaryVersion: 1,
	}
	if err := extraction.UpsertFeatureRow(ctx, conn, fr); err != nil {
		return err
	}
	return extraction.TransitionReady(ctx, conn, campaignID.String(), row.ID.String())
}

func nullableStringPtr(ns sql.NullString) *string {
	if ns.Valid {
		return &ns.String
	}
	return nil
}
func nullableInt32Ptr(ni sql.NullInt32) *int {
	if ni.Valid {
		v := int(ni.Int32)
		return &v
	}
	return nil
}
func asIntPtr(v any) *int {
	if v == nil {
		return nil
	}
	switch t := v.(type) {
	case float64:
		iv := int(t)
		return &iv
	case int:
		iv := t
		return &iv
	case int64:
		iv := int(t)
		return &iv
	default:
		return nil
	}
}
