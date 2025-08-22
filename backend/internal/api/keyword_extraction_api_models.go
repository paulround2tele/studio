// File: backend/internal/api/keyword_extraction_api_models.go
package api

// KeywordExtractionRequestItem defines a single item in a batch keyword extraction request.
type KeywordExtractionRequestItem struct {
	URL           string  `json:"url" validate:"required,url"`
	HTTPPersonaID *string `json:"httpPersonaId,omitempty" validate:"omitempty,uuid"` // Optional: string representation of UUID
	DNSPersonaID  *string `json:"dnsPersonaId,omitempty" validate:"omitempty,uuid"`  // Optional: string representation of UUID
	KeywordSetID  string  `json:"keywordSetId" validate:"required,uuid"`             // Required: string representation of UUID
	// Add other per-item settings if needed, e.g., specific proxy to use
}

// BatchKeywordExtractionRequest is the request body for batch keyword extraction.
type BatchKeywordExtractionRequest struct {
	Items []KeywordExtractionRequestItem `json:"items" validate:"required,min=1,dive"`
}

// KeywordExtractionMatch mirrors the extractor's result shape for OpenAPI stability
// @Description Keyword match result from content extraction
type KeywordExtractionMatch struct {
	MatchedPattern string   `json:"matchedPattern"`
	MatchedText    string   `json:"matchedText"`
	Category       string   `json:"category,omitempty"`
	Contexts       []string `json:"contexts,omitempty"`
}

// KeywordExtractionAPIResult defines the structure for a single keyword extraction result in the API response.
// It might differ slightly from internal representation if API needs to format it.
type KeywordExtractionAPIResult struct {
	URL               string                   `json:"url"`
	HTTPPersonaIDUsed *string                  `json:"httpPersonaIdUsed,omitempty"`
	DNSPersonaIDUsed  *string                  `json:"dnsPersonaIdUsed,omitempty"`
	ProxyIDUsed       *string                  `json:"proxyIdUsed,omitempty"`
	KeywordSetIDUsed  string                   `json:"keywordSetIdUsed"`
	Matches           []KeywordExtractionMatch `json:"matches,omitempty"`
	Error             string                   `json:"error,omitempty"`
	FinalURL          string                   `json:"finalUrl,omitempty"`
	StatusCode        int                      `json:"statusCode,omitempty"`
}

// BatchKeywordExtractionResponse is the response body for batch keyword extraction.
type BatchKeywordExtractionResponse struct {
	Results []KeywordExtractionAPIResult `json:"results"`
}
