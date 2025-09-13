package postgres

import (
	"context"
	"encoding/json"
	"regexp"
	"testing"
	"time"

	sqlmock "github.com/DATA-DOG/go-sqlmock"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/store"
)

// TestGetGeneratedDomainsWithCursor_CompositeFilters verifies combined filters (minScore, notParked, keyword, hasContact)
// produce expected WHERE predicates, ordering, limit trimming and cursor metadata.
func TestGetGeneratedDomainsWithCursor_CompositeFilters(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()
	sqlxDB := sqlx.NewDb(db, "postgres")

	s := &campaignStorePostgres{db: sqlxDB}
	campaignID := uuid.New()
	minScore := 0.5
	kw := "any" // triggers kw_unique > 0 placeholder
	notParked := true
	hasContact := true
	first := 2

	filter := store.ListGeneratedDomainsFilter{CampaignID: campaignID, MinScore: &minScore, Keyword: &kw, NotParked: &notParked, HasContact: &hasContact}
	filter.First = first
	filter.SortBy = "domain_score"
	filter.SortOrder = "DESC"

	// Expect query containing all predicate fragments in order they are appended by implementation
	// domain_score predicate, not parked, kw_unique, kw_contact
	// Limit placeholder index will be 3 (args: campaign_id, minScore, limit)
	re := regexp.MustCompile(`SELECT id, campaign_id, domain_name.*FROM generated_domains\s+WHERE campaign_id = \$1 AND domain_score IS NOT NULL AND domain_score >= \$2 AND \(is_parked IS DISTINCT FROM TRUE\) AND \(feature_vector->>'kw_unique'\)::int > 0 AND \(feature_vector->>'kw_contact'\)::int > 0 ORDER BY domain_score DESC NULLS LAST, id DESC LIMIT \$3`)

	// Prepare 3 rows (first+1) to assert trimming & HasNextPage
	now := time.Now().UTC()
	fv1, _ := json.Marshal(map[string]any{"kw_unique": 2, "kw_contact": 1})
	fv2, _ := json.Marshal(map[string]any{"kw_unique": 3, "kw_contact": 2})
	fv3, _ := json.Marshal(map[string]any{"kw_unique": 4, "kw_contact": 2})
	rows := sqlmock.NewRows([]string{"id", "campaign_id", "domain_name", "source_keyword", "source_pattern", "tld", "offset_index", "generated_at", "created_at", "relevance_score", "domain_score", "is_parked", "last_http_fetched_at", "feature_vector"}).
		AddRow(uuid.New(), campaignID, "beta.com", nil, nil, "com", 0, now, now, 0.55, 0.70, false, now, fv1).
		AddRow(uuid.New(), campaignID, "alpha.com", nil, nil, "com", 0, now, now, 0.60, 0.80, false, now, fv2).
		AddRow(uuid.New(), campaignID, "gamma.com", nil, nil, "com", 0, now, now, 0.65, 0.90, false, now, fv3)

	mock.ExpectQuery(re.String()).WithArgs(campaignID, minScore, first+1).WillReturnRows(rows)

	result, qErr := s.GetGeneratedDomainsWithCursor(context.Background(), sqlxDB, filter)
	if qErr != nil {
		t.Fatalf("query err: %v", qErr)
	}
	if len(result.Data) != first {
		t.Fatalf("expected %d rows after trim got %d", first, len(result.Data))
	}
	if !result.PageInfo.HasNextPage {
		t.Fatalf("expected HasNextPage true")
	}
	if result.PageInfo.StartCursor == "" || result.PageInfo.EndCursor == "" {
		t.Fatalf("missing cursors")
	}
	if result.PageInfo.StartCursor == result.PageInfo.EndCursor {
		t.Fatalf("start == end cursor unexpected")
	}
	// Decode to ensure format valid
	if _, err := store.DecodeCursor(result.PageInfo.StartCursor); err != nil {
		t.Fatalf("decode start cursor: %v", err)
	}
	if _, err := store.DecodeCursor(result.PageInfo.EndCursor); err != nil {
		t.Fatalf("decode end cursor: %v", err)
	}

	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unmet expectations: %v", err)
	}
}
