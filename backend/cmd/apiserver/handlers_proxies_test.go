package main

import (
	"context"
	"database/sql"
	"testing"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// --- Fake ProxyStore (in-memory) ---
type fakeProxyStore struct {
	byID map[uuid.UUID]*models.Proxy
}

func newFakeProxyStore() *fakeProxyStore { return &fakeProxyStore{byID: map[uuid.UUID]*models.Proxy{}} }

func (f *fakeProxyStore) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return nil, nil
}

func (f *fakeProxyStore) CreateProxy(ctx context.Context, exec store.Querier, proxy *models.Proxy) error {
	// Enforce unique name minimally
	for _, p := range f.byID {
		if p.Name == proxy.Name {
			return store.ErrDuplicateEntry
		}
	}
	cp := *proxy
	f.byID[proxy.ID] = &cp
	return nil
}
func (f *fakeProxyStore) GetProxyByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.Proxy, error) {
	if p, ok := f.byID[id]; ok {
		cp := *p
		return &cp, nil
	}
	return nil, store.ErrNotFound
}
func (f *fakeProxyStore) UpdateProxy(ctx context.Context, exec store.Querier, proxy *models.Proxy) error {
	if _, ok := f.byID[proxy.ID]; !ok {
		return store.ErrNotFound
	}
	cp := *proxy
	f.byID[proxy.ID] = &cp
	return nil
}
func (f *fakeProxyStore) DeleteProxy(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	if _, ok := f.byID[id]; !ok {
		return store.ErrNotFound
	}
	delete(f.byID, id)
	return nil
}
func (f *fakeProxyStore) ListProxies(ctx context.Context, exec store.Querier, filter store.ListProxiesFilter) ([]*models.Proxy, error) {
	out := []*models.Proxy{}
	for _, p := range f.byID {
		if filter.Protocol != "" && (p.Protocol == nil || *p.Protocol != filter.Protocol) {
			continue
		}
		if filter.IsEnabled != nil && p.IsEnabled != *filter.IsEnabled {
			continue
		}
		cp := *p
		out = append(out, &cp)
	}
	return out, nil
}
func (f *fakeProxyStore) UpdateProxyHealth(ctx context.Context, exec store.Querier, id uuid.UUID, isHealthy bool, latencyMs sql.NullInt32, lastCheckedAt time.Time) error {
	return nil
}
func (f *fakeProxyStore) GetProxiesByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.Proxy, error) {
	return nil, nil
}
func (f *fakeProxyStore) GetProxiesByPersonaIDs(ctx context.Context, exec store.Querier, personaIDs []uuid.UUID) ([]*models.Proxy, error) {
	return nil, nil
}

// --- Fake ProxyPoolStore (in-memory) ---
type fakeProxyPoolStore struct {
	byID map[uuid.UUID]*models.ProxyPool
}

func newFakeProxyPoolStore() *fakeProxyPoolStore {
	return &fakeProxyPoolStore{byID: map[uuid.UUID]*models.ProxyPool{}}
}

func (f *fakeProxyPoolStore) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return nil, nil
}
func (f *fakeProxyPoolStore) CreateProxyPool(ctx context.Context, exec store.Querier, pool *models.ProxyPool) error {
	for _, p := range f.byID {
		if p.Name == pool.Name {
			return store.ErrDuplicateEntry
		}
	}
	cp := *pool
	f.byID[pool.ID] = &cp
	return nil
}
func (f *fakeProxyPoolStore) GetProxyPoolByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.ProxyPool, error) {
	if p, ok := f.byID[id]; ok {
		cp := *p
		return &cp, nil
	}
	return nil, store.ErrNotFound
}
func (f *fakeProxyPoolStore) UpdateProxyPool(ctx context.Context, exec store.Querier, pool *models.ProxyPool) error {
	return nil
}
func (f *fakeProxyPoolStore) DeleteProxyPool(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	return nil
}
func (f *fakeProxyPoolStore) ListProxyPools(ctx context.Context, exec store.Querier) ([]*models.ProxyPool, error) {
	out := []*models.ProxyPool{}
	for _, p := range f.byID {
		cp := *p
		out = append(out, &cp)
	}
	return out, nil
}
func (f *fakeProxyPoolStore) AddProxyToPool(ctx context.Context, exec store.Querier, m *models.ProxyPoolMembership) error {
	return nil
}
func (f *fakeProxyPoolStore) RemoveProxyFromPool(ctx context.Context, exec store.Querier, poolID, proxyID uuid.UUID) error {
	return nil
}
func (f *fakeProxyPoolStore) ListProxiesForPool(ctx context.Context, exec store.Querier, poolID uuid.UUID) ([]*models.Proxy, error) {
	return nil, nil
}

