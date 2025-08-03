// File: backend/internal/store/interfaces.go
package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx" // For sqlx.Tx
)

// Querier defines methods that can be executed by both sqlx.DB and sqlx.Tx
type Querier interface {
	GetContext(ctx context.Context, dest interface{}, query string, args ...interface{}) error
	SelectContext(ctx context.Context, dest interface{}, query string, args ...interface{}) error
	NamedExecContext(ctx context.Context, query string, arg interface{}) (sql.Result, error)
	ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error)
	PrepareNamedContext(ctx context.Context, query string) (*sqlx.NamedStmt, error)
}

// Transactor defines an interface for starting and managing transactions for SQL stores.
type Transactor interface {
	BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error)
}

// CampaignStore defines the interface for campaign data operations
// Methods that can be part of a larger transaction accept an exec Querier.
// If exec is nil, the implementation should use its internal *sqlx.DB.
type CampaignStore interface {
	Transactor // Only Postgres store will meaningfully implement this

	CreateCampaign(ctx context.Context, exec Querier, campaign *models.LeadGenerationCampaign) error
	GetCampaignByID(ctx context.Context, exec Querier, id uuid.UUID) (*models.LeadGenerationCampaign, error)
	UpdateCampaign(ctx context.Context, exec Querier, campaign *models.LeadGenerationCampaign) error
	DeleteCampaign(ctx context.Context, exec Querier, id uuid.UUID) error
	ListCampaigns(ctx context.Context, exec Querier, filter ListCampaignsFilter) ([]*models.LeadGenerationCampaign, error)
	CountCampaigns(ctx context.Context, exec Querier, filter ListCampaignsFilter) (int64, error)
	UpdateCampaignStatus(ctx context.Context, exec Querier, id uuid.UUID, status models.PhaseStatusEnum, errorMessage sql.NullString) error
	UpdateCampaignProgress(ctx context.Context, exec Querier, id uuid.UUID, processedItems, totalItems int64, progressPercentage float64) error
	UpdateCampaignPhaseFields(ctx context.Context, exec Querier, id uuid.UUID, currentPhase *models.PhaseTypeEnum, phaseStatus *models.PhaseStatusEnum) error

	// Methods for DomainGenerationPhaseConfigState
	GetDomainGenerationPhaseConfigStateByHash(ctx context.Context, exec Querier, configHash string) (*models.DomainGenerationPhaseConfigState, error)
	CreateOrUpdateDomainGenerationPhaseConfigState(ctx context.Context, exec Querier, state *models.DomainGenerationPhaseConfigState) error

	// Methods for pattern reference counting and cleanup
	CountCampaignsWithPatternHash(ctx context.Context, exec Querier, patternHash string) (int, error)
	CleanupUnusedPatternConfigState(ctx context.Context, exec Querier, patternHash string) error

	// Campaign Phase Management Methods
	CreateCampaignPhases(ctx context.Context, exec Querier, campaignID uuid.UUID) error
	GetCampaignPhases(ctx context.Context, exec Querier, campaignID uuid.UUID) ([]*models.CampaignPhase, error)
	GetCampaignPhase(ctx context.Context, exec Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) (*models.CampaignPhase, error)
	UpdatePhaseStatus(ctx context.Context, exec Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, status models.PhaseStatusEnum) error
	UpdatePhaseProgress(ctx context.Context, exec Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, progress float64, totalItems, processedItems, successfulItems, failedItems *int64) error
	UpdatePhaseConfiguration(ctx context.Context, exec Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, config json.RawMessage) error
	CompletePhase(ctx context.Context, exec Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) error
	StartPhase(ctx context.Context, exec Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) error
	PausePhase(ctx context.Context, exec Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) error
	FailPhase(ctx context.Context, exec Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum, errorMessage string) error

	CreateGeneratedDomains(ctx context.Context, exec Querier, domains []*models.GeneratedDomain) error
	GetGeneratedDomainsByCampaign(ctx context.Context, exec Querier, campaignID uuid.UUID, limit int, lastOffsetIndex int64) ([]*models.GeneratedDomain, error)
	CountGeneratedDomainsByCampaign(ctx context.Context, exec Querier, campaignID uuid.UUID) (int64, error)

	CreateDNSValidationResults(ctx context.Context, exec Querier, results []*models.DNSValidationResult) error
	GetDNSValidationResultsByCampaign(ctx context.Context, exec Querier, campaignID uuid.UUID, filter ListValidationResultsFilter) ([]*models.DNSValidationResult, error)
	CountDNSValidationResults(ctx context.Context, exec Querier, campaignID uuid.UUID, onlyValid bool) (int64, error)
	DeleteDNSValidationResults(ctx context.Context, exec Querier, campaignID uuid.UUID) (int64, error)
	// Phase-centric JSONB data access methods
	GetCampaignDomainsData(ctx context.Context, exec Querier, campaignID uuid.UUID) (*json.RawMessage, error)
	UpdateCampaignDomainsData(ctx context.Context, exec Querier, campaignID uuid.UUID, data *json.RawMessage) error
	GetCampaignDNSResults(ctx context.Context, exec Querier, campaignID uuid.UUID) (*json.RawMessage, error)
	UpdateCampaignDNSResults(ctx context.Context, exec Querier, campaignID uuid.UUID, results *json.RawMessage) error
	GetCampaignHTTPResults(ctx context.Context, exec Querier, campaignID uuid.UUID) (*json.RawMessage, error)
	UpdateCampaignHTTPResults(ctx context.Context, exec Querier, campaignID uuid.UUID, results *json.RawMessage) error
	GetCampaignAnalysisResults(ctx context.Context, exec Querier, campaignID uuid.UUID) (*json.RawMessage, error)
	UpdateCampaignAnalysisResults(ctx context.Context, exec Querier, campaignID uuid.UUID, results *json.RawMessage) error

	CreateHTTPKeywordParams(ctx context.Context, exec Querier, params *models.HTTPKeywordCampaignParams) error
	GetHTTPKeywordParams(ctx context.Context, exec Querier, campaignID uuid.UUID) (*models.HTTPKeywordCampaignParams, error)

	CreateHTTPKeywordResults(ctx context.Context, exec Querier, results []*models.HTTPKeywordResult) error
	GetHTTPKeywordResultsByCampaign(ctx context.Context, exec Querier, campaignID uuid.UUID, filter ListValidationResultsFilter) ([]*models.HTTPKeywordResult, error)
	GetDomainsForHTTPValidation(ctx context.Context, exec Querier, httpKeywordCampaignID uuid.UUID, sourceCampaignID uuid.UUID, limit int, lastDomainName string) ([]*models.DNSValidationResult, error)

	// Enhanced cursor-based pagination methods for enterprise scale
	GetGeneratedDomainsWithCursor(ctx context.Context, exec Querier, filter ListGeneratedDomainsFilter) (*PaginatedResult[*models.GeneratedDomain], error)

	// Performance monitoring methods
	RecordQueryPerformance(ctx context.Context, exec Querier, metric *models.QueryPerformanceMetric) error
	RecordConnectionPoolMetrics(ctx context.Context, exec Querier, metrics *models.ConnectionPoolMetrics) error

	// JSONB operations for standalone services architecture
	UpdateDomainsData(ctx context.Context, exec Querier, campaignID uuid.UUID, domainsData interface{}) error
	GetDomainsData(ctx context.Context, exec Querier, campaignID uuid.UUID) (interface{}, error)
	AppendDomainsData(ctx context.Context, exec Querier, campaignID uuid.UUID, newDomains interface{}) error

	// Phase 2: New state management methods
	// Campaign state operations
	CreateCampaignState(ctx context.Context, exec Querier, state *models.CampaignState) error
	GetCampaignState(ctx context.Context, exec Querier, campaignID uuid.UUID) (*models.CampaignState, error)
	UpdateCampaignState(ctx context.Context, exec Querier, state *models.CampaignState) error
	DeleteCampaignState(ctx context.Context, exec Querier, campaignID uuid.UUID) error

	// Phase execution operations
	CreatePhaseExecution(ctx context.Context, exec Querier, execution *models.PhaseExecution) error
	GetPhaseExecution(ctx context.Context, exec Querier, campaignID uuid.UUID, phaseType models.PhaseTypeEnum) (*models.PhaseExecution, error)
	GetPhaseExecutionsByCampaign(ctx context.Context, exec Querier, campaignID uuid.UUID) ([]*models.PhaseExecution, error)
	UpdatePhaseExecution(ctx context.Context, exec Querier, execution *models.PhaseExecution) error
	DeletePhaseExecution(ctx context.Context, exec Querier, id uuid.UUID) error

	// Combined operations
	GetCampaignStateWithExecutions(ctx context.Context, exec Querier, campaignID uuid.UUID) (*models.CampaignStateWithExecution, error)

	UpdateDNSResults(ctx context.Context, exec Querier, campaignID uuid.UUID, dnsResults interface{}) error
	GetDNSResults(ctx context.Context, exec Querier, campaignID uuid.UUID) (interface{}, error)

	UpdateHTTPResults(ctx context.Context, exec Querier, campaignID uuid.UUID, httpResults interface{}) error
	GetHTTPResults(ctx context.Context, exec Querier, campaignID uuid.UUID) (interface{}, error)

	UpdateAnalysisResults(ctx context.Context, exec Querier, campaignID uuid.UUID, analysisResults interface{}) error
	GetAnalysisResults(ctx context.Context, exec Querier, campaignID uuid.UUID) (interface{}, error)

	// Bulk operations for N+1 optimization
	GetCampaignsByIDs(ctx context.Context, exec Querier, campaignIDs []uuid.UUID) ([]*models.LeadGenerationCampaign, error)
	BulkDeleteCampaignsByIDs(ctx context.Context, exec Querier, campaignIDs []uuid.UUID) error
	UpdateDomainsBulkDNSStatus(ctx context.Context, exec Querier, results []models.DNSValidationResult) error
	UpdateDomainsBulkHTTPStatus(ctx context.Context, exec Querier, results []models.HTTPKeywordResult) error
}

