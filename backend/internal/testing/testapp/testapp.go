package testapp

import (
	"database/sql"
	"net/http"
	"testing"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	_ "github.com/lib/pq"
	// use main package init helpers via internal referencing not possible; replicate minimal deps path later if needed
)

// New returns a barebones test HTTP handler and DB connection.
// NOTE: This is a lightweight placeholder; expand with full app wiring as needed.
func New(t *testing.T) (http.Handler, *sql.DB, func()) {
	t.Helper()
	dsn := "postgres://localhost:5432/studio_test?sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	mux := http.NewServeMux()
	// Placeholder endpoint for domains listing (would need real handler in full integration test)
	mux.HandleFunc("/api/v1/campaigns/", func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "not implemented in lightweight harness", http.StatusNotImplemented)
	})
	cleanup := func() { _ = db.Close() }
	return mux, db, cleanup
}

// NewFull returns an http.Handler with generated strict handlers mounted at /api/v2.
// It relies on the full application dependency initialization; if that fails the test is skipped.
func NewFull(t *testing.T, h gen.StrictServerInterface) http.Handler {
	t.Helper()
	if h == nil {
		t.Fatalf("nil strict handler passed")
	}
	handler := gen.NewStrictHandler(h, nil)
	return gen.HandlerWithOptions(handler, gen.ChiServerOptions{BaseURL: "/api/v2"})
}
