package main

import (
	"bufio"
	"database/sql"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	_ "github.com/lib/pq"
)

// MigrationFile represents a migration file with its metadata
type MigrationFile struct {
	Version       uint
	Direction     string
	Name          string
	Path          string
	Content       string
	HasConcurrent bool
}

func main() {
	// Define command line flags
	var (
		dsn           string
		migrationsDir string
		direction     string
	)

	flag.StringVar(&dsn, "dsn", "", "PostgreSQL connection string (required)")
	flag.StringVar(&migrationsDir, "migrations", "database/migrations", "Directory containing migration files")
	flag.StringVar(&direction, "direction", "up", "Migration direction (up or down)")
	flag.Parse()

	// Validate flags
	if dsn == "" {
		dsn = os.Getenv("POSTGRES_DSN")
		if dsn == "" {
			log.Fatal("Database connection string (DSN) is required. Provide via -dsn flag or POSTGRES_DSN environment variable")
		}
	}

	log.Printf("Using migrations from: %s", migrationsDir)

	// Check if we need to use enhanced migration handling
	migrations, err := loadMigrations(migrationsDir)
	if err != nil {
		log.Fatalf("Failed to load migrations: %v", err)
	}

	// Use enhanced migration handler for all migrations
	log.Println("Using enhanced migration handler...")
	err = runEnhancedMigrations(dsn, migrations, direction)

	if err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	log.Println("Migrations completed successfully")
}

// loadMigrations loads and analyzes all migration files
func loadMigrations(dir string) ([]MigrationFile, error) {
	files, err := ioutil.ReadDir(dir)
	if err != nil {
		return nil, err
	}

	var migrations []MigrationFile
	concurrentRegex := regexp.MustCompile(`(?i)CREATE\s+INDEX\s+CONCURRENTLY`)

	for _, file := range files {
		if file.IsDir() {
			continue
		}

		// Parse migration filename (e.g., "000001_initial.up.sql")
		parts := strings.Split(file.Name(), "_")
		if len(parts) < 2 {
			continue
		}

		versionStr := parts[0]
		version, err := strconv.ParseUint(versionStr, 10, 64)
		if err != nil {
			continue
		}

		// Extract direction and name
		nameParts := strings.Split(file.Name(), ".")
		if len(nameParts) < 3 {
			continue
		}

		direction := nameParts[len(nameParts)-2] // "up" or "down"
		if direction != "up" && direction != "down" {
			continue
		}

		// Read file content
		filePath := filepath.Join(dir, file.Name())
		content, err := ioutil.ReadFile(filePath)
		if err != nil {
			return nil, fmt.Errorf("failed to read %s: %v", filePath, err)
		}

		// Check for CONCURRENTLY operations
		hasConcurrent := concurrentRegex.MatchString(string(content))

		migration := MigrationFile{
			Version:       uint(version),
			Direction:     direction,
			Name:          file.Name(),
			Path:          filePath,
			Content:       string(content),
			HasConcurrent: hasConcurrent,
		}

		migrations = append(migrations, migration)
	}

	// Sort by version
	sort.Slice(migrations, func(i, j int) bool {
		return migrations[i].Version < migrations[j].Version
	})

	return migrations, nil
}

// runEnhancedMigrations handles migrations with CONCURRENTLY operations
func runEnhancedMigrations(dsn string, migrations []MigrationFile, direction string) error {
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		return fmt.Errorf("failed to connect to database: %v", err)
	}
	defer db.Close()

	// Ensure schema_migrations table exists
	err = ensureSchemaTable(db)
	if err != nil {
		return fmt.Errorf("failed to ensure schema table: %v", err)
	}

	// Get current version
	currentVersion, dirty, err := getCurrentVersion(db)
	if err != nil {
		return fmt.Errorf("failed to get current version: %v", err)
	}

	if dirty {
		return fmt.Errorf("database is in dirty state, please resolve manually")
	}

	switch direction {
	case "up":
		return runMigrationsUp(db, migrations, currentVersion)
	case "down":
		return runMigrationsDown(db, migrations, currentVersion)
	default:
		return fmt.Errorf("invalid migration direction: %s", direction)
	}
}

// ensureSchemaTable creates the schema_migrations table if it doesn't exist
func ensureSchemaTable(db *sql.DB) error {
	query := `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version bigint NOT NULL PRIMARY KEY,
			dirty boolean NOT NULL
		)`
	_, err := db.Exec(query)
	return err
}

// getCurrentVersion gets the current migration version and dirty state
func getCurrentVersion(db *sql.DB) (uint, bool, error) {
	var version uint
	var dirty bool

	err := db.QueryRow("SELECT version, dirty FROM schema_migrations ORDER BY version DESC LIMIT 1").Scan(&version, &dirty)
	if err == sql.ErrNoRows {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}

	return version, dirty, nil
}

// runMigrationsUp runs migrations in the up direction
func runMigrationsUp(db *sql.DB, migrations []MigrationFile, currentVersion uint) error {
	for _, migration := range migrations {
		if migration.Direction != "up" || migration.Version <= currentVersion {
			continue
		}

		log.Printf("Applying migration %d: %s", migration.Version, migration.Name)

		err := applyMigration(db, migration)
		if err != nil {
			return fmt.Errorf("failed to apply migration %d: %v", migration.Version, err)
		}

		// Update version
		err = updateVersion(db, migration.Version, false)
		if err != nil {
			return fmt.Errorf("failed to update version: %v", err)
		}

		log.Printf("Successfully applied migration %d", migration.Version)
	}

	return nil
}

