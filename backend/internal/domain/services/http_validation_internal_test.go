package services

import "testing"

func TestSanitizeHTTPStatusCode(t *testing.T) {
	tests := []struct {
		name string
		code int
		want *int32
	}{
		{name: "lower bound", code: 100, want: func() *int32 { v := int32(100); return &v }()},
		{name: "upper bound", code: 599, want: func() *int32 { v := int32(599); return &v }()},
		{name: "below range", code: 42, want: nil},
		{name: "above range", code: 702, want: nil},
		{name: "negative", code: -10, want: nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := sanitizeHTTPStatusCode(tt.code)
			if tt.want == nil {
				if got != nil {
					t.Fatalf("expected nil, got %d", *got)
				}
				return
			}
			if got == nil || *got != *tt.want {
				t.Fatalf("expected %d, got %v", *tt.want, got)
			}
		})
	}
}
