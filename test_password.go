package main

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := "AdminPassword123!"
	hash := "$2a$06$5VYWbzyw5BRcB62Wtg0/e.KAviBmAujyoqa6mKctjoljA08g4Ol8O"

	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil {
		fmt.Printf("Password verification failed: %v\n", err)
	} else {
		fmt.Println("Password verification successful!")
	}
}
