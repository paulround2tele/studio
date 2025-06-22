// File: backend/internal/models/config_version.go
package models

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ConfigVersion represents a versioned configuration entry for atomic updates
type ConfigVersion struct {
	ID           uuid.UUID                    `db:"id" json:"id"`
	ConfigHash   string                       `db:"config_hash" json:"configHash"`
	Version      int64                        `db:"version" json:"version"`
	ConfigState  *DomainGenerationConfigState `db:"-" json:"configState"` // Not directly persisted, loaded separately
	CreatedAt    time.Time                    `db:"created_at" json:"createdAt"`
	LastAccessed time.Time                    `db:"last_accessed" json:"lastAccessed"`
}

// ConfigVersionHistory represents the history of configuration changes
type ConfigVersionHistory struct {
	ID              uuid.UUID            `db:"id" json:"id"`
	ConfigHash      string               `db:"config_hash" json:"configHash"`
	Version         int64                `db:"version" json:"version"`
	PreviousVersion *int64               `db:"previous_version" json:"previousVersion,omitempty"`
	ChangeType      ConfigChangeTypeEnum `db:"change_type" json:"changeType"`
	ChangedBy       string               `db:"changed_by" json:"changedBy"`
	ChangeReason    string               `db:"change_reason" json:"changeReason"`
	ChangeDetails   *json.RawMessage     `db:"change_details" json:"changeDetails,omitempty"`
	PreviousState   *json.RawMessage     `db:"previous_state" json:"previousState,omitempty"`
	NewState        *json.RawMessage     `db:"new_state" json:"newState,omitempty"`
	CreatedAt       time.Time            `db:"created_at" json:"createdAt"`
}

// ConfigChangeTypeEnum defines types of configuration changes
type ConfigChangeTypeEnum string

const (
	ConfigChangeTypeCreate       ConfigChangeTypeEnum = "create"
	ConfigChangeTypeUpdate       ConfigChangeTypeEnum = "update"
	ConfigChangeTypeOffsetUpdate ConfigChangeTypeEnum = "offset_update"
	ConfigChangeTypeDelete       ConfigChangeTypeEnum = "delete"
	ConfigChangeTypeReconcile    ConfigChangeTypeEnum = "reconcile"
)

// ConfigLockInfo represents information about configuration locks with distributed locking support
// Uses ConfigLockType from versioned_config.go (shared, exclusive, none)
type ConfigLockInfo struct {
	ID         uuid.UUID      `db:"id" json:"id"`
	ConfigHash string         `db:"config_hash" json:"configHash"`
	LockType   ConfigLockType `db:"lock_type" json:"lockType"`
	Owner      string         `db:"owner" json:"owner"`
	LockReason string         `db:"lock_reason" json:"lockReason"`
	AcquiredAt time.Time      `db:"acquired_at" json:"acquiredAt"`
	ExpiresAt  *time.Time     `db:"expires_at" json:"expiresAt,omitempty"`
	IsActive   bool           `db:"is_active" json:"isActive"`
	CreatedAt  time.Time      `db:"created_at" json:"createdAt"`
	UpdatedAt  time.Time      `db:"updated_at" json:"updatedAt"`

	// Backward compatibility fields (deprecated)
	LockedBy string    `db:"-" json:"lockedBy,omitempty"` // Maps to Owner
	LockedAt time.Time `db:"-" json:"lockedAt,omitempty"` // Maps to AcquiredAt
}

// ConfigMetrics represents configuration access and performance metrics
type ConfigMetrics struct {
	ConfigHash      string    `db:"config_hash" json:"configHash"`
	AccessCount     int64     `db:"access_count" json:"accessCount"`
	UpdateCount     int64     `db:"update_count" json:"updateCount"`
	CacheHits       int64     `db:"cache_hits" json:"cacheHits"`
	CacheMisses     int64     `db:"cache_misses" json:"cacheMisses"`
	AverageLoadTime float64   `db:"avg_load_time_ms" json:"averageLoadTimeMs"`
	LastAccessed    time.Time `db:"last_accessed" json:"lastAccessed"`
	LastUpdated     time.Time `db:"last_updated" json:"lastUpdated"`
	CreatedAt       time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt       time.Time `db:"updated_at" json:"updatedAt"`
}

