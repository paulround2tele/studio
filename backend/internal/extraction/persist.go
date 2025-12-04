package extraction

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
)

// FeatureRow is the minimal persistence struct for domain_extraction_features
// (subset aligned with migration; expand as aggregator evolves)
type FeatureRow struct {
	CampaignID               string
	DomainID                 string
	DomainName               string
	ProcessingState          string
	AttemptCount             int
	LastError                *string
	HTTPStatus               *string
	HTTPStatusCode           *int
	FetchTimeMs              *int
	ContentHash              *string
	ContentBytes             *int
	PageLang                 *string
	KwUniqueCount            *int
	KwTotalOccurrences       *int
	KwWeightSum              *float64
	KwTop3                   any
	KwSignalDistribution     any
	MicrocrawlEnabled        *bool
	MicrocrawlPages          *int
	MicrocrawlBaseKwCount    *int
	MicrocrawlAddedKwCount   *int
	MicrocrawlGainRatio      *float64
	DiminishingReturns       *bool
	IsParked                 *bool
	ParkedConfidence         *float64
	ContentRichnessScore     *float64
	PageArchetype            *string
	CrawlStrategy            *string
	FeatureVector            any
	ExtractionVersion        int
	KeywordDictionaryVersion int
}

// UpsertFeatureRow performs an atomic UPSERT for a single domain feature row.
func UpsertFeatureRow(ctx context.Context, conn interface{}, row FeatureRow) error {
	if conn == nil {
		return errors.New("connection required for UpsertFeatureRow")
	}
	// Accept *pgx.Conn, pgx.Tx, *sql.DB for flexibility.
	switch c := conn.(type) {
	case *pgx.Conn:
		return upsertWithPgx(ctx, c, row)
	case pgx.Tx:
		return upsertWithPgxTx(ctx, c, row)
	default:
		return errors.New("unsupported connection type for UpsertFeatureRow")
	}
}

const upsertSQL = `INSERT INTO domain_extraction_features (
  campaign_id, domain_id, domain_name, processing_state, attempt_count,
  last_error, http_status, http_status_code, fetch_time_ms, content_hash, content_bytes, page_lang,
  kw_unique_count, kw_total_occurrences, kw_weight_sum, kw_top3, kw_signal_distribution,
  microcrawl_enabled, microcrawl_pages, microcrawl_base_kw_count, microcrawl_added_kw_count, microcrawl_gain_ratio,
  diminishing_returns, is_parked, parked_confidence, content_richness_score, page_archetype, crawl_strategy,
  feature_vector, extraction_version, keyword_dictionary_version, updated_at
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31, now()
) ON CONFLICT (campaign_id, domain_id)
DO UPDATE SET
  domain_name = EXCLUDED.domain_name,
  processing_state = EXCLUDED.processing_state,
  attempt_count = domain_extraction_features.attempt_count + 1,
  last_error = EXCLUDED.last_error,
  http_status = EXCLUDED.http_status,
  http_status_code = EXCLUDED.http_status_code,
  fetch_time_ms = EXCLUDED.fetch_time_ms,
  content_hash = EXCLUDED.content_hash,
  content_bytes = EXCLUDED.content_bytes,
  page_lang = EXCLUDED.page_lang,
  kw_unique_count = EXCLUDED.kw_unique_count,
  kw_total_occurrences = EXCLUDED.kw_total_occurrences,
  kw_weight_sum = EXCLUDED.kw_weight_sum,
  kw_top3 = EXCLUDED.kw_top3,
  kw_signal_distribution = EXCLUDED.kw_signal_distribution,
  microcrawl_enabled = EXCLUDED.microcrawl_enabled,
  microcrawl_pages = EXCLUDED.microcrawl_pages,
  microcrawl_base_kw_count = EXCLUDED.microcrawl_base_kw_count,
  microcrawl_added_kw_count = EXCLUDED.microcrawl_added_kw_count,
  microcrawl_gain_ratio = EXCLUDED.microcrawl_gain_ratio,
  diminishing_returns = EXCLUDED.diminishing_returns,
  is_parked = EXCLUDED.is_parked,
  parked_confidence = EXCLUDED.parked_confidence,
  content_richness_score = EXCLUDED.content_richness_score,
  page_archetype = EXCLUDED.page_archetype,
  crawl_strategy = EXCLUDED.crawl_strategy,
  feature_vector = EXCLUDED.feature_vector,
  extraction_version = EXCLUDED.extraction_version,
  keyword_dictionary_version = EXCLUDED.keyword_dictionary_version,
  updated_at = now();`

