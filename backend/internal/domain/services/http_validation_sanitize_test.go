package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"testing"

	"github.com/google/uuid"
	_ "github.com/lib/pq"
)

// TestSanitizeJSONForPostgres verifies that the sanitize function works correctly
func TestSanitizeJSONForPostgres(t *testing.T) {
	tests := []struct {
		name     string
		input    []byte
		expected []byte
	}{
		{
			name:     "basic html escapes",
			input:    []byte(`{"html":"\u003chtml\u003e\u003c/html\u003e"}`),
			expected: []byte(`{"html":"<html></html>"}`),
		},
		{
			name:     "ampersand escape",
			input:    []byte(`{"query":"foo\u0026bar"}`),
			expected: []byte(`{"query":"foo&bar"}`),
		},
		{
			name:     "quote escapes",
			input:    []byte(`{"text":"say \u0027hello\u0027"}`),
			expected: []byte(`{"text":"say 'hello'"}`),
		},
		{
			name:     "null byte removal",
			input:    []byte(`{"bad":"\u0000null\u0000"}`),
			expected: []byte(`{"bad":"null"}`),
		},
		{
			name:     "mixed escapes",
			input:    []byte(`{"snippet":"\u003cdiv\u003e\u0026amp;\u003c/div\u003e"}`),
			expected: []byte(`{"snippet":"<div>&amp;</div>"}`),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := sanitizeJSONForPostgres(tt.input)
			if string(result) != string(tt.expected) {
				t.Errorf("sanitizeJSONForPostgres() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestExtractKeywordsFromFeatureVector verifies keyword extraction
func TestExtractKeywordsFromFeatureVector(t *testing.T) {
	tests := []struct {
		name     string
		input    map[string]interface{}
		expected string
	}{
		{
			name: "with kw_top3",
			input: map[string]interface{}{
				"kw_top3": []interface{}{"telecom", "voip", "sip"},
				"other":   "data",
			},
			expected: `["telecom","voip","sip"]`,
		},
		{
			name: "empty kw_top3",
			input: map[string]interface{}{
				"kw_top3": []interface{}{},
				"other":   "data",
			},
			expected: "",
		},
		{
			name:     "no kw_top3",
			input:    map[string]interface{}{"other": "data"},
			expected: "",
		},
		{
			name: "single keyword",
			input: map[string]interface{}{
				"kw_top3": []interface{}{"telecom"},
			},
			expected: `["telecom"]`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := extractKeywordsFromFeatureVector(tt.input)
			if result != tt.expected {
				t.Errorf("extractKeywordsFromFeatureVector() = %q, want %q", result, tt.expected)
			}
		})
	}
}

// TestFeatureVectorPersistenceIntegration tests that sanitized JSON can be inserted into PostgreSQL
func TestFeatureVectorPersistenceIntegration(t *testing.T) {
	// Skip if no database available
	dsn := "postgres://domainflow:pNpTHxEWr2SmY270p1IjGn3dP@localhost:5432/domainflow_production?sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Skipf("Skipping integration test: %v", err)
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		t.Skipf("Skipping integration test: database not available: %v", err)
	}

	// Create test data with HTML content that would fail without sanitization
	featureVector := map[string]interface{}{
		"content_snippet":  "<html><head><title>Test</title></head><body>Hello & World</body></html>",
		"extracted_text":   "This is a test page for 'telecom' services & more",
		"kw_top3":          []string{"telecom", "voip"},
		"kw_unique":        2,
		"keyword_set_hits": 1,
	}

	raw, err := json.Marshal(featureVector)
	if err != nil {
		t.Fatalf("Failed to marshal feature vector: %v", err)
	}

	t.Logf("Original JSON: %s", string(raw))

	// Sanitize
	sanitized := sanitizeJSONForPostgres(raw)
	t.Logf("Sanitized JSON: %s", string(sanitized))

	// Attempt to insert into a test table
	ctx := context.Background()

	// Create a temporary test table
	_, err = db.ExecContext(ctx, `
		CREATE TEMP TABLE test_feature_vectors (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			feature_vector JSONB
		)
	`)
	if err != nil {
		t.Fatalf("Failed to create temp table: %v", err)
	}

	// Insert sanitized JSON
	testID := uuid.New()
	_, err = db.ExecContext(ctx, `
		INSERT INTO test_feature_vectors (id, feature_vector) 
		VALUES ($1, $2::jsonb)
	`, testID, sanitized)

	if err != nil {
		t.Errorf("Failed to insert sanitized JSON into PostgreSQL JSONB: %v", err)
	} else {
		t.Log("SUCCESS: Sanitized JSON inserted into PostgreSQL JSONB")
	}

	// Verify the data round-trips correctly
	var retrieved json.RawMessage
	err = db.QueryRowContext(ctx, `
		SELECT feature_vector FROM test_feature_vectors WHERE id = $1
	`, testID).Scan(&retrieved)

	if err != nil {
		t.Errorf("Failed to retrieve feature vector: %v", err)
	} else {
		t.Logf("Retrieved JSON: %s", string(retrieved))

		// Verify kw_top3 is accessible
		var parsed map[string]interface{}
		if err := json.Unmarshal(retrieved, &parsed); err != nil {
			t.Errorf("Failed to parse retrieved JSON: %v", err)
		} else {
			if kwTop3, ok := parsed["kw_top3"].([]interface{}); ok {
				t.Logf("Retrieved kw_top3: %v", kwTop3)
				if len(kwTop3) != 2 {
					t.Errorf("Expected 2 keywords, got %d", len(kwTop3))
				}
			} else {
				t.Error("kw_top3 not found or not an array")
			}
		}
	}
}
