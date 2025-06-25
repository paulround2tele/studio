package api

import "testing"

func TestIsValidSemanticVersion(t *testing.T) {
	cases := map[string]bool{
		"1.0.0":      true,
		"v2.1.3":     true,
		"1.0":        false,
		"1.0.0-beta": true,
		"1":          false,
		"a.b.c":      false,
	}
	for v, expected := range cases {
		if IsValidSemanticVersion(v) != expected {
			t.Errorf("IsValidSemanticVersion(%s)=%v, expected %v", v, !expected, expected)
		}
	}
}
