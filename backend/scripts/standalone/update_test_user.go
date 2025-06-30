//go:build ignore
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

func main() {
	// Open database connection
	db, err := sql.Open("sqlite3", "database/studio.db")
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	// The correct password hash for "password123" with pepper
	passwordHash := "$2a$12$h9CcwfFnHN/xZS8RCHOQTOcwzBYtQaLGppOxs8c6fjW4Hm/eHONOG"

	// Update the test user's password
	result, err := db.Exec("UPDATE users SET password_hash = ? WHERE email = ?", passwordHash, "test@example.com")
	if err != nil {
		log.Fatal(err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("Updated %d user(s)\n", rowsAffected)

	// Verify the update
	var email, hash string
	err = db.QueryRow("SELECT email, password_hash FROM users WHERE email = ?", "test@example.com").Scan(&email, &hash)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Printf("User: %s\nPassword Hash: %s\n", email, hash)
}
