package models

import (
	"database/sql"
	"encoding/json"
	"net"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// PasswordResetToken represents a password reset token entry
// mapped to auth.password_reset_tokens table
type PasswordResetToken struct {
	ID        uuid.UUID  `db:"id" json:"id"`
	UserID    uuid.UUID  `db:"user_id" json:"userId"`
	TokenHash string     `db:"token_hash" json:"tokenHash"`
	ExpiresAt time.Time  `db:"expires_at" json:"expiresAt"`
	UsedAt    *time.Time `db:"used_at" json:"usedAt,omitempty"`
	IPAddress *net.IP    `db:"ip_address" json:"ipAddress,omitempty"`
	UserAgent *string    `db:"user_agent" json:"userAgent,omitempty"`
	CreatedAt time.Time  `db:"created_at" json:"createdAt"`
}

// SecurityEvent represents a record from security_events table
type SecurityEvent struct {
	ID                  uuid.UUID        `db:"id" json:"id"`
	EventType           string           `db:"event_type" json:"eventType"`
	UserID              uuid.NullUUID    `db:"user_id" json:"userId,omitempty"`
	SessionID           sql.NullString   `db:"session_id" json:"sessionId,omitempty"`
	CampaignID          uuid.NullUUID    `db:"campaign_id" json:"campaignId,omitempty"`
	ResourceType        sql.NullString   `db:"resource_type" json:"resourceType,omitempty"`
	ResourceID          sql.NullString   `db:"resource_id" json:"resourceId,omitempty"`
	ActionAttempted     string           `db:"action_attempted" json:"actionAttempted"`
	AuthorizationResult string           `db:"authorization_result" json:"authorizationResult"`
	DenialReason        sql.NullString   `db:"denial_reason" json:"denialReason,omitempty"`
	RiskScore           int              `db:"risk_score" json:"riskScore"`
	SourceIP            *net.IP          `db:"source_ip" json:"sourceIp,omitempty"`
	UserAgent           sql.NullString   `db:"user_agent" json:"userAgent,omitempty"`
	RequestContext      *json.RawMessage `db:"request_context" json:"requestContext,omitempty"`
	AuditLogID          uuid.NullUUID    `db:"audit_log_id" json:"auditLogId,omitempty"`
	CreatedAt           time.Time        `db:"created_at" json:"createdAt"`
}

// AuthorizationDecision represents a decision record from authorization_decisions table
type AuthorizationDecision struct {
	ID                uuid.UUID        `db:"id" json:"id"`
	DecisionID        string           `db:"decision_id" json:"decisionId"`
	UserID            uuid.UUID        `db:"user_id" json:"userId"`
	ResourceType      string           `db:"resource_type" json:"resourceType"`
	ResourceID        string           `db:"resource_id" json:"resourceId"`
	Action            string           `db:"action" json:"action"`
	Decision          string           `db:"decision" json:"decision"`
	PolicyVersion     sql.NullString   `db:"policy_version" json:"policyVersion,omitempty"`
	EvaluatedPolicies pq.StringArray   `db:"evaluated_policies" json:"evaluatedPolicies,omitempty"`
	ConditionsMet     *json.RawMessage `db:"conditions_met" json:"conditionsMet,omitempty"`
	DecisionTimeMs    int              `db:"decision_time_ms" json:"decisionTimeMs"`
	Context           *json.RawMessage `db:"context" json:"context,omitempty"`
	SecurityEventID   uuid.NullUUID    `db:"security_event_id" json:"securityEventId,omitempty"`
	CreatedAt         time.Time        `db:"created_at" json:"createdAt"`
}

// CampaignAccessGrant maps to campaign_access_grants table
type CampaignAccessGrant struct {
	ID         uuid.UUID     `db:"id" json:"id"`
	CampaignID uuid.UUID     `db:"campaign_id" json:"campaignId"`
	UserID     uuid.UUID     `db:"user_id" json:"userId"`
	AccessType string        `db:"access_type" json:"accessType"`
	GrantedBy  uuid.NullUUID `db:"granted_by" json:"grantedBy,omitempty"`
	GrantedAt  time.Time     `db:"granted_at" json:"grantedAt"`
	ExpiresAt  *time.Time    `db:"expires_at" json:"expiresAt,omitempty"`
	CreatedAt  time.Time     `db:"created_at" json:"createdAt"`
	IsActive   bool          `db:"is_active" json:"isActive"`
}

// CacheConfiguration represents cache_configurations table
type CacheConfiguration struct {
	ID                uuid.UUID  `db:"id" json:"id"`
	CacheName         string     `db:"cache_name" json:"cacheName"`
	CacheType         string     `db:"cache_type" json:"cacheType"`
	MaxSizeBytes      int64      `db:"max_size_bytes" json:"maxSizeBytes"`
	CurrentSizeBytes  int64      `db:"current_size_bytes" json:"currentSizeBytes"`
	MaxEntries        int        `db:"max_entries" json:"maxEntries"`
	CurrentEntries    int        `db:"current_entries" json:"currentEntries"`
	DefaultTTLSeconds int        `db:"default_ttl_seconds" json:"defaultTtlSeconds"`
	EvictionPolicy    string     `db:"eviction_policy" json:"evictionPolicy"`
	CacheStatus       string     `db:"cache_status" json:"cacheStatus"`
	LastCleanupAt     *time.Time `db:"last_cleanup_at" json:"lastCleanupAt,omitempty"`
	CreatedAt         time.Time  `db:"created_at" json:"createdAt"`
	UpdatedAt         time.Time  `db:"updated_at" json:"updatedAt"`
}

// CacheEntry represents cache_entries table
type CacheEntry struct {
	ID                   uuid.UUID        `db:"id" json:"id"`
	CacheKey             string           `db:"cache_key" json:"cacheKey"`
	CacheNamespace       string           `db:"cache_namespace" json:"cacheNamespace"`
	ServiceName          string           `db:"service_name" json:"serviceName"`
	CampaignPhase        sql.NullString   `db:"campaign_phase" json:"campaignPhase,omitempty"` // Phase-based tracking for security analytics
	CampaignID           uuid.NullUUID    `db:"campaign_id" json:"campaignId,omitempty"`
	CacheValue           *string          `db:"cache_value" json:"cacheValue,omitempty"`
	CacheValueCompressed []byte           `db:"cache_value_compressed" json:"cacheValueCompressed,omitempty"`
	IsCompressed         bool             `db:"is_compressed" json:"isCompressed"`
	ContentType          string           `db:"content_type" json:"contentType"`
	SizeBytes            int              `db:"size_bytes" json:"sizeBytes"`
	HitCount             int              `db:"hit_count" json:"hitCount"`
	AccessFrequency      float64          `db:"access_frequency" json:"accessFrequency"`
	TTLSeconds           int              `db:"ttl_seconds" json:"ttlSeconds"`
	ExpiresAt            *time.Time       `db:"expires_at" json:"expiresAt,omitempty"`
	CreatedAt            time.Time        `db:"created_at" json:"createdAt"`
	LastAccessed         time.Time        `db:"last_accessed" json:"lastAccessed"`
	Tags                 pq.StringArray   `db:"tags" json:"tags"`
	Metadata             *json.RawMessage `db:"metadata" json:"metadata,omitempty"`
}

// CacheInvalidationLog represents cache_invalidation_log table
type CacheInvalidationLog struct {
	ID                  uuid.UUID      `db:"id" json:"id"`
	ServiceName         string         `db:"service_name" json:"serviceName"`
	CacheNamespace      string         `db:"cache_namespace" json:"cacheNamespace"`
	InvalidationPattern string         `db:"invalidation_pattern" json:"invalidationPattern"`
	InvalidationReason  string         `db:"invalidation_reason" json:"invalidationReason"`
	AffectedKeysCount   int            `db:"affected_keys_count" json:"affectedKeysCount"`
	CampaignPhase       sql.NullString `db:"campaign_phase" json:"campaignPhase,omitempty"` // Phase-based tracking for security analytics
	CampaignID          uuid.NullUUID  `db:"campaign_id" json:"campaignId,omitempty"`
	TriggeredBy         string         `db:"triggered_by" json:"triggeredBy"`
	ExecutionTimeMs     float64        `db:"execution_time_ms" json:"executionTimeMs"`
	Success             bool           `db:"success" json:"success"`
	ErrorMessage        sql.NullString `db:"error_message" json:"errorMessage,omitempty"`
	ExecutedAt          time.Time      `db:"executed_at" json:"executedAt"`
}

// CacheInvalidation represents cache_invalidations table
type CacheInvalidation struct {
	ID                 uuid.UUID        `db:"id" json:"id"`
	CacheName          string           `db:"cache_name" json:"cacheName"`
	InvalidationType   string           `db:"invalidation_type" json:"invalidationType"`
	InvalidationReason sql.NullString   `db:"invalidation_reason" json:"invalidationReason,omitempty"`
	KeysInvalidated    int              `db:"keys_invalidated" json:"keysInvalidated"`
	BytesFreed         int64            `db:"bytes_freed" json:"bytesFreed"`
	OperationContext   *json.RawMessage `db:"operation_context" json:"operationContext,omitempty"`
	InvalidatedAt      time.Time        `db:"invalidated_at" json:"invalidatedAt"`
}

// CacheMetric represents cache_metrics table
type CacheMetric struct {
	ID              uuid.UUID      `db:"id" json:"id"`
	ServiceName     string         `db:"service_name" json:"serviceName"`
	CacheNamespace  string         `db:"cache_namespace" json:"cacheNamespace"`
	CampaignPhase   sql.NullString `db:"campaign_phase" json:"campaignPhase,omitempty"` // Phase-based tracking for security analytics
	OperationType   string         `db:"operation_type" json:"operationType"`
	CacheKey        string         `db:"cache_key" json:"cacheKey"`
	ExecutionTimeMs float64        `db:"execution_time_ms" json:"executionTimeMs"`
	CacheSizeBytes  int            `db:"cache_size_bytes" json:"cacheSizeBytes"`
	TTLUsedSeconds  int            `db:"ttl_used_seconds" json:"ttlUsedSeconds"`
	HitRatioPct     float64        `db:"hit_ratio_pct" json:"hitRatioPct"`
	RecordedAt      time.Time      `db:"recorded_at" json:"recordedAt"`
}