func newProxiesHandlersForTest() *strictHandlers {
	deps := &AppDeps{}
	deps.Stores.Proxy = newFakeProxyStore()
	deps.Stores.ProxyPools = newFakeProxyPoolStore()
	deps.DB = new(sqlx.DB)
	return &strictHandlers{deps: deps}
}

func TestProxiesAndPoolsCRUDSmoke(t *testing.T) {
	h := newProxiesHandlersForTest()
	ctx := context.Background()

	// Create proxy
	proto := gen.ProxyProtocol("http")
	body := gen.ProxiesCreateJSONRequestBody{
		Name:        "p1",
		Address:     "http://user:pass@localhost:8080",
		Protocol:    &proto,
		IsEnabled:   store.BoolPtr(true),
		Username:    func() *string { s := "user"; return &s }(),
		Description: func() *string { s := "test"; return &s }(),
	}
	cr, err := h.ProxiesCreate(ctx, gen.ProxiesCreateRequestObject{Body: &body})
	if err != nil {
		t.Fatalf("create proxy error: %v", err)
	}
	if _, ok := cr.(gen.ProxiesCreate201JSONResponse); !ok {
		t.Fatalf("expected 201 for proxy create")
	}

	// List proxies
	lr, err := h.ProxiesList(ctx, gen.ProxiesListRequestObject{})
	if err != nil {
		t.Fatalf("list proxies error: %v", err)
	}
	l200, ok := lr.(gen.ProxiesList200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 list proxies, got %T", lr)
	}
	proxies := []gen.Proxy(l200)
	if len(proxies) != 1 {
		t.Fatalf("expected 1 proxy, got %d", len(proxies))
	}

	// Create proxy pool
	poolBody := gen.ProxyPoolsCreateJSONRequestBody{
		Name:        "pool1",
		IsEnabled:   store.BoolPtr(true),
		Description: func() *string { s := "pool"; return &s }(),
	}
	pr, err := h.ProxyPoolsCreate(ctx, gen.ProxyPoolsCreateRequestObject{Body: &poolBody})
	if err != nil {
		t.Fatalf("create pool error: %v", err)
	}
	if _, ok := pr.(gen.ProxyPoolsCreate201JSONResponse); !ok {
		t.Fatalf("expected 201 for pool create")
	}

	// List proxy pools
	plr, err := h.ProxyPoolsList(ctx, gen.ProxyPoolsListRequestObject{})
	if err != nil {
		t.Fatalf("list pools error: %v", err)
	}
	pl200, ok := plr.(gen.ProxyPoolsList200JSONResponse)
	if !ok {
		t.Fatalf("expected 200 list pools, got %T", plr)
	}
	pools := []gen.ProxyPool(pl200)
	if len(pools) != 1 {
		t.Fatalf("expected 1 pool, got %d", len(pools))
	}

	// Update proxy: set username and disable
	// We don't have ID in details response; rely on store state in fake to pick one
	var firstID uuid.UUID
	for id := range h.deps.Stores.Proxy.(*fakeProxyStore).byID {
		firstID = id
		break
	}
	updBody := gen.ProxiesUpdateJSONRequestBody{Username: func() *string { s := "user2"; return &s }(), IsEnabled: store.BoolPtr(false)}
	ur, err := h.ProxiesUpdate(ctx, gen.ProxiesUpdateRequestObject{ProxyId: firstID, Body: &updBody})
	if err != nil {
		t.Fatalf("update proxy error: %v", err)
	}
	if _, ok := ur.(gen.ProxiesUpdate200JSONResponse); !ok {
		t.Fatalf("expected 200 for proxy update")
	}

	// Status listing should succeed
	sr, err := h.ProxiesStatus(ctx, gen.ProxiesStatusRequestObject{})
	if err != nil {
		t.Fatalf("status error: %v", err)
	}
	if _, ok := sr.(gen.ProxiesStatus200JSONResponse); !ok {
		t.Fatalf("expected 200 for proxies status")
	}

	// Health check single
	hr, err := h.ProxiesHealthCheckSingle(ctx, gen.ProxiesHealthCheckSingleRequestObject{ProxyId: firstID})
	if err != nil {
		t.Fatalf("health check single error: %v", err)
	}
	if _, ok := hr.(gen.ProxiesHealthCheckSingle200JSONResponse); !ok {
		t.Fatalf("expected 200 for health check single")
	}

	// Add/remove proxy membership to pool
	var poolID uuid.UUID
	for id := range h.deps.Stores.ProxyPools.(*fakeProxyPoolStore).byID {
		poolID = id
		break
	}
	addBody := gen.ProxyPoolsAddProxyJSONRequestBody{ProxyId: firstID}
	apr, err := h.ProxyPoolsAddProxy(ctx, gen.ProxyPoolsAddProxyRequestObject{PoolId: poolID, Body: &addBody})
	if err != nil {
		t.Fatalf("add proxy to pool error: %v", err)
	}
	if _, ok := apr.(gen.ProxyPoolsAddProxy201JSONResponse); !ok {
		t.Fatalf("expected 201 for add proxy to pool")
	}

	rpr, err := h.ProxyPoolsRemoveProxy(ctx, gen.ProxyPoolsRemoveProxyRequestObject{PoolId: poolID, ProxyId: firstID})
	if err != nil {
		t.Fatalf("remove proxy from pool error: %v", err)
	}
	if _, ok := rpr.(gen.ProxyPoolsRemoveProxy200JSONResponse); !ok {
		t.Fatalf("expected 200 for remove proxy from pool")
	}

	// Test single proxy
	tr, err := h.ProxiesTest(ctx, gen.ProxiesTestRequestObject{ProxyId: firstID})
	if err != nil {
		t.Fatalf("test proxy error: %v", err)
	}
	if _, ok := tr.(gen.ProxiesTest200JSONResponse); !ok {
		t.Fatalf("expected 200 for proxy test")
	}

	// Bulk update
	bulkUpd := gen.ProxiesBulkUpdateJSONRequestBody{ProxyIds: []uuid.UUID{firstID}, Updates: gen.UpdateProxyRequestAPI{Name: func() *string { s := "p1-renamed"; return &s }()}}
	bur, err := h.ProxiesBulkUpdate(ctx, gen.ProxiesBulkUpdateRequestObject{Body: &bulkUpd})
	if err != nil {
		t.Fatalf("bulk update error: %v", err)
	}
	if _, ok := bur.(gen.ProxiesBulkUpdate200JSONResponse); !ok {
		t.Fatalf("expected 200 bulk update")
	}

	// Bulk test
	bulkTest := gen.ProxiesBulkTestJSONRequestBody{ProxyIds: []uuid.UUID{firstID}}
	btr, err := h.ProxiesBulkTest(ctx, gen.ProxiesBulkTestRequestObject{Body: &bulkTest})
	if err != nil {
		t.Fatalf("bulk test error: %v", err)
	}
	if _, ok := btr.(gen.ProxiesBulkTest200JSONResponse); !ok {
		t.Fatalf("expected 200 bulk test")
	}

	// Bulk delete
	bulkDel := gen.ProxiesBulkDeleteJSONRequestBody{ProxyIds: []uuid.UUID{firstID}}
	bdr, err := h.ProxiesBulkDelete(ctx, gen.ProxiesBulkDeleteRequestObject{Body: &bulkDel})
	if err != nil {
		t.Fatalf("bulk delete error: %v", err)
	}
	if _, ok := bdr.(gen.ProxiesBulkDelete200JSONResponse); !ok {
		t.Fatalf("expected 200 bulk delete")
	}

	// Delete pool
	pdr, err := h.ProxyPoolsDelete(ctx, gen.ProxyPoolsDeleteRequestObject{PoolId: poolID})
	if err != nil {
		t.Fatalf("pool delete error: %v", err)
	}
	if _, ok := pdr.(gen.ProxyPoolsDelete200JSONResponse); !ok {
		t.Fatalf("expected 200 pool delete")
	}
}