// ListCampaignsFilter and ListValidationResultsFilter remain the same

type ListCampaignsFilter struct {
	CurrentPhase *models.PhaseTypeEnum   // Phases-based filtering
	PhaseStatus  *models.PhaseStatusEnum // Status of current phase
	UserID       string
	Limit        int
	Offset       int
	SortBy       string
	SortOrder    string
}

type ListValidationResultsFilter struct {
	ValidationStatus string
	HasKeywords      *bool
	Limit            int
	Offset           int
}

// PersonaStore, ProxyStore, KeywordStore, AuditLogStore: methods will accept exec Querier where transactional execution is an option.

type PersonaStore interface {
	Transactor
	CreatePersona(ctx context.Context, exec Querier, persona *models.Persona) error
	GetPersonaByID(ctx context.Context, exec Querier, id uuid.UUID) (*models.Persona, error)
	GetPersonaByName(ctx context.Context, exec Querier, name string) (*models.Persona, error)
	UpdatePersona(ctx context.Context, exec Querier, persona *models.Persona) error
	DeletePersona(ctx context.Context, exec Querier, id uuid.UUID) error
	ListPersonas(ctx context.Context, exec Querier, filter ListPersonasFilter) ([]*models.Persona, error)

	// Batch query methods for N+1 optimization
	GetPersonasByIDs(ctx context.Context, exec Querier, ids []uuid.UUID) ([]*models.Persona, error)
	GetPersonasWithKeywordSetsByIDs(ctx context.Context, exec Querier, ids []uuid.UUID) ([]*models.Persona, error)
}

