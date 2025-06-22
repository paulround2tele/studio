// File: backend/tests/common_test_utils.go
package tests

import (
	"os"
	"strings"
	"testing"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/require"
)

// setupTestDatabase initializes a database connection for testing
func setupTestDatabase(t *testing.T) *sqlx.DB {
	// Read database connection string from .db_connection file
	dbConnBytes, err := os.ReadFile("../.db_connection")
	require.NoError(t, err, "Failed to read .db_connection file")

	dsn := strings.TrimSpace(string(dbConnBytes))
	require.NotEmpty(t, dsn, "Database connection string is empty")

	// Connect to domainflow_production database
	db, err := sqlx.Connect("postgres", dsn)
	require.NoError(t, err, "Failed to connect to domainflow_production database")

	// Test the connection
	err = db.Ping()
	require.NoError(t, err, "Failed to ping domainflow_production database")

	t.Logf("Connected to database: %s", dsn)
	return db
}

// runMigration executes a migration file against the database, handling already-applied migrations gracefully
func runMigration(db *sqlx.DB, migrationFile string) error {
	// Read the migration file
	migrationSQL, err := os.ReadFile(migrationFile)
	if err != nil {
		return err
	}

	// Start a new transaction for the migration
	tx, err := db.Beginx()
	if err != nil {
		return err
	}
	defer tx.Rollback() // This will be ignored if tx.Commit() succeeds

	// Execute the migration within the transaction
	_, err = tx.Exec(string(migrationSQL))
	if err != nil {
		// Check if it's an "already exists" error - if so, migration was already applied
		if strings.Contains(err.Error(), "already exists") {
			// Migration already applied, this is fine - commit the empty transaction
			return tx.Commit()
		}
		// Real error occurred, rollback and return error
		return err
	}

	// Migration succeeded, commit the transaction
	return tx.Commit()
}