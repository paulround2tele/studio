package postgres

import (
	"strings"
	"testing"
)

func TestGetCampaignDomainCountersSQLHasNoEscapes(t *testing.T) {
	if strings.Contains(getCampaignDomainCountersSQL, "\\n") {
		t.Fatalf("getCampaignDomainCountersSQL contains literal newline escape: %q", getCampaignDomainCountersSQL)
	}
	if strings.Contains(getCampaignDomainCountersSQL, "\\r") {
		t.Fatalf("getCampaignDomainCountersSQL contains literal carriage return escape: %q", getCampaignDomainCountersSQL)
	}
}
