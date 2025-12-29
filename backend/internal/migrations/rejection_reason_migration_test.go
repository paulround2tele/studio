package migrations

import (
	"os"
	"strings"
	"testing"
)

// TestMigration000072Syntax validates the SQL syntax of the rejection_reason migration
func TestMigration000072Syntax(t *testing.T) {
	upPath := "../../database/migrations/000072_add_rejection_reason.up.sql"
	downPath := "../../database/migrations/000072_add_rejection_reason.down.sql"

	// Check up migration exists and has expected content
	upContent, err := os.ReadFile(upPath)
	if err != nil {
		t.Fatalf("Failed to read up migration: %v", err)
	}

	upSQL := string(upContent)

	// Verify enum creation
	if !strings.Contains(upSQL, "CREATE TYPE public.domain_rejection_reason_enum") {
		t.Error("Up migration missing enum type creation")
	}

	// Verify all expected enum values (NO legacy, NO generic timeout)
	expectedValues := []string{"qualified", "low_score", "no_keywords", "parked", "dns_error", "dns_timeout", "http_error", "http_timeout", "pending"}
	for _, val := range expectedValues {
		if !strings.Contains(upSQL, "'"+val+"'") {
			t.Errorf("Up migration missing enum value: %s", val)
		}
	}

	// Verify FORBIDDEN values are NOT present
	forbiddenValues := []string{"'legacy'", "'timeout'"}
	for _, val := range forbiddenValues {
		// Check it's not in the enum definition (between CREATE TYPE and the closing paren)
		enumSection := upSQL[strings.Index(upSQL, "CREATE TYPE"):strings.Index(upSQL, "COMMENT ON TYPE")]
		if strings.Contains(enumSection, val) {
			t.Errorf("Up migration contains forbidden enum value: %s", val)
		}
	}

	// Verify column addition
	if !strings.Contains(upSQL, "ADD COLUMN rejection_reason") {
		t.Error("Up migration missing column addition")
	}

	// Verify NOT NULL constraint is enforced after backfill
	if !strings.Contains(upSQL, "SET NOT NULL") {
		t.Error("Up migration missing NOT NULL constraint enforcement")
	}

	// Verify index creation (idempotent version includes IF NOT EXISTS)
	if !strings.Contains(upSQL, "CREATE INDEX IF NOT EXISTS idx_generated_domains_rejection_reason") &&
		!strings.Contains(upSQL, "CREATE INDEX idx_generated_domains_rejection_reason") {
		t.Error("Up migration missing index creation")
	}

	// Verify backfill logic
	if !strings.Contains(upSQL, "UPDATE public.generated_domains") || !strings.Contains(upSQL, "SET rejection_reason") {
		t.Error("Up migration missing backfill UPDATE")
	}

	// Check down migration exists and has expected content
	downContent, err := os.ReadFile(downPath)
	if err != nil {
		t.Fatalf("Failed to read down migration: %v", err)
	}

	downSQL := string(downContent)

	// Verify down migration drops index
	if !strings.Contains(downSQL, "DROP INDEX IF EXISTS") {
		t.Error("Down migration missing index drop")
	}

	// Verify down migration drops column
	if !strings.Contains(downSQL, "DROP COLUMN IF EXISTS rejection_reason") {
		t.Error("Down migration missing column drop")
	}

	// Verify down migration drops type
	if !strings.Contains(downSQL, "DROP TYPE IF EXISTS public.domain_rejection_reason_enum") {
		t.Error("Down migration missing type drop")
	}
}

