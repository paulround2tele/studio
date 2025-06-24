#!/bin/bash

# Test the database connection directly
cd "$(dirname "$0")"

export DB_CONNECTION="postgres://domainflow:pNpTHxEWr2SmY270p1IjGn3dP@localhost:5432/domainflow_production?sslmode=disable"

echo "🔍 Testing database connection..."

# Test with a simple Go program
cat > test_db.go << 'EOF'
package main

import (
	"database/sql"
	"fmt"
	"log"
	"mcp/internal/config"
	"os"

	_ "github.com/lib/pq"
)

func main() {
	config.Flags.DbUrl = os.Getenv("DB_CONNECTION")
	
	if config.Flags.DbUrl == "" {
		log.Fatal("DB_CONNECTION environment variable is required")
	}

	db, err := sql.Open("postgres", config.Flags.DbUrl)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}
	defer db.Close()

	// Test the connection
	if err := db.Ping(); err != nil {
		log.Fatalf("Failed to ping database: %v", err)
	}

	fmt.Println("✅ Database connection successful")

	// Test a simple query
	rows, err := db.Query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 5")
	if err != nil {
		log.Fatalf("Failed to query database: %v", err)
	}
	defer rows.Close()

	fmt.Println("📋 First 5 tables:")
	for rows.Next() {
		var tableName string
		if err := rows.Scan(&tableName); err != nil {
			log.Printf("Failed to scan row: %v", err)
			continue
		}
		fmt.Printf("  - %s\n", tableName)
	}
}
EOF

go run test_db.go
rm test_db.go
