package models

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// ConfigLock maps to config_locks table
type ConfigLock struct {
	ID         uuid.UUID        `db:"id" json:"id"`
	ConfigHash string           `db:"config_hash" json:"configHash"`
	LockType   string           `db:"lock_type" json:"lockType"`
	Owner      string           `db:"owner" json:"owner"`
	AcquiredAt time.Time        `db:"acquired_at" json:"acquiredAt"`
	ExpiresAt  *time.Time       `db:"expires_at" json:"expiresAt,omitempty"`
	IsActive   bool             `db:"is_active" json:"isActive"`
	Metadata   *json.RawMessage `db:"metadata" json:"metadata,omitempty"`
	CreatedAt  time.Time        `db:"created_at" json:"createdAt"`
	UpdatedAt  time.Time        `db:"updated_at" json:"updatedAt"`
}

// ConfigVersion maps to config_versions table
type ConfigVersion struct {
	ID          uuid.UUID       `db:"id" json:"id"`
	ConfigHash  string          `db:"config_hash" json:"configHash"`
	Version     int             `db:"version" json:"version"`
	LockType    string          `db:"lock_type" json:"lockType"`
	ConfigState json.RawMessage `db:"config_state" json:"configState"`
	CreatedAt   time.Time       `db:"created_at" json:"createdAt"`
	UpdatedAt   time.Time       `db:"updated_at" json:"updatedAt"`
}

// ServiceArchitectureMetric maps to service_architecture_metrics table
type ServiceArchitectureMetric struct {
	ID                        int64      `db:"id" json:"id"`
	ServiceName               string     `db:"service_name" json:"serviceName"`
	ArchitecturePattern       string     `db:"architecture_pattern" json:"architecturePattern"`
	InterfaceType             string     `db:"interface_type" json:"interfaceType"`
	DependencyCount           int        `db:"dependency_count" json:"dependencyCount"`
	CouplingScore             float64    `db:"coupling_score" json:"couplingScore"`
	DeploymentComplexityScore int        `db:"deployment_complexity_score" json:"deploymentComplexityScore"`
	LastRefactorDate          *time.Time `db:"last_refactor_date" json:"lastRefactorDate,omitempty"`
	PerformanceImpact         float64    `db:"performance_impact" json:"performanceImpact"`
	ErrorRate                 float64    `db:"error_rate" json:"errorRate"`
	CreatedAt                 time.Time  `db:"created_at" json:"createdAt"`
	UpdatedAt                 time.Time  `db:"updated_at" json:"updatedAt"`
}

// ServiceDependency maps to service_dependencies table
type ServiceDependency struct {
	ID                int64          `db:"id" json:"id"`
	SourceService     string         `db:"source_service" json:"sourceService"`
	TargetService     string         `db:"target_service" json:"targetService"`
	DependencyType    string         `db:"dependency_type" json:"dependencyType"`
	InterfaceContract sql.NullString `db:"interface_contract" json:"interfaceContract,omitempty"`
	ReliabilityScore  float64        `db:"reliability_score" json:"reliabilityScore"`
	LatencyP95        float64        `db:"latency_p95" json:"latencyP95"`
	FailureCount      int            `db:"failure_count" json:"failureCount"`
	LastSuccess       time.Time      `db:"last_success" json:"lastSuccess"`
	CreatedAt         time.Time      `db:"created_at" json:"createdAt"`
}

// ArchitectureRefactorLog maps to architecture_refactor_log table
type ArchitectureRefactorLog struct {
	ID                  int64          `db:"id" json:"id"`
	ServiceName         string         `db:"service_name" json:"serviceName"`
	RefactorType        string         `db:"refactor_type" json:"refactorType"`
	BeforePattern       sql.NullString `db:"before_pattern" json:"beforePattern,omitempty"`
	AfterPattern        sql.NullString `db:"after_pattern" json:"afterPattern,omitempty"`
	ComplexityReduction int            `db:"complexity_reduction" json:"complexityReduction"`
	PerformanceImpact   float64        `db:"performance_impact" json:"performanceImpact"`
	RollbackPlan        sql.NullString `db:"rollback_plan" json:"rollbackPlan,omitempty"`
	ImplementedBy       sql.NullString `db:"implemented_by" json:"implementedBy,omitempty"`
	ImplementedAt       time.Time      `db:"implemented_at" json:"implementedAt"`
}

// CommunicationPattern maps to communication_patterns table
type CommunicationPattern struct {
	ID                  int64     `db:"id" json:"id"`
	SourceService       string    `db:"source_service" json:"sourceService"`
	TargetService       string    `db:"target_service" json:"targetService"`
	CommunicationType   string    `db:"communication_type" json:"communicationType"`
	Protocol            string    `db:"protocol" json:"protocol"`
	MessageFormat       string    `db:"message_format" json:"messageFormat"`
	AvgLatencyMs        float64   `db:"avg_latency_ms" json:"avgLatencyMs"`
	SuccessRate         float64   `db:"success_rate" json:"successRate"`
	ThroughputRps       float64   `db:"throughput_rps" json:"throughputRps"`
	ErrorRate           float64   `db:"error_rate" json:"errorRate"`
	RetryCount          int       `db:"retry_count" json:"retryCount"`
	CircuitBreakerState string    `db:"circuit_breaker_state" json:"circuitBreakerState"`
	LastHealthCheck     time.Time `db:"last_health_check" json:"lastHealthCheck"`
	CreatedAt           time.Time `db:"created_at" json:"createdAt"`
	UpdatedAt           time.Time `db:"updated_at" json:"updatedAt"`
}

