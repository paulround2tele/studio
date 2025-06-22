// File: backend/internal/models/versioned_config.go
package models

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// VersionedDomainGenerationConfigState represents a domain generation configuration with version control
type VersionedDomainGenerationConfigState struct {
	ConfigHash    string          `db:"config_hash" json:"configHash"`
	LastOffset    int64           `db:"last_offset" json:"lastOffset"`
	ConfigDetails json.RawMessage `db:"config_details" json:"configDetails"`
	Version       int64           `db:"version" json:"version"`
	UpdatedAt     time.Time       `db:"updated_at" json:"updatedAt"`
	CreatedAt     time.Time       `db:"created_at" json:"createdAt"`
}

// AtomicConfigUpdateResult represents the result of an atomic configuration update
type AtomicConfigUpdateResult struct {
	Success         bool           `db:"success" json:"success"`
	NewVersion      int64          `db:"new_version" json:"newVersion"`
	ConflictVersion int64          `db:"conflict_version" json:"conflictVersion"`
	ErrorMessage    sql.NullString `db:"error_message" json:"errorMessage,omitempty"`
}

// ConfigUpdateRequest represents a request to update configuration atomically
type ConfigUpdateRequest struct {
	ConfigHash      string          `json:"configHash"`
	ExpectedVersion int64           `json:"expectedVersion"`
	NewLastOffset   int64           `json:"newLastOffset"`
	ConfigDetails   json.RawMessage `json:"configDetails"`
}

// ConfigLockType defines the type of lock to acquire on configuration
type ConfigLockType string

const (
	ConfigLockTypeNone      ConfigLockType = "none"
	ConfigLockTypeShared    ConfigLockType = "shared"
	ConfigLockTypeExclusive ConfigLockType = "exclusive"
)

// ConfigConsistencyError represents an error during configuration consistency checks
type ConfigConsistencyError struct {
	ConfigHash      string `json:"configHash"`
	ExpectedVersion int64  `json:"expectedVersion"`
	ActualVersion   int64  `json:"actualVersion"`
	ExpectedOffset  int64  `json:"expectedOffset"`
	ActualOffset    int64  `json:"actualOffset"`
	Message         string `json:"message"`
}

func (e *ConfigConsistencyError) Error() string {
	return e.Message
}

// NewConfigConsistencyError creates a new configuration consistency error
func NewConfigConsistencyError(configHash string, expectedVersion, actualVersion, expectedOffset, actualOffset int64, message string) *ConfigConsistencyError {
	return &ConfigConsistencyError{
		ConfigHash:      configHash,
		ExpectedVersion: expectedVersion,
		ActualVersion:   actualVersion,
		ExpectedOffset:  expectedOffset,
		ActualOffset:    actualOffset,
		Message:         message,
	}
}

// ConfigVersionMismatchError represents a version mismatch during optimistic locking
type ConfigVersionMismatchError struct {
	ConfigHash      string `json:"configHash"`
	ExpectedVersion int64  `json:"expectedVersion"`
	ActualVersion   int64  `json:"actualVersion"`
}

func (e *ConfigVersionMismatchError) Error() string {
	return fmt.Sprintf("config version mismatch for hash %s: expected %d, actual %d",
		e.ConfigHash, e.ExpectedVersion, e.ActualVersion)
}

// ConfigOffsetRegressionError represents an attempt to move offset backward
type ConfigOffsetRegressionError struct {
	ConfigHash    string `json:"configHash"`
	CurrentOffset int64  `json:"currentOffset"`
	NewOffset     int64  `json:"newOffset"`
}

func (e *ConfigOffsetRegressionError) Error() string {
	return fmt.Sprintf("config offset regression for hash %s: attempting to move from %d to %d",
		e.ConfigHash, e.CurrentOffset, e.NewOffset)
}

// ConfigRaceConditionError represents a race condition detected during configuration update
type ConfigRaceConditionError struct {
	ConfigHash     string `json:"configHash"`
	OperationType  string `json:"operationType"`
	ConflictReason string `json:"conflictReason"`
	RetryAfterMs   int64  `json:"retryAfterMs,omitempty"`
}

func (e *ConfigRaceConditionError) Error() string {
	return fmt.Sprintf("race condition detected for config %s during %s: %s",
		e.ConfigHash, e.OperationType, e.ConflictReason)
}

// NewConfigRaceConditionError creates a new race condition error
func NewConfigRaceConditionError(configHash, operationType, conflictReason string, retryAfterMs int64) *ConfigRaceConditionError {
	return &ConfigRaceConditionError{
		ConfigHash:     configHash,
		OperationType:  operationType,
		ConflictReason: conflictReason,
		RetryAfterMs:   retryAfterMs,
	}
}

