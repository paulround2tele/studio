// File: backend/internal/api/api_utils.go
package api

import (
	// All legacy response functions removed - using unified APIResponse format only
)

// DNScampaignAPIType is the canonical type string for DNS validation campaigns.
// This might be deprecated if we move to models.CampaignTypeEnum everywhere.
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

// Legacy response functions removed - all handlers now use unified APIResponse format
// via respondWithJSONGin() and respondWithErrorGin()

// Helper to get a Querier (either *sqlx.DB or *sqlx.Tx) from a store instance.
// This is useful if a utility function needs to perform read-only operations and the store itself is passed.
// func getQuerierFromStore(s interface{}) (store.Querier, error) {
// 	if querier, ok := s.(store.Querier); ok {
// 		return querier, nil
// 	}
// 	return nil, fmt.Errorf("store does not implement Querier interface")
// }