// ConfigConsistencyCheck represents configuration consistency validation results
type ConfigConsistencyCheck struct {
	ID            uuid.UUID        `db:"id" json:"id"`
	ConfigHash    string           `db:"config_hash" json:"configHash"`
	CheckType     string           `db:"check_type" json:"checkType"`     // "integrity", "cross_reference", "state_sync"
	CheckStatus   string           `db:"check_status" json:"checkStatus"` // "passed", "failed", "warning"
	ExpectedValue *json.RawMessage `db:"expected_value" json:"expectedValue,omitempty"`
	ActualValue   *json.RawMessage `db:"actual_value" json:"actualValue,omitempty"`
	Discrepancy   *string          `db:"discrepancy" json:"discrepancy,omitempty"`
	CheckedBy     string           `db:"checked_by" json:"checkedBy"`
	Resolution    *string          `db:"resolution" json:"resolution,omitempty"`
	ResolvedAt    *time.Time       `db:"resolved_at" json:"resolvedAt,omitempty"`
	CreatedAt     time.Time        `db:"created_at" json:"createdAt"`
}

// Helper functions for ConfigVersion

// NewConfigVersion creates a new configuration version
func NewConfigVersion(configHash string, version int64, configState *DomainGenerationConfigState) *ConfigVersion {
	now := time.Now().UTC()
	return &ConfigVersion{
		ID:           uuid.New(),
		ConfigHash:   configHash,
		Version:      version,
		ConfigState:  configState,
		CreatedAt:    now,
		LastAccessed: now,
	}
}

// IsValid validates the configuration version
func (cv *ConfigVersion) IsValid() bool {
	return cv != nil &&
		cv.ID != uuid.Nil &&
		cv.ConfigHash != "" &&
		cv.Version > 0 &&
		cv.ConfigState != nil
}

// UpdateAccess updates the last accessed timestamp
func (cv *ConfigVersion) UpdateAccess() {
	if cv != nil {
		cv.LastAccessed = time.Now().UTC()
	}
}

// GetAge returns the age of the configuration version
func (cv *ConfigVersion) GetAge() time.Duration {
	if cv == nil {
		return 0
	}
	return time.Since(cv.CreatedAt)
}

// Helper functions for ConfigVersionHistory

// NewConfigVersionHistory creates a new configuration version history entry
func NewConfigVersionHistory(
	configHash string,
	version int64,
	changeType ConfigChangeTypeEnum,
	changedBy, reason string,
) *ConfigVersionHistory {
	return &ConfigVersionHistory{
		ID:           uuid.New(),
		ConfigHash:   configHash,
		Version:      version,
		ChangeType:   changeType,
		ChangedBy:    changedBy,
		ChangeReason: reason,
		CreatedAt:    time.Now().UTC(),
	}
}

// Helper functions for ConfigMetrics

// NewConfigMetrics creates a new configuration metrics entry
func NewConfigMetrics(configHash string) *ConfigMetrics {
	now := time.Now().UTC()
	return &ConfigMetrics{
		ConfigHash:   configHash,
		AccessCount:  0,
		UpdateCount:  0,
		CacheHits:    0,
		CacheMisses:  0,
		CreatedAt:    now,
		UpdatedAt:    now,
		LastAccessed: now,
		LastUpdated:  now,
	}
}

// IncrementAccess increments the access count and updates last accessed time
func (cm *ConfigMetrics) IncrementAccess() {
	if cm != nil {
		cm.AccessCount++
		cm.LastAccessed = time.Now().UTC()
		cm.UpdatedAt = time.Now().UTC()
	}
}

// IncrementUpdate increments the update count and updates last updated time
func (cm *ConfigMetrics) IncrementUpdate() {
	if cm != nil {
		cm.UpdateCount++
		cm.LastUpdated = time.Now().UTC()
		cm.UpdatedAt = time.Now().UTC()
	}
}

// RecordCacheHit records a cache hit
func (cm *ConfigMetrics) RecordCacheHit() {
	if cm != nil {
		cm.CacheHits++
		cm.UpdatedAt = time.Now().UTC()
	}
}

// RecordCacheMiss records a cache miss
func (cm *ConfigMetrics) RecordCacheMiss() {
	if cm != nil {
		cm.CacheMisses++
		cm.UpdatedAt = time.Now().UTC()
	}
}

// GetCacheHitRatio calculates the cache hit ratio
func (cm *ConfigMetrics) GetCacheHitRatio() float64 {
	if cm == nil || (cm.CacheHits+cm.CacheMisses) == 0 {
		return 0.0
	}
	total := float64(cm.CacheHits + cm.CacheMisses)
	return float64(cm.CacheHits) / total * 100.0
}
