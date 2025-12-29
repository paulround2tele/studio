package models

import (
	"testing"
)

func TestDomainRejectionReasonEnumValues(t *testing.T) {
	// Test that all expected enum values exist (9 values, NO legacy)
	expectedValues := []DomainRejectionReasonEnum{
		DomainRejectionReasonQualified,
		DomainRejectionReasonLowScore,
		DomainRejectionReasonNoKeywords,
		DomainRejectionReasonParked,
		DomainRejectionReasonDNSError,
		DomainRejectionReasonDNSTimeout,
		DomainRejectionReasonHTTPError,
		DomainRejectionReasonHTTPTimeout,
		DomainRejectionReasonPending,
	}

	if len(expectedValues) != 9 {
		t.Errorf("Expected 9 rejection reason enum values, got %d", len(expectedValues))
	}

	// Verify string values match database enum
	tests := []struct {
		enum     DomainRejectionReasonEnum
		expected string
	}{
		{DomainRejectionReasonQualified, "qualified"},
		{DomainRejectionReasonLowScore, "low_score"},
		{DomainRejectionReasonNoKeywords, "no_keywords"},
		{DomainRejectionReasonParked, "parked"},
		{DomainRejectionReasonDNSError, "dns_error"},
		{DomainRejectionReasonDNSTimeout, "dns_timeout"},
		{DomainRejectionReasonHTTPError, "http_error"},
		{DomainRejectionReasonHTTPTimeout, "http_timeout"},
		{DomainRejectionReasonPending, "pending"},
	}

	for _, tt := range tests {
		t.Run(string(tt.enum), func(t *testing.T) {
			if string(tt.enum) != tt.expected {
				t.Errorf("Expected %s, got %s", tt.expected, string(tt.enum))
			}
		})
	}
}

func TestDomainRejectionReasonEnumIsValid(t *testing.T) {
	tests := []struct {
		name    string
		value   DomainRejectionReasonEnum
		isValid bool
	}{
		{"qualified is valid", DomainRejectionReasonQualified, true},
		{"low_score is valid", DomainRejectionReasonLowScore, true},
		{"no_keywords is valid", DomainRejectionReasonNoKeywords, true},
		{"parked is valid", DomainRejectionReasonParked, true},
		{"dns_error is valid", DomainRejectionReasonDNSError, true},
		{"dns_timeout is valid", DomainRejectionReasonDNSTimeout, true},
		{"http_error is valid", DomainRejectionReasonHTTPError, true},
		{"http_timeout is valid", DomainRejectionReasonHTTPTimeout, true},
		{"pending is valid", DomainRejectionReasonPending, true},
		{"invalid value", DomainRejectionReasonEnum("unknown"), false},
		{"empty value", DomainRejectionReasonEnum(""), false},
		{"legacy is NOT valid", DomainRejectionReasonEnum("legacy"), false},
		{"timeout is NOT valid (use dns_timeout/http_timeout)", DomainRejectionReasonEnum("timeout"), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := tt.value.IsValid(); got != tt.isValid {
				t.Errorf("IsValid() = %v, want %v", got, tt.isValid)
			}
		})
	}
}

func TestValidRejectionReasons(t *testing.T) {
	reasons := ValidRejectionReasons()

	if len(reasons) != 9 {
		t.Errorf("Expected 9 valid rejection reasons, got %d", len(reasons))
	}

	// Verify all returned values are valid
	for _, reason := range reasons {
		if !reason.IsValid() {
			t.Errorf("ValidRejectionReasons() returned invalid value: %s", reason)
		}
	}

	// Verify legacy is NOT in the list
	for _, reason := range reasons {
		if reason == "legacy" {
			t.Error("ValidRejectionReasons() should NOT contain 'legacy'")
		}
	}
}

func TestParseRejectionReason(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    DomainRejectionReasonEnum
		wantErr bool
	}{
		{"valid qualified", "qualified", DomainRejectionReasonQualified, false},
		{"valid dns_timeout", "dns_timeout", DomainRejectionReasonDNSTimeout, false},
		{"valid http_timeout", "http_timeout", DomainRejectionReasonHTTPTimeout, false},
		{"valid pending", "pending", DomainRejectionReasonPending, false},
		{"invalid legacy", "legacy", "", true},
		{"invalid timeout", "timeout", "", true},
		{"invalid unknown", "unknown", "", true},
		{"invalid empty", "", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseRejectionReason(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseRejectionReason() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && got != tt.want {
				t.Errorf("ParseRejectionReason() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestGeneratedDomainRejectionReasonField(t *testing.T) {
	// Test that the RejectionReason field is properly typed
	domain := GeneratedDomain{}

	// Should be nil by default
	if domain.RejectionReason != nil {
		t.Error("Expected RejectionReason to be nil by default")
	}

	// Test setting a value
	qualified := DomainRejectionReasonQualified
	domain.RejectionReason = &qualified

	if *domain.RejectionReason != DomainRejectionReasonQualified {
		t.Errorf("Expected qualified, got %s", *domain.RejectionReason)
	}

	// Test setting all valid values
	allValues := ValidRejectionReasons()
	for _, tc := range allValues {
		reason := tc
		domain.RejectionReason = &reason
		if *domain.RejectionReason != tc {
			t.Errorf("Expected %s, got %s", tc, *domain.RejectionReason)
		}
	}
}
