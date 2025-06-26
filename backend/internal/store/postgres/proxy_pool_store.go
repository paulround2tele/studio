package postgres

import (
	"context"
	"database/sql"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// proxyPoolStorePostgres implements store.ProxyPoolStore
type proxyPoolStorePostgres struct{ db *sqlx.DB }

// NewProxyPoolStorePostgres creates a new ProxyPoolStore backed by PostgreSQL
func NewProxyPoolStorePostgres(db *sqlx.DB) store.ProxyPoolStore {
	return &proxyPoolStorePostgres{db: db}
}

func (s *proxyPoolStorePostgres) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return s.db.BeginTxx(ctx, opts)
}

func (s *proxyPoolStorePostgres) CreateProxyPool(ctx context.Context, exec store.Querier, pool *models.ProxyPool) error {
	query := `INSERT INTO proxy_pools (id, name, description, is_enabled, pool_strategy, health_check_enabled, health_check_interval_seconds, max_retries, timeout_seconds, created_at, updated_at)
              VALUES (:id, :name, :description, :is_enabled, :pool_strategy, :health_check_enabled, :health_check_interval_seconds, :max_retries, :timeout_seconds, :created_at, :updated_at)`
	_, err := exec.NamedExecContext(ctx, query, pool)
	return err
}

func (s *proxyPoolStorePostgres) GetProxyPoolByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.ProxyPool, error) {
	pool := &models.ProxyPool{}
	err := exec.GetContext(ctx, pool, `SELECT * FROM proxy_pools WHERE id=$1`, id)
	if err == sql.ErrNoRows {
		return nil, store.ErrNotFound
	}
	return pool, err
}

func (s *proxyPoolStorePostgres) UpdateProxyPool(ctx context.Context, exec store.Querier, pool *models.ProxyPool) error {
	pool.UpdatedAt = time.Now().UTC()
	query := `UPDATE proxy_pools SET name=:name, description=:description, is_enabled=:is_enabled, pool_strategy=:pool_strategy, health_check_enabled=:health_check_enabled, health_check_interval_seconds=:health_check_interval_seconds, max_retries=:max_retries, timeout_seconds=:timeout_seconds, updated_at=:updated_at WHERE id=:id`
	result, err := exec.NamedExecContext(ctx, query, pool)
	if err != nil {
		return err
	}
	if rows, _ := result.RowsAffected(); rows == 0 {
		return store.ErrNotFound
	}
	return nil
}

func (s *proxyPoolStorePostgres) DeleteProxyPool(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	res, err := exec.ExecContext(ctx, `DELETE FROM proxy_pools WHERE id=$1`, id)
	if err != nil {
		return err
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return store.ErrNotFound
	}
	return nil
}

func (s *proxyPoolStorePostgres) ListProxyPools(ctx context.Context, exec store.Querier) ([]*models.ProxyPool, error) {
	pools := []*models.ProxyPool{}
	err := exec.SelectContext(ctx, &pools, `SELECT * FROM proxy_pools ORDER BY name`)
	return pools, err
}

func (s *proxyPoolStorePostgres) AddProxyToPool(ctx context.Context, exec store.Querier, m *models.ProxyPoolMembership) error {
	query := `INSERT INTO proxy_pool_memberships (pool_id, proxy_id, weight, is_active, added_at)
              VALUES (:pool_id, :proxy_id, :weight, :is_active, :added_at)
              ON CONFLICT (pool_id, proxy_id) DO UPDATE SET weight=EXCLUDED.weight, is_active=EXCLUDED.is_active`
	_, err := exec.NamedExecContext(ctx, query, m)
	return err
}

func (s *proxyPoolStorePostgres) RemoveProxyFromPool(ctx context.Context, exec store.Querier, poolID, proxyID uuid.UUID) error {
	res, err := exec.ExecContext(ctx, `DELETE FROM proxy_pool_memberships WHERE pool_id=$1 AND proxy_id=$2`, poolID, proxyID)
	if err != nil {
		return err
	}
	if rows, _ := res.RowsAffected(); rows == 0 {
		return store.ErrNotFound
	}
	return nil
}

func (s *proxyPoolStorePostgres) ListProxiesForPool(ctx context.Context, exec store.Querier, poolID uuid.UUID) ([]*models.Proxy, error) {
	proxies := []*models.Proxy{}
	query := `SELECT p.* FROM proxies p JOIN proxy_pool_memberships m ON p.id=m.proxy_id WHERE m.pool_id=$1`
	err := exec.SelectContext(ctx, &proxies, query, poolID)
	return proxies, err
}

var _ store.ProxyPoolStore = (*proxyPoolStorePostgres)(nil)