func upsertWithPgx(ctx context.Context, conn *pgx.Conn, row FeatureRow) error {
	args := marshalArgs(row)
	_, err := conn.Exec(ctx, upsertSQL, args...)
	return err
}

func upsertWithPgxTx(ctx context.Context, tx pgx.Tx, row FeatureRow) error {
	args := marshalArgs(row)
	_, err := tx.Exec(ctx, upsertSQL, args...)
	return err
}

func marshalArgs(r FeatureRow) []any {
	return []any{
		r.CampaignID, r.DomainID, r.DomainName, defaultStr(r.ProcessingState, "building"), r.AttemptCount,
		r.LastError, r.HTTPStatus, r.HTTPStatusCode, r.FetchTimeMs, r.ContentHash, r.ContentBytes, r.PageLang,
		r.KwUniqueCount, r.KwTotalOccurrences, r.KwWeightSum, r.KwTop3, r.KwSignalDistribution,
		r.MicrocrawlEnabled, r.MicrocrawlPages, r.MicrocrawlBaseKwCount, r.MicrocrawlAddedKwCount, r.MicrocrawlGainRatio,
		r.DiminishingReturns, r.IsParked, r.ParkedConfidence, r.ContentRichnessScore, r.PageArchetype, r.CrawlStrategy,
		r.FeatureVector, r.ExtractionVersion, r.KeywordDictionaryVersion,
	}
}

func defaultStr(v string, d string) string {
	if v == "" {
		return d
	}
	return v
}

// TransitionReady updates processing_state to ready with optional clearing of last_error.
func TransitionReady(ctx context.Context, conn *pgx.Conn, campaignID, domainID string) error {
	if conn == nil {
		return errors.New("pgx connection required for TransitionReady")
	}
	_, err := conn.Exec(ctx, `UPDATE domain_extraction_features SET processing_state='ready', last_error=NULL, updated_at=now() WHERE campaign_id=$1 AND domain_id=$2`, campaignID, domainID)
	return err
}

// TransitionError marks the row error with message.
func TransitionError(ctx context.Context, conn *pgx.Conn, campaignID, domainID string, message string) error {
	if conn == nil {
		return errors.New("pgx connection required for TransitionError")
	}
	_, err := conn.Exec(ctx, `UPDATE domain_extraction_features SET processing_state='error', last_error=$3, updated_at=now() WHERE campaign_id=$1 AND domain_id=$2`, campaignID, domainID, message)
	return err
}

// ReconcileStuckBuildingLegacy (deprecated) retained for backward compatibility until callers migrate to extraction.ReconcileStuckBuilding with ReconcileOptions.
func ReconcileStuckBuildingLegacy(ctx context.Context, conn *pgx.Conn, olderThan time.Duration, batch int) (int, error) {
	// Delegate to new implementation with options.
	return ReconcileStuckBuilding(ctx, conn, ReconcileOptions{OlderThan: olderThan, BatchSize: batch})
}

// QuickSmokeQuery verifies table existence (for tests)
func QuickSmokeQuery(ctx context.Context, conn *pgx.Conn) error {
	if conn == nil {
		return errors.New("pgx connection required for QuickSmokeQuery")
	}
	row := conn.QueryRow(ctx, `SELECT 1 FROM domain_extraction_features LIMIT 1`)
	var one int
	if err := row.Scan(&one); err != nil && !errors.Is(err, sql.ErrNoRows) {
		return fmt.Errorf("feature table smoke query failed: %w", err)
	}
	return nil
}
