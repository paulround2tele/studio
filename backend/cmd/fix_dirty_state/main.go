package main

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	dsn := os.Getenv("POSTGRES_DSN")
	if dsn == "" {
		dsn = "postgres://domainflow:pNpTHxEWr2SmY270p1IjGn3dP@localhost:5432/domainflow_production?sslmode=disable"
	}

	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Check current state
	var version uint
	var dirty bool
	err = db.QueryRow("SELECT version, dirty FROM schema_migrations ORDER BY version DESC LIMIT 1").Scan(&version, &dirty)
	if err != nil {
		log.Fatalf("Failed to get current version: %v", err)
	}

	fmt.Printf("Current version: %d, dirty: %t\n", version, dirty)

	if dirty {
		// Set dirty to false
		_, err = db.Exec("UPDATE schema_migrations SET dirty = false WHERE version = $1", version)
		if err != nil {
			log.Fatalf("Failed to clear dirty state: %v", err)
		}
		fmt.Printf("Cleared dirty state for version %d\n", version)
	} else {
		fmt.Println("Database is not in dirty state")
	}
}
