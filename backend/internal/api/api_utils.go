//go:build legacy_gin
// +build legacy_gin

// File: backend/internal/api/api_utils.go
package api

// DNScampaignAPIType is the canonical type string for DNS validation campaigns.
const DNScampaignAPIType = "DNS_VALIDATION"

// HTTPcampaignAPIType is the canonical type string for HTTP validation campaigns.
const HTTPcampaignAPIType = "HTTP_VALIDATION"

// MaxUploadSize defines the maximum upload size for files (e.g., domain lists).
const MaxUploadSize = 5 * 1024 * 1024 // 5 MB

// Constants for DomainInputSource, moved here for central access.
const (
	SourceTypeDNSCampaignPrefix = "dnsCampaignID:"
	SourceTypeFileUpload        = "fileUpload"
)

// Helper to get a Querier (either *sqlx.DB or *sqlx.Tx) from a store instance.
// This is useful if a utility function needs to perform read-only operations and the store itself is passed.
// func getQuerierFromStore(s interface{}) (store.Querier, error) {
// 	if querier, ok := s.(store.Querier); ok {
// 		return querier, nil
// 	}
// 	return nil, fmt.Errorf("store does not implement Querier interface")
// }
