// File: backend/internal/store/pagination.go
package store

import (
	"encoding/base64"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// CursorDirection represents the direction for cursor-based pagination
type CursorDirection string

const (
	CursorDirectionForward  CursorDirection = "forward"
	CursorDirectionBackward CursorDirection = "backward"
)

// CursorInfo represents cursor information for pagination
type CursorInfo struct {
	ID        uuid.UUID `json:"id"`
	Timestamp time.Time `json:"timestamp"`
	Offset    int64     `json:"offset,omitempty"` // For offset-based cursors
	Name      string    `json:"name,omitempty"`   // For name-based cursors
}

// EncodeCursor encodes cursor information into a base64 string
func EncodeCursor(info CursorInfo) string {
	parts := []string{
		info.ID.String(),
		strconv.FormatInt(info.Timestamp.Unix(), 10),
	}

	if info.Offset > 0 {
		parts = append(parts, strconv.FormatInt(info.Offset, 10))
	}

	if info.Name != "" {
		parts = append(parts, info.Name)
	}

	encoded := strings.Join(parts, "|")
	return base64.URLEncoding.EncodeToString([]byte(encoded))
}

// DecodeCursor decodes a base64 cursor string back to CursorInfo
func DecodeCursor(cursor string) (*CursorInfo, error) {
	if cursor == "" {
		return nil, nil
	}

	decoded, err := base64.URLEncoding.DecodeString(cursor)
	if err != nil {
		return nil, fmt.Errorf("invalid cursor format: %w", err)
	}

	parts := strings.Split(string(decoded), "|")
	if len(parts) < 2 {
		return nil, fmt.Errorf("invalid cursor structure: insufficient parts")
	}

	id, err := uuid.Parse(parts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid cursor ID: %w", err)
	}

	timestamp, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid cursor timestamp: %w", err)
	}

	info := &CursorInfo{
		ID:        id,
		Timestamp: time.Unix(timestamp, 0),
	}

	if len(parts) > 2 && parts[2] != "" {
		if offset, err := strconv.ParseInt(parts[2], 10, 64); err == nil {
			info.Offset = offset
		}
	}

	if len(parts) > 3 && parts[3] != "" {
		info.Name = parts[3]
	}

	return info, nil
}

// CursorPaginationFilter represents cursor-based pagination parameters
type CursorPaginationFilter struct {
	First     int             `json:"first,omitempty"`     // Number of items to fetch forward
	Last      int             `json:"last,omitempty"`      // Number of items to fetch backward
	After     string          `json:"after,omitempty"`     // Cursor to paginate after
	Before    string          `json:"before,omitempty"`    // Cursor to paginate before
	Direction CursorDirection `json:"direction,omitempty"` // Pagination direction
	SortBy    string          `json:"sortBy,omitempty"`    // Sort field (created_at, offset_index, domain_name)
	SortOrder string          `json:"sortOrder,omitempty"` // Sort order (ASC, DESC)
}

// GetLimit returns the effective limit for the pagination
func (f *CursorPaginationFilter) GetLimit() int {
	if f.First > 0 {
		return f.First
	}
	if f.Last > 0 {
		return f.Last
	}
	return 50 // Default limit
}

// GetDirection returns the effective direction for pagination
func (f *CursorPaginationFilter) GetDirection() CursorDirection {
	if f.Direction != "" {
		return f.Direction
	}
	if f.After != "" {
		return CursorDirectionForward
	}
	if f.Before != "" {
		return CursorDirectionBackward
	}
	return CursorDirectionForward
}

// GetSortBy returns the effective sort field
func (f *CursorPaginationFilter) GetSortBy() string {
	if f.SortBy != "" {
		return f.SortBy
	}
	return "created_at"
}

// GetSortOrder returns the effective sort order
func (f *CursorPaginationFilter) GetSortOrder() string {
	if f.SortOrder != "" {
		return strings.ToUpper(f.SortOrder)
	}
	return "ASC"
}

// Enhanced filters with cursor pagination support
type ListGeneratedDomainsFilter struct {
	CursorPaginationFilter
	CampaignID       uuid.UUID `json:"campaignId"`
	ValidationStatus string    `json:"validationStatus,omitempty"`

	// Phase 2 filtering extensions
	// MinScore filters domains with domain_score >= MinScore (inclusive)
	MinScore *float64 `json:"minScore,omitempty"`
	// Keyword filters domains whose feature_vector indicates keyword presence. Implementation detail: relies on kw_unique > 0 extracted during HTTP enrichment/scoring.
	Keyword *string `json:"keyword,omitempty"`
	// HasContact when true returns only domains whose feature_vector contains contact signal (kw_contact > 0 or similar). If false (nil) ignored.
	HasContact *bool `json:"hasContact,omitempty"`
	// NotParked excludes domains classified as parked (is_parked IS TRUE) when set true.
	NotParked *bool `json:"notParked,omitempty"`
	// ScoreNotNull enforces domain_score IS NOT NULL when true (used implicitly when MinScore provided)
	ScoreNotNull *bool `json:"scoreNotNull,omitempty"`
}

// WantsNotParked returns true if caller explicitly requests filtering out parked domains.
func (f *ListGeneratedDomainsFilter) WantsNotParked() bool {
	return f.NotParked != nil && *f.NotParked
}

// WantsHasContact returns true if filter requires contact presence.
func (f *ListGeneratedDomainsFilter) WantsHasContact() bool {
	return f.HasContact != nil && *f.HasContact
}

// WantsScoreNotNull returns true if score must be non-null (automatically satisfied if MinScore != nil)
func (f *ListGeneratedDomainsFilter) WantsScoreNotNull() bool {
	if f.MinScore != nil {
		return true
	}
	return f.ScoreNotNull != nil && *f.ScoreNotNull
}

// PageInfo represents pagination metadata for cursor-based pagination
type PageInfo struct {
	HasNextPage     bool   `json:"hasNextPage"`
	HasPreviousPage bool   `json:"hasPreviousPage"`
	StartCursor     string `json:"startCursor,omitempty"`
	EndCursor       string `json:"endCursor,omitempty"`
	TotalCount      int64  `json:"totalCount,omitempty"`
}

// PaginatedResult represents a paginated result with cursor information
type PaginatedResult[T any] struct {
	Data     []T      `json:"data"`
	PageInfo PageInfo `json:"pageInfo"`
}
