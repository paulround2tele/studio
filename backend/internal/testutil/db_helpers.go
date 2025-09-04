package testutil

import (
	"context"
	"os"
	"os/exec"
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

	// Initialize DSN on first run
	if testDSN == "" {
		testDSN = os.Getenv("TEST_POSTGRES_DSN")
		if testDSN == "" {
			// Read from .db_connection file if it exists
			dbConnBytes, err := os.ReadFile("../../.db_connection")
			if err == nil && len(dbConnBytes) > 0 {
				testDSN = strings.TrimSpace(string(dbConnBytes))
				t.Log("Using DSN from .db_connection file")
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

	// Clean database by dropping schema
	_, err = testDB.Exec("DROP SCHEMA IF EXISTS public CASCADE")
	if err != nil {
		t.Logf("Could not drop schema (non-fatal): %v", err)
	}
	_, err = testDB.Exec("CREATE SCHEMA public")
	if err != nil {
		t.Fatalf("Failed to recreate public schema: %v", err)
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
	cmd.Dir = "/home/vboxuser/studio/backend"
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
