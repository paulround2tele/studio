package postgres

import (
	"context"
	"database/sql"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/jmoiron/sqlx"
)

// architectureStorePostgres implements ArchitectureStore for PostgreSQL.
type architectureStorePostgres struct {
	db *sqlx.DB
}

// NewArchitectureStorePostgres creates a new ArchitectureStore.
func NewArchitectureStorePostgres(db *sqlx.DB) store.ArchitectureStore {
	return &architectureStorePostgres{db: db}
}

// BeginTxx starts a transaction.
func (s *architectureStorePostgres) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return s.db.BeginTxx(ctx, opts)
}

func (s *architectureStorePostgres) execQuerier(exec store.Querier) store.Querier {
	if exec != nil {
		return exec
	}
	return s.db
}

func (s *architectureStorePostgres) CreateServiceArchitectureMetric(ctx context.Context, exec store.Querier, m *models.ServiceArchitectureMetric) error {
	query := `INSERT INTO service_architecture_metrics (service_name, architecture_pattern, interface_type, dependency_count, coupling_score, deployment_complexity_score, last_refactor_date, performance_impact, error_rate, created_at, updated_at)
              VALUES (:service_name, :architecture_pattern, :interface_type, :dependency_count, :coupling_score, :deployment_complexity_score, :last_refactor_date, :performance_impact, :error_rate, :created_at, :updated_at)`
	_, err := s.execQuerier(exec).NamedExecContext(ctx, query, m)
	return err
}

func (s *architectureStorePostgres) GetServiceArchitectureMetrics(ctx context.Context, exec store.Querier, serviceName string) ([]*models.ServiceArchitectureMetric, error) {
	metrics := []*models.ServiceArchitectureMetric{}
	query := `SELECT id, service_name, architecture_pattern, interface_type, dependency_count, coupling_score, deployment_complexity_score, last_refactor_date, performance_impact, error_rate, created_at, updated_at FROM service_architecture_metrics WHERE service_name=$1`
	err := s.execQuerier(exec).SelectContext(ctx, &metrics, query, serviceName)
	return metrics, err
}

func (s *architectureStorePostgres) CreateServiceDependency(ctx context.Context, exec store.Querier, dep *models.ServiceDependency) error {
	query := `INSERT INTO service_dependencies (source_service, target_service, dependency_type, interface_contract, reliability_score, latency_p95, failure_count, last_success, created_at)
              VALUES (:source_service, :target_service, :dependency_type, :interface_contract, :reliability_score, :latency_p95, :failure_count, :last_success, :created_at)`
	_, err := s.execQuerier(exec).NamedExecContext(ctx, query, dep)
	return err
}

func (s *architectureStorePostgres) ListServiceDependencies(ctx context.Context, exec store.Querier, sourceService string) ([]*models.ServiceDependency, error) {
	deps := []*models.ServiceDependency{}
	query := `SELECT id, source_service, target_service, dependency_type, interface_contract, reliability_score, latency_p95, failure_count, last_success, created_at FROM service_dependencies WHERE source_service=$1`
	err := s.execQuerier(exec).SelectContext(ctx, &deps, query, sourceService)
	return deps, err
}

func (s *architectureStorePostgres) CreateArchitectureRefactorLog(ctx context.Context, exec store.Querier, log *models.ArchitectureRefactorLog) error {
	query := `INSERT INTO architecture_refactor_log (service_name, refactor_type, before_pattern, after_pattern, complexity_reduction, performance_impact, rollback_plan, implemented_by, implemented_at)
              VALUES (:service_name, :refactor_type, :before_pattern, :after_pattern, :complexity_reduction, :performance_impact, :rollback_plan, :implemented_by, :implemented_at)`
	_, err := s.execQuerier(exec).NamedExecContext(ctx, query, log)
	return err
}

func (s *architectureStorePostgres) CreateCommunicationPattern(ctx context.Context, exec store.Querier, p *models.CommunicationPattern) error {
	query := `INSERT INTO communication_patterns (source_service, target_service, communication_type, protocol, message_format, avg_latency_ms, success_rate, throughput_rps, error_rate, retry_count, circuit_breaker_state, last_health_check, created_at, updated_at)
              VALUES (:source_service, :target_service, :communication_type, :protocol, :message_format, :avg_latency_ms, :success_rate, :throughput_rps, :error_rate, :retry_count, :circuit_breaker_state, :last_health_check, :created_at, :updated_at)`
	_, err := s.execQuerier(exec).NamedExecContext(ctx, query, p)
	return err
}

func (s *architectureStorePostgres) CreateServiceCapacityMetric(ctx context.Context, exec store.Querier, m *models.ServiceCapacityMetric) error {
	query := `INSERT INTO service_capacity_metrics (id, service_name, cpu_utilization, memory_utilization, instance_count, recorded_at)
              VALUES (:id, :service_name, :cpu_utilization, :memory_utilization, :instance_count, :recorded_at)`
	_, err := s.execQuerier(exec).NamedExecContext(ctx, query, m)
	return err
}
