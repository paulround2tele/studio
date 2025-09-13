package tests

import (
	"os"
	"testing"

	"github.com/go-chi/chi/v5"
)

// Placeholder helpers; real server wiring not yet exposed for tests.

// newTestApp builds a chi.Router with strict keyword profile handlers wired via generated server.
func newTestApp(t *testing.T) *chi.Mux {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		t.Fatalf("TEST_DATABASE_DSN required for HTTP integration test")
	}
	// TODO: Expose NewStrictTestRouter from main with accessible types.
	t.Skip("strict test router not yet exported to tests package")
	return chi.NewRouter()
}
