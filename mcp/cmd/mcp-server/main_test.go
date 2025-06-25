package main

import "testing"

func TestMaskPassword(t *testing.T) {
	tests := []struct {
		in  string
		out string
	}{
		{"postgres://user:secret@localhost:5432/dbname", "postgres://user:%2A%2A%2A%2A%2A%2A@localhost:5432/dbname"},
		{"postgres://user@localhost/dbname", "postgres://user@localhost/dbname"},
	}

	for _, tt := range tests {
		got := maskPassword(tt.in)
		if got != tt.out {
			t.Errorf("maskPassword(%q) = %q, want %q", tt.in, got, tt.out)
		}
	}
}
