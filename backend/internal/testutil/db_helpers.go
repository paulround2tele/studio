package testutil

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/store"
	pg_store "github.com/fntelecomllc/studio/backend/internal/store/postgres"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
)

var testDB *sqlx.DB
var testDSN string

// SetupTestDatabase initializes a test database connection and runs migrations.
// It returns the database connection and a cleanup function.
// If TEST_POSTGRES_DSN is not set, it uses a default local DSN.
func SetupTestDatabase(t *testing.T) (*sqlx.DB, func()) {
	t.Helper()

	backendDir := resolveBackendRoot(t)
	repoRoot := filepath.Dir(backendDir)

	// Initialize DSN on first run
	if testDSN == "" {
		testDSN = os.Getenv("TEST_POSTGRES_DSN")
		if testDSN == "" {
			// Read from .db_connection file if it exists
			dbConnPath := filepath.Join(repoRoot, ".db_connection")
			dbConnBytes, err := os.ReadFile(dbConnPath)
			if err == nil && len(dbConnBytes) > 0 {
				testDSN = strings.TrimSpace(string(dbConnBytes))
				t.Logf("Using DSN from %s", dbConnPath)
			} else {
				t.Log("TEST_POSTGRES_DSN not set and .db_connection not found, using default: postgres://studio:studio@localhost:5432/studio_test?sslmode=disable")
				testDSN = "postgres://studio:studio@localhost:5432/studio_test?sslmode=disable"
			}
		}
	}

	// Return existing connection if available
	if testDB != nil {
		if err := testDB.Ping(); err == nil {
			return testDB, func() {}
		}
		t.Log("Test DB connection ping failed, re-establishing...")
		testDB.Close()
	}

	var err error
	testDB, err = sqlx.Connect("postgres", testDSN)
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v", err)
	}

	// Preserve existing schema and data; ensure public schema exists for new environments.
	if _, err = testDB.Exec("CREATE SCHEMA IF NOT EXISTS public"); err != nil {
		t.Fatalf("Failed to ensure public schema exists: %v", err)
	}

	// Create required extensions after schema recreation
	for _, ext := range []string{"uuid-ossp", "pgcrypto"} {
		if _, err := testDB.Exec("CREATE EXTENSION IF NOT EXISTS \"" + ext + "\""); err != nil {
			t.Fatalf("Failed to create extension %s: %v", ext, err)
		}
	}

	// Use in-repo custom migration tool (go run) to handle CONCURRENTLY
	t.Logf("Running migrations via custom migrate tool (go run ./cmd/migrate)")
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	cmd := exec.CommandContext(ctx, "go", "run", "./cmd/migrate", "-dsn", testDSN, "-migrations", "database/migrations", "-direction", "up")
	// Resolve backend directory dynamically for local dev, CI, and devcontainers.
	cmd.Dir = backendDir
	cmd.Env = append(os.Environ(), "POSTGRES_DSN="+testDSN)
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Include tail of output for brevity if large
		o := string(output)
		if len(o) > 4000 {
			o = o[len(o)-4000:]
		}
		t.Fatalf("Migrations failed: %v\nOutput (tail):\n%s", err, o)
	}
	t.Logf("Migrations succeeded. Output:\n%s", string(output))

	return testDB, func() {
		// The cleanup function could be used to drop tables or close the connection
		// if the connection wasn't cached globally (testDB variable).
		// Since we cache it, we'll handle cleanup separately if needed, e.g., via TestMain.
	}
}

// SetupTestStores creates all the necessary stores for testing
func SetupTestStores(t *testing.T) (*sqlx.DB, store.CampaignStore, store.AuditLogStore, store.PersonaStore, store.CampaignJobStore, store.KeywordStore, store.ProxyStore, func()) {
	t.Helper()

	db, teardown := SetupTestDatabase(t)
	if db == nil { // Should not happen if SetupTestDatabase calls t.Fatal
		t.Fatalf("Database setup failed unexpectedly")
	}

	campaignStore := pg_store.NewCampaignStorePostgres(db)
	auditLogStore := pg_store.NewAuditLogStorePostgres(db)
	personaStore := pg_store.NewPersonaStorePostgres(db)
	campaignJobStore := pg_store.NewCampaignJobStorePostgres(db)
	keywordStore := pg_store.NewKeywordStorePostgres(db)
	proxyStore := pg_store.NewProxyStorePostgres(db)

	return db, campaignStore, auditLogStore, personaStore, campaignJobStore, keywordStore, proxyStore, teardown
}

// CleanupTestDatabase closes the test database connection.
// This could be called in a TestMain m.Run() defer if using a global testDB.
func CleanupTestDatabase() {
	if testDB != nil {
		testDB.Close()
		testDB = nil
	}
}

// resolveBackendRoot locates the backend module directory regardless of the current working directory.
func resolveBackendRoot(t *testing.T) string {
	t.Helper()
	if override := os.Getenv("BACKEND_ROOT"); override != "" {
		if isBackendRoot(override) {
			return override
		}
		t.Fatalf("BACKEND_ROOT=%s does not point to backend module", override)
	}

	wd, err := os.Getwd()
	if err != nil {
		t.Fatalf("getwd: %v", err)
	}
	dir := wd
	for i := 0; i < 10; i++ {
		if isBackendRoot(dir) {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}

	// Fallback: attempt ./backend relative to current directory (useful if go test invoked from repo root)
	if rel, err := filepath.Abs(filepath.Join(wd, "backend")); err == nil && isBackendRoot(rel) {
		return rel
	}

	t.Fatalf("unable to locate backend module root starting from %s", wd)
	return ""
}

func isBackendRoot(dir string) bool {
	info, err := os.Stat(filepath.Join(dir, "go.mod"))
	if err != nil || info.IsDir() {
		return false
	}
	contents, err := os.ReadFile(filepath.Join(dir, "go.mod"))
	if err != nil {
		return false
	}
	return strings.Contains(string(contents), "module github.com/fntelecomllc/studio/backend")
}
