package main

import (
	"context"
	"testing"
	"database/sql"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// --- Fake PersonaStore (in-memory) ---
type fakePersonaStore struct {
	byID map[uuid.UUID]*models.Persona
}

func newFakePersonaStore() *fakePersonaStore {
	return &fakePersonaStore{byID: map[uuid.UUID]*models.Persona{}}
}

// Transactor
func (f *fakePersonaStore) BeginTxx(ctx context.Context, opts *sql.TxOptions) (*sqlx.Tx, error) {
	return nil, nil
}

func (f *fakePersonaStore) CreatePersona(ctx context.Context, exec store.Querier, persona *models.Persona) error {
	// Name+Type uniqueness check (minimal)
	for _, p := range f.byID {
		if p.Name == persona.Name && p.PersonaType == persona.PersonaType {
			return store.ErrDuplicateEntry
		}
	}
	cp := *persona
	f.byID[persona.ID] = &cp
	return nil
}
func (f *fakePersonaStore) GetPersonaByID(ctx context.Context, exec store.Querier, id uuid.UUID) (*models.Persona, error) {
	if p, ok := f.byID[id]; ok {
		cp := *p
		return &cp, nil
	}
	return nil, store.ErrNotFound
}
func (f *fakePersonaStore) GetPersonaByName(ctx context.Context, exec store.Querier, name string) (*models.Persona, error) {
	for _, p := range f.byID {
		if p.Name == name {
			cp := *p
			return &cp, nil
		}
	}
	return nil, store.ErrNotFound
}
func (f *fakePersonaStore) UpdatePersona(ctx context.Context, exec store.Querier, persona *models.Persona) error {
	if _, ok := f.byID[persona.ID]; !ok {
		return store.ErrNotFound
	}
	cp := *persona
	f.byID[persona.ID] = &cp
	return nil
}
func (f *fakePersonaStore) DeletePersona(ctx context.Context, exec store.Querier, id uuid.UUID) error {
	if _, ok := f.byID[id]; !ok {
		return store.ErrNotFound
	}
	delete(f.byID, id)
	return nil
}
func (f *fakePersonaStore) ListPersonas(ctx context.Context, exec store.Querier, filter store.ListPersonasFilter) ([]*models.Persona, error) {
	out := []*models.Persona{}
	for _, p := range f.byID {
		if filter.Type != "" && p.PersonaType != filter.Type {
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
func (f *fakePersonaStore) GetPersonasByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.Persona, error) {
	return nil, nil
}
func (f *fakePersonaStore) GetPersonasWithKeywordSetsByIDs(ctx context.Context, exec store.Querier, ids []uuid.UUID) ([]*models.Persona, error) {
	return nil, nil
}

func newPersonaHandlersForTest() *strictHandlers {
	deps := &AppDeps{}
	deps.Stores.Persona = newFakePersonaStore()
	deps.DB = new(sqlx.DB) // non-nil sentinel; not used by fake
	return &strictHandlers{deps: deps}
}

func TestPersonasCRUDSmoke(t *testing.T) {
	h := newPersonaHandlersForTest()
	ctx := context.Background()

	// Create HTTP persona
	httpBody := gen.PersonasCreateJSONRequestBody{
		Name:        "http-1",
		PersonaType: gen.PersonaType("http"),
		ConfigDetails: map[string]interface{}{
			"userAgent": "test-agent",
		},
		IsEnabled: func() *bool { b := true; return &b }(),
	}
	crResp, err := h.PersonasCreate(ctx, gen.PersonasCreateRequestObject{Body: &httpBody})
	if err != nil {
		t.Fatalf("create http persona error: %v", err)
	}
	cr201, ok := crResp.(gen.PersonasCreate201JSONResponse)
	if !ok {
		t.Fatalf("expected 201 response, got %T", crResp)
	}
	if cr201.Data == nil || cr201.Data.Name != "http-1" {
		t.Fatalf("unexpected create response: %+v", cr201)
	}
	httpID := uuid.UUID(cr201.Data.Id)

	// Create DNS persona
	dnsBody := gen.PersonasCreateJSONRequestBody{
		Name:        "dns-1",
		PersonaType: gen.PersonaType("dns"),
		ConfigDetails: map[string]interface{}{
			"resolvers": []interface{}{"1.1.1.1:53"},
		},
	}
	cr2, err := h.PersonasCreate(ctx, gen.PersonasCreateRequestObject{Body: &dnsBody})
	if err != nil {
		t.Fatalf("create dns persona error: %v", err)
	}
	if _, ok := cr2.(gen.PersonasCreate201JSONResponse); !ok {
		t.Fatalf("expected 201 for dns create")
	}

	// List
	lr, err := h.PersonasList(ctx, gen.PersonasListRequestObject{})
	if err != nil {
		t.Fatalf("list error: %v", err)
	}
	l200, ok := lr.(gen.PersonasList200JSONResponse)
	if !ok || l200.Data == nil || len(*l200.Data) < 2 {
		t.Fatalf("expected at least 2 personas, got %+v", l200)
	}

	// Get by ID
	gr, err := h.PersonasGet(ctx, gen.PersonasGetRequestObject{Id: openapi_types.UUID(httpID)})
	if err != nil {
		t.Fatalf("get error: %v", err)
	}
	g200, ok := gr.(gen.PersonasGet200JSONResponse)
	if !ok || g200.Data == nil || g200.Data.Name != "http-1" {
		t.Fatalf("unexpected get response: %+v", g200)
	}

	// GetHttp happy path
	ghr, err := h.PersonasGetHttp(ctx, gen.PersonasGetHttpRequestObject{Id: openapi_types.UUID(httpID)})
	if err != nil {
		t.Fatalf("get http error: %v", err)
	}
	if _, ok := ghr.(gen.PersonasGetHttp200JSONResponse); !ok {
		t.Fatalf("expected 200 for get http")
	}

	// Update name
	newName := "http-1b"
	ur, err := h.PersonasUpdate(ctx, gen.PersonasUpdateRequestObject{Id: openapi_types.UUID(httpID), Body: &gen.PersonasUpdateJSONRequestBody{Name: &newName}})
	if err != nil {
		t.Fatalf("update error: %v", err)
	}
	u200, ok := ur.(gen.PersonasUpdate200JSONResponse)
	if !ok || u200.Data == nil || u200.Data.Name != newName {
		t.Fatalf("unexpected update response: %+v", u200)
	}

	// Delete
	dr, err := h.PersonasDelete(ctx, gen.PersonasDeleteRequestObject{Id: openapi_types.UUID(httpID)})
	if err != nil {
		t.Fatalf("delete error: %v", err)
	}
	if _, ok := dr.(gen.PersonasDelete200JSONResponse); !ok {
		t.Fatalf("expected 200 delete")
	}
}