// TestMigration000072BackfillLogic validates the backfill CASE logic
func TestMigration000072BackfillLogic(t *testing.T) {
	upPath := "../../database/migrations/000072_add_rejection_reason.up.sql"
	upContent, err := os.ReadFile(upPath)
	if err != nil {
		t.Fatalf("Failed to read up migration: %v", err)
	}

	upSQL := string(upContent)

	// Verify backfill priority order (order matters!)
	// 1. lead_status = 'match' → qualified
	// 2. dns_status = 'timeout' → dns_timeout (specific!)
	// 3. dns_status = 'error' → dns_error
	// 4. http_status = 'timeout' → http_timeout (specific!)
	// 5. http_status = 'error' → http_error
	// 6. is_parked = true → parked
	// 7. low_score (has keywords but score below threshold) - BEFORE no_keywords
	// 8. lead_status = 'no_match' (no keywords) → no_keywords
	// 9. ELSE → pending

	backfillCases := []struct {
		condition string
		result    string
	}{
		{"lead_status = 'match'", "'qualified'"},
		{"dns_status = 'timeout'", "'dns_timeout'"},
		{"dns_status = 'error'", "'dns_error'"},
		{"http_status = 'timeout'", "'http_timeout'"},
		{"http_status = 'error'", "'http_error'"},
		{"is_parked = true", "'parked'"},
		{"http_keywords IS NOT NULL", "'low_score'"}, // low_score uses http_keywords signal
		{"lead_status = 'no_match'", "'no_keywords'"},
		{"ELSE", "'pending'"}, // NOT legacy!
	}

	for _, tc := range backfillCases {
		if !strings.Contains(upSQL, tc.condition) {
			t.Errorf("Backfill missing condition: %s", tc.condition)
		}
		if !strings.Contains(upSQL, tc.result) {
			t.Errorf("Backfill missing result: %s", tc.result)
		}
	}

	// Verify low_score comes BEFORE no_keywords in the CASE statement
	lowScoreIdx := strings.Index(upSQL, "'low_score'")
	noKeywordsIdx := strings.Index(upSQL, "'no_keywords'")
	if lowScoreIdx > noKeywordsIdx {
		t.Error("Backfill logic error: low_score must come BEFORE no_keywords to be reachable")
	}
}

// TestMigration000072IndexOptimization validates index strategy
func TestMigration000072IndexOptimization(t *testing.T) {
	upPath := "../../database/migrations/000072_add_rejection_reason.up.sql"
	upContent, err := os.ReadFile(upPath)
	if err != nil {
		t.Fatalf("Failed to read up migration: %v", err)
	}

	upSQL := string(upContent)

	// Verify composite index for campaign_id + rejection_reason
	if !strings.Contains(upSQL, "(campaign_id, rejection_reason)") {
		t.Error("Missing composite index on (campaign_id, rejection_reason)")
	}

	// Verify partial index for qualified leads (common query pattern)
	if !strings.Contains(upSQL, "WHERE rejection_reason = 'qualified'") {
		t.Error("Missing partial index for qualified leads")
	}

	// Verify partial index for pending (useful for finding incomplete work)
	if !strings.Contains(upSQL, "WHERE rejection_reason = 'pending'") {
		t.Error("Missing partial index for pending domains")
	}

	// Verify ANALYZE is called for query planner
	if !strings.Contains(upSQL, "ANALYZE public.generated_domains") {
		t.Error("Missing ANALYZE statement for query planner statistics")
	}
}

// TestMigration000072NoLegacyValue ensures legacy is not in the migration
func TestMigration000072NoLegacyValue(t *testing.T) {
	upPath := "../../database/migrations/000072_add_rejection_reason.up.sql"
	upContent, err := os.ReadFile(upPath)
	if err != nil {
		t.Fatalf("Failed to read up migration: %v", err)
	}

	upSQL := string(upContent)

	// Check that 'legacy' is NOT in the enum definition
	if strings.Contains(upSQL, "'legacy'") {
		t.Error("Migration contains forbidden 'legacy' value - all rows must map deterministically")
	}

	// Check that generic 'timeout' is NOT in the enum definition (use dns_timeout/http_timeout)
	enumSection := upSQL[strings.Index(upSQL, "CREATE TYPE"):strings.Index(upSQL, "COMMENT ON TYPE")]
	if strings.Contains(enumSection, "'timeout'") && !strings.Contains(enumSection, "'dns_timeout'") {
		t.Error("Migration contains generic 'timeout' - use dns_timeout/http_timeout instead")
	}
}