// IsValid validates the versioned configuration state
func (v *VersionedDomainGenerationConfigState) IsValid() bool {
	return v != nil &&
		v.ConfigHash != "" &&
		v.Version > 0 &&
		v.LastOffset >= 0 &&
		len(v.ConfigDetails) > 0
}

// GetAge returns the age of the configuration
func (v *VersionedDomainGenerationConfigState) GetAge() time.Duration {
	if v == nil {
		return 0
	}
	return time.Since(v.CreatedAt)
}

// GetLastUpdateAge returns the time since last update
func (v *VersionedDomainGenerationConfigState) GetLastUpdateAge() time.Duration {
	if v == nil {
		return 0
	}
	return time.Since(v.UpdatedAt)
}

// ToConfigVersion converts to ConfigVersion for compatibility
func (v *VersionedDomainGenerationConfigState) ToConfigVersion() *ConfigVersion {
	if v == nil {
		return nil
	}

	configState := &DomainGenerationConfigState{
		ConfigHash:    v.ConfigHash,
		LastOffset:    v.LastOffset,
		ConfigDetails: v.ConfigDetails,
		UpdatedAt:     v.UpdatedAt,
	}

	return &ConfigVersion{
		ID:           uuid.New(),
		ConfigHash:   v.ConfigHash,
		Version:      v.Version,
		ConfigState:  configState,
		CreatedAt:    v.CreatedAt,
		LastAccessed: time.Now().UTC(),
	}
}

// FromConfigVersion creates from ConfigVersion
func FromConfigVersion(cv *ConfigVersion) *VersionedDomainGenerationConfigState {
	if cv == nil || cv.ConfigState == nil {
		return nil
	}

	return &VersionedDomainGenerationConfigState{
		ConfigHash:    cv.ConfigHash,
		LastOffset:    cv.ConfigState.LastOffset,
		ConfigDetails: cv.ConfigState.ConfigDetails,
		Version:       cv.Version,
		UpdatedAt:     cv.ConfigState.UpdatedAt,
		CreatedAt:     cv.CreatedAt,
	}
}

// Helper functions

// NewVersionedDomainGenerationConfigState creates a new versioned configuration state
func NewVersionedDomainGenerationConfigState(configHash string, lastOffset int64, configDetails json.RawMessage) *VersionedDomainGenerationConfigState {
	now := time.Now().UTC()
	return &VersionedDomainGenerationConfigState{
		ConfigHash:    configHash,
		LastOffset:    lastOffset,
		ConfigDetails: configDetails,
		Version:       1,
		UpdatedAt:     now,
		CreatedAt:     now,
	}
}

// ConfigValidationCheck represents a single validation check result (different from ConfigConsistencyCheck)
type ConfigValidationCheck struct {
	CheckType    string    `json:"checkType"`
	CheckPassed  bool      `json:"checkPassed"`
	ErrorMessage string    `json:"errorMessage,omitempty"`
	CheckedAt    time.Time `json:"checkedAt"`
}

// ConfigValidationResult represents the result of configuration validation
type ConfigValidationResult struct {
	IsValid          bool                    `json:"isValid"`
	ConfigHash       string                  `json:"configHash"`
	CurrentVersion   int64                   `json:"currentVersion"`
	CurrentOffset    int64                   `json:"currentOffset"`
	ValidationErrors []string                `json:"validationErrors"`
	ValidationChecks []ConfigValidationCheck `json:"validationChecks"`
	ValidatedAt      time.Time               `json:"validatedAt"`
}

// NewAtomicConfigUpdateRequest creates a new atomic configuration update request
func NewAtomicConfigUpdateRequest(configHash string, expectedVersion, newLastOffset int64, configDetails json.RawMessage) *ConfigUpdateRequest {
	return &ConfigUpdateRequest{
		ConfigHash:      configHash,
		ExpectedVersion: expectedVersion,
		NewLastOffset:   newLastOffset,
		ConfigDetails:   configDetails,
	}
}

// NewConfigVersionMismatchError creates a new version mismatch error
func NewConfigVersionMismatchError(configHash string, expectedVersion, actualVersion int64) *ConfigVersionMismatchError {
	return &ConfigVersionMismatchError{
		ConfigHash:      configHash,
		ExpectedVersion: expectedVersion,
		ActualVersion:   actualVersion,
	}
}

// NewConfigOffsetRegressionError creates a new offset regression error
func NewConfigOffsetRegressionError(configHash string, currentOffset, newOffset int64) *ConfigOffsetRegressionError {
	return &ConfigOffsetRegressionError{
		ConfigHash:    configHash,
		CurrentOffset: currentOffset,
		NewOffset:     newOffset,
	}
}