type ListPersonasFilter struct {
	Type      models.PersonaTypeEnum
	IsEnabled *bool
	Limit     int
	Offset    int
}

type ProxyStore interface {
	Transactor
	CreateProxy(ctx context.Context, exec Querier, proxy *models.Proxy) error
	GetProxyByID(ctx context.Context, exec Querier, id uuid.UUID) (*models.Proxy, error)
	UpdateProxy(ctx context.Context, exec Querier, proxy *models.Proxy) error
	DeleteProxy(ctx context.Context, exec Querier, id uuid.UUID) error
	ListProxies(ctx context.Context, exec Querier, filter ListProxiesFilter) ([]*models.Proxy, error)
	UpdateProxyHealth(ctx context.Context, exec Querier, id uuid.UUID, isHealthy bool, latencyMs sql.NullInt32, lastCheckedAt time.Time) error

	// Batch query methods for N+1 optimization
	GetProxiesByIDs(ctx context.Context, exec Querier, ids []uuid.UUID) ([]*models.Proxy, error)
	GetProxiesByPersonaIDs(ctx context.Context, exec Querier, personaIDs []uuid.UUID) ([]*models.Proxy, error)
}

type ListProxiesFilter struct {
	Protocol  models.ProxyProtocolEnum
	IsEnabled *bool
	IsHealthy *bool
	Limit     int
	Offset    int
}

type KeywordStore interface {
	Transactor

	CreateKeywordSet(ctx context.Context, exec Querier, keywordSet *models.KeywordSet) error
	GetKeywordSetByID(ctx context.Context, exec Querier, id uuid.UUID) (*models.KeywordSet, error)
	GetKeywordSetByName(ctx context.Context, exec Querier, name string) (*models.KeywordSet, error)
	UpdateKeywordSet(ctx context.Context, exec Querier, keywordSet *models.KeywordSet) error
	DeleteKeywordSet(ctx context.Context, exec Querier, id uuid.UUID) error
	ListKeywordSets(ctx context.Context, exec Querier, filter ListKeywordSetsFilter) ([]*models.KeywordSet, error)

	CreateKeywordRules(ctx context.Context, exec Querier, rules []*models.KeywordRule) error
	GetKeywordRulesBySetID(ctx context.Context, exec Querier, keywordSetID uuid.UUID) ([]models.KeywordRule, error)
	UpdateKeywordRule(ctx context.Context, exec Querier, rule *models.KeywordRule) error
	DeleteKeywordRule(ctx context.Context, exec Querier, id uuid.UUID) error
	DeleteKeywordRulesBySetID(ctx context.Context, exec Querier, keywordSetID uuid.UUID) error

	// Batch query methods for N+1 optimization
	GetKeywordSetsByIDs(ctx context.Context, exec Querier, ids []uuid.UUID) ([]*models.KeywordSet, error)
	GetKeywordSetsWithKeywordsByIDs(ctx context.Context, exec Querier, ids []uuid.UUID) ([]*models.KeywordSet, error)
	GetKeywordsByKeywordSetIDs(ctx context.Context, exec Querier, keywordSetIDs []uuid.UUID) ([]*models.KeywordRule, error)
	GetKeywordsByIDs(ctx context.Context, exec Querier, ids []uuid.UUID) ([]*models.KeywordRule, error)
}