// runMigrationsDown runs migrations in the down direction
func runMigrationsDown(db *sql.DB, migrations []MigrationFile, currentVersion uint) error {
	// Sort migrations in reverse order for down migrations
	var downMigrations []MigrationFile
	for _, migration := range migrations {
		if migration.Direction == "down" && migration.Version <= currentVersion {
			downMigrations = append(downMigrations, migration)
		}
	}

	// Sort in descending order
	sort.Slice(downMigrations, func(i, j int) bool {
		return downMigrations[i].Version > downMigrations[j].Version
	})

	for _, migration := range downMigrations {
		log.Printf("Reverting migration %d: %s", migration.Version, migration.Name)

		err := applyMigration(db, migration)
		if err != nil {
			return fmt.Errorf("failed to revert migration %d: %v", migration.Version, err)
		}

		// Update version to previous
		newVersion := migration.Version - 1
		err = updateVersion(db, newVersion, false)
		if err != nil {
			return fmt.Errorf("failed to update version: %v", err)
		}

		log.Printf("Successfully reverted migration %d", migration.Version)
	}

	return nil
}

// applyMigration applies a single migration, handling CONCURRENTLY operations appropriately
func applyMigration(db *sql.DB, migration MigrationFile) error {
	// Set dirty state
	err := updateVersion(db, migration.Version, true)
	if err != nil {
		return fmt.Errorf("failed to set dirty state: %v", err)
	}

	if migration.HasConcurrent {
		// Execute CONCURRENTLY operations outside transaction
		log.Printf("Migration contains CONCURRENTLY operations, executing without transaction")
		err = executeConcurrentMigration(db, migration.Content)
	} else {
		// Execute regular migration in transaction
		err = executeTransactionalMigration(db, migration.Content)
	}

	if err != nil {
		return err
	}

	return nil
}

// executeConcurrentMigration executes migrations with CONCURRENTLY operations
func executeConcurrentMigration(db *sql.DB, content string) error {
	// Split content into statements and execute them one by one
	statements := splitSQLStatements(content)

	for _, stmt := range statements {
		stmt = strings.TrimSpace(stmt)
		if stmt == "" || strings.HasPrefix(stmt, "--") {
			continue
		}

		log.Printf("Executing: %s", truncateStatement(stmt))
		_, err := db.Exec(stmt)
		if err != nil {
			return fmt.Errorf("failed to execute statement: %v", err)
		}
	}

	return nil
}

// executeTransactionalMigration executes regular migrations in a transaction
func executeTransactionalMigration(db *sql.DB, content string) error {
	// Check if migration already has transaction control
	hasTransactionControl := strings.Contains(strings.ToUpper(content), "BEGIN") &&
		strings.Contains(strings.ToUpper(content), "COMMIT")

	if hasTransactionControl {
		// Migration handles its own transaction, execute directly
		log.Printf("Migration contains transaction control, executing directly")
		statements := splitSQLStatements(content)

		for _, stmt := range statements {
			stmt = strings.TrimSpace(stmt)
			if stmt == "" || strings.HasPrefix(stmt, "--") {
				continue
			}

			log.Printf("Executing: %s", truncateStatement(stmt))
			_, err := db.Exec(stmt)
			if err != nil {
				return fmt.Errorf("failed to execute statement: %v", err)
			}
		}
		return nil
	}

	// No transaction control, wrap in our own transaction
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("failed to begin transaction: %v", err)
	}
	defer tx.Rollback()

	_, err = tx.Exec(content)
	if err != nil {
		return fmt.Errorf("failed to execute migration: %v", err)
	}

	return tx.Commit()
}

// splitSQLStatements splits SQL content into individual statements
// Handles PostgreSQL function definitions with $$ delimiters properly
func splitSQLStatements(content string) []string {
	var statements []string
	var current strings.Builder
	inFunction := false
	var functionDelimiter string

	scanner := bufio.NewScanner(strings.NewReader(content))

	for scanner.Scan() {
		line := scanner.Text()
		trimmed := strings.TrimSpace(line)

		// Skip empty lines and comments (unless we're inside a function)
		if !inFunction && (trimmed == "" || strings.HasPrefix(trimmed, "--")) {
			continue
		}

		current.WriteString(line)
		current.WriteString("\n")

		// Check for function delimiters
		if !inFunction && strings.Contains(trimmed, "$$") {
			// Extract the delimiter (everything between the first $$ markers)
			parts := strings.Split(trimmed, "$$")
			if len(parts) >= 2 {
				functionDelimiter = "$$" + parts[1] + "$$"
				inFunction = true
				continue
			}
		}

		// Check for end of function
		if inFunction && strings.Contains(trimmed, functionDelimiter) {
			inFunction = false
			functionDelimiter = ""
			// Function definition complete, add as statement
			if strings.HasSuffix(trimmed, ";") {
				statements = append(statements, current.String())
				current.Reset()
			}
			continue
		}

		// If not in function and line ends with semicolon, it's end of statement
		if !inFunction && strings.HasSuffix(trimmed, ";") {
			statements = append(statements, current.String())
			current.Reset()
		}
	}

	// Add any remaining content
	if current.Len() > 0 {
		statements = append(statements, current.String())
	}

	return statements
}

// updateVersion updates the migration version in the database
func updateVersion(db *sql.DB, version uint, dirty bool) error {
	// Delete existing version
	_, err := db.Exec("DELETE FROM schema_migrations")
	if err != nil {
		return err
	}

	// Insert new version
	_, err = db.Exec("INSERT INTO schema_migrations (version, dirty) VALUES ($1, $2)", version, dirty)
	return err
}

// truncateStatement truncates a SQL statement for logging
func truncateStatement(stmt string) string {
	if len(stmt) > 100 {
		return stmt[:100] + "..."
	}
	return stmt
}