// ServiceCapacityMetric maps to service_capacity_metrics table
type ServiceCapacityMetric struct {
	ID                uuid.UUID `db:"id" json:"id"`
	ServiceName       string    `db:"service_name" json:"serviceName"`
	CPUUtilization    float64   `db:"cpu_utilization" json:"cpuUtilization"`
	MemoryUtilization float64   `db:"memory_utilization" json:"memoryUtilization"`
	InstanceCount     int       `db:"instance_count" json:"instanceCount"`
	RecordedAt        time.Time `db:"recorded_at" json:"recordedAt"`
}

// EventStoreRecord maps to event_store table
type EventStoreRecord struct {
	ID             int64            `db:"id" json:"id"`
	EventID        uuid.UUID        `db:"event_id" json:"eventId"`
	AggregateID    string           `db:"aggregate_id" json:"aggregateId"`
	AggregateType  string           `db:"aggregate_type" json:"aggregateType"`
	EventType      string           `db:"event_type" json:"eventType"`
	EventVersion   int              `db:"event_version" json:"eventVersion"`
	EventData      json.RawMessage  `db:"event_data" json:"eventData"`
	Metadata       *json.RawMessage `db:"metadata" json:"metadata,omitempty"`
	CausationID    uuid.NullUUID    `db:"causation_id" json:"causationId,omitempty"`
	CorrelationID  uuid.NullUUID    `db:"correlation_id" json:"correlationId,omitempty"`
	StreamPosition int64            `db:"stream_position" json:"streamPosition"`
	GlobalPosition int64            `db:"global_position" json:"globalPosition"`
	OccurredAt     time.Time        `db:"occurred_at" json:"occurredAt"`
	RecordedAt     time.Time        `db:"recorded_at" json:"recordedAt"`
}

// EventProjection maps to event_projections table
type EventProjection struct {
	ID                int64           `db:"id" json:"id"`
	ProjectionName    string          `db:"projection_name" json:"projectionName"`
	AggregateID       string          `db:"aggregate_id" json:"aggregateId"`
	ProjectionData    json.RawMessage `db:"projection_data" json:"projectionData"`
	LastEventPosition int64           `db:"last_event_position" json:"lastEventPosition"`
	Version           int             `db:"version" json:"version"`
	CreatedAt         time.Time       `db:"created_at" json:"createdAt"`
	UpdatedAt         time.Time       `db:"updated_at" json:"updatedAt"`
}

// CampaignStateEvent maps to campaign_state_events table
type CampaignStateEvent struct {
	ID               uuid.UUID       `db:"id" json:"id"`
	CampaignID       uuid.UUID       `db:"campaign_id" json:"campaignId"`
	EventType        string          `db:"event_type" json:"eventType"`
	SourceState      sql.NullString  `db:"source_state" json:"sourceState,omitempty"`
	TargetState      sql.NullString  `db:"target_state" json:"targetState,omitempty"`
	Reason           sql.NullString  `db:"reason" json:"reason,omitempty"`
	TriggeredBy      string          `db:"triggered_by" json:"triggeredBy"`
	EventData        json.RawMessage `db:"event_data" json:"eventData"`
	OperationContext json.RawMessage `db:"operation_context" json:"operationContext"`
	SequenceNumber   int64           `db:"sequence_number" json:"sequenceNumber"`
	OccurredAt       time.Time       `db:"occurred_at" json:"occurredAt"`
	PersistedAt      time.Time       `db:"persisted_at" json:"persistedAt"`
	ProcessingStatus string          `db:"processing_status" json:"processingStatus"`
	ProcessingError  sql.NullString  `db:"processing_error" json:"processingError,omitempty"`
	CorrelationID    uuid.NullUUID   `db:"correlation_id" json:"correlationId,omitempty"`
}

// CampaignStateSnapshot maps to campaign_state_snapshots table
type CampaignStateSnapshot struct {
	ID                uuid.UUID       `db:"id" json:"id"`
	CampaignID        uuid.UUID       `db:"campaign_id" json:"campaignId"`
	CurrentState      string          `db:"current_state" json:"currentState"`
	StateData         json.RawMessage `db:"state_data" json:"stateData"`
	LastEventSequence int64           `db:"last_event_sequence" json:"lastEventSequence"`
	SnapshotMetadata  json.RawMessage `db:"snapshot_metadata" json:"snapshotMetadata"`
	CreatedAt         time.Time       `db:"created_at" json:"createdAt"`
	Checksum          string          `db:"checksum" json:"checksum"`
	IsValid           bool            `db:"is_valid" json:"isValid"`
}

// CampaignStateTransition maps to campaign_state_transitions table
type CampaignStateTransition struct {
	ID                 uuid.UUID       `db:"id" json:"id"`
	StateEventID       uuid.UUID       `db:"state_event_id" json:"stateEventId"`
	CampaignID         uuid.UUID       `db:"campaign_id" json:"campaignId"`
	FromState          string          `db:"from_state" json:"fromState"`
	ToState            string          `db:"to_state" json:"toState"`
	IsValidTransition  bool            `db:"is_valid_transition" json:"isValidTransition"`
	ValidationErrors   json.RawMessage `db:"validation_errors" json:"validationErrors"`
	TransitionMetadata json.RawMessage `db:"transition_metadata" json:"transitionMetadata"`
	TriggeredBy        string          `db:"triggered_by" json:"triggeredBy"`
	InitiatedAt        time.Time       `db:"initiated_at" json:"initiatedAt"`
	CompletedAt        *time.Time      `db:"completed_at" json:"completedAt,omitempty"`
	DurationMs         sql.NullInt32   `db:"duration_ms" json:"durationMs,omitempty"`
}
