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

	// Check current constraint
	var constraintDef string
	err = db.QueryRow(`
		SELECT pg_get_constraintdef(c.oid) FROM pg_constraint c
		JOIN pg_class t ON c.conrelid = t.oid
		WHERE c.conname = 'chk_campaign_jobs_type_valid' AND t.relname = 'campaign_jobs'
	`).Scan(&constraintDef)

	if err != nil {
		log.Fatalf("Failed to get constraint: %v", err)
	}

	fmt.Printf("Current constraint definition: %s\n", constraintDef)

	// Check what values are actually in the table
	rows, err := db.Query("SELECT job_type, COUNT(*) FROM campaign_jobs GROUP BY job_type")
	if err != nil {
		log.Fatalf("Failed to query job types: %v", err)
	}
	defer rows.Close()

	fmt.Println("\nCurrent job_type values in database:")
	for rows.Next() {
		var jobType string
		var count int
		if err := rows.Scan(&jobType, &count); err != nil {
			log.Fatalf("Failed to scan row: %v", err)
		}
		fmt.Printf("  %s: %d\n", jobType, count)
	}
}