type ListKeywordSetsFilter struct {
	IsEnabled *bool
	Limit     int
	Offset    int
}

type AuditLogStore interface {
	// Audit logs are often single, append-only operations.
	// No Transactor needed. exec Querier allows running in existing Tx if caller provides one.
	CreateAuditLog(ctx context.Context, exec Querier, logEntry *models.AuditLog) error
	ListAuditLogs(ctx context.Context, exec Querier, filter ListAuditLogsFilter) ([]*models.AuditLog, error)
}

type ListAuditLogsFilter struct {
	UserID     string
	EntityType string
	EntityID   uuid.NullUUID
	Action     string
	StartDate  time.Time
	EndDate    time.Time
	Limit      int
	Offset     int
}

// CampaignJobStore: Most methods will use internal client/db directly.
// GetNextQueuedJob manages its own transaction for atomicity.
// Transactor is kept if a service needs to batch multiple job store operations into one Tx.
type CampaignJobStore interface {
	Transactor // For potential service-managed transactions involving multiple job ops

	CreateJob(ctx context.Context, exec Querier, job *models.CampaignJob) error
	GetJobByID(ctx context.Context, jobID uuid.UUID) (*models.CampaignJob, error)
	UpdateJob(ctx context.Context, exec Querier, job *models.CampaignJob) error
	GetNextQueuedJob(ctx context.Context, campaignTypes []models.JobTypeEnum, workerID string) (*models.CampaignJob, error)
	DeleteJob(ctx context.Context, jobID uuid.UUID) error
	ListJobs(ctx context.Context, filter ListJobsFilter) ([]*models.CampaignJob, error)
}

type ListJobsFilter struct {
	CampaignID   uuid.NullUUID
	CampaignType models.JobTypeEnum
	Status       models.CampaignJobStatusEnum
	Limit        int
	Offset       int
	SortBy       string
	SortOrder    string
}

func BoolPtr(b bool) *bool {
	return &b
}

// SecurityStore removed - using simple session-based auth for B2B app

// ArchitectureStore defines operations for service architecture monitoring and
// related tables.
type ArchitectureStore interface {
	Transactor
	CreateServiceArchitectureMetric(ctx context.Context, exec Querier, m *models.ServiceArchitectureMetric) error
	GetServiceArchitectureMetrics(ctx context.Context, exec Querier, serviceName string) ([]*models.ServiceArchitectureMetric, error)
	CreateServiceDependency(ctx context.Context, exec Querier, dep *models.ServiceDependency) error
	ListServiceDependencies(ctx context.Context, exec Querier, sourceService string) ([]*models.ServiceDependency, error)
	CreateArchitectureRefactorLog(ctx context.Context, exec Querier, log *models.ArchitectureRefactorLog) error
	CreateCommunicationPattern(ctx context.Context, exec Querier, p *models.CommunicationPattern) error
	CreateServiceCapacityMetric(ctx context.Context, exec Querier, m *models.ServiceCapacityMetric) error
}

// ProxyPoolStore defines operations for managing proxy pools and their memberships.
type ProxyPoolStore interface {
	Transactor
	CreateProxyPool(ctx context.Context, exec Querier, pool *models.ProxyPool) error
	GetProxyPoolByID(ctx context.Context, exec Querier, id uuid.UUID) (*models.ProxyPool, error)
	UpdateProxyPool(ctx context.Context, exec Querier, pool *models.ProxyPool) error
	DeleteProxyPool(ctx context.Context, exec Querier, id uuid.UUID) error
	ListProxyPools(ctx context.Context, exec Querier) ([]*models.ProxyPool, error)

	AddProxyToPool(ctx context.Context, exec Querier, m *models.ProxyPoolMembership) error
	RemoveProxyFromPool(ctx context.Context, exec Querier, poolID, proxyID uuid.UUID) error
	ListProxiesForPool(ctx context.Context, exec Querier, poolID uuid.UUID) ([]*models.Proxy, error)
}
