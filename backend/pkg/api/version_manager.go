package api

import (
	"context"
	"database/sql"
	"fmt"
	"regexp"
	"time"
)

// VersionStrategy defines how clients select API versions.
type VersionStrategy string

const (
	VersionStrategyURL    VersionStrategy = "url"
	VersionStrategyHeader VersionStrategy = "header"
	VersionStrategyQuery  VersionStrategy = "query"
)

// VersionStatus represents lifecycle state of a version.
type VersionStatus string

const (
	VersionStatusDraft      VersionStatus = "draft"
	VersionStatusActive     VersionStatus = "active"
	VersionStatusDeprecated VersionStatus = "deprecated"
)

// BreakingChange describes a backward incompatible change.
type BreakingChange struct {
	Type        string
	Description string
	Impact      string
	Mitigation  string
}

// APIVersion holds metadata for a service version.
type APIVersion struct {
	ServiceName     string           `json:"service_name"`
	Version         string           `json:"version"`
	Strategy        VersionStrategy  `json:"strategy"`
	Status          VersionStatus    `json:"status"`
	SupportedUntil  *time.Time       `json:"supported_until,omitempty"`
	MigrationPath   string           `json:"migration_path,omitempty"`
	BreakingChanges []BreakingChange `json:"breaking_changes"`
}

// APIVersionManager manages API versions.
type APIVersionManager struct {
	db *sql.DB
}

// NewAPIVersionManager creates a new manager.
func NewAPIVersionManager(db *sql.DB) *APIVersionManager {
	return &APIVersionManager{db: db}
}

var semverRegexp = regexp.MustCompile(`^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[^+]+)?(?:\+.+)?$`)

// IsValidSemanticVersion validates a version string.
func IsValidSemanticVersion(v string) bool {
	return semverRegexp.MatchString(v)
}

// CreateNewVersion validates and stores a new version record.
func (vm *APIVersionManager) CreateNewVersion(ctx context.Context, serviceName, currentVersion, newVersion string, changes []BreakingChange) (*APIVersion, error) {
	if !IsValidSemanticVersion(newVersion) {
		return nil, fmt.Errorf("invalid semantic version: %s", newVersion)
	}

	version := &APIVersion{
		ServiceName:     serviceName,
		Version:         newVersion,
		Strategy:        VersionStrategyURL,
		Status:          VersionStatusDraft,
		BreakingChanges: changes,
	}

	// In real implementation this would persist to database.
	_ = ctx
	_ = currentVersion
	if vm.db != nil {
		// placeholder: pretend to store
		if err := vm.db.PingContext(ctx); err != nil {
			return nil, fmt.Errorf("db ping failed: %w", err)
		}
	}
	return version, nil
}
