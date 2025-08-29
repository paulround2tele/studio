package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	gen "github.com/fntelecomllc/studio/backend/internal/api/gen"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	openapi_types "github.com/oapi-codegen/runtime/types"
)

// ---- Personas helpers ----
func personaToResponse(p *models.Persona) gen.PersonaResponse {
	// Convert json.RawMessage to map[string]interface{}
	var cfg map[string]interface{}
	if len(p.ConfigDetails) > 0 {
		_ = json.Unmarshal(p.ConfigDetails, &cfg)
	}
	return gen.PersonaResponse{
		ConfigDetails: func() *map[string]interface{} {
			if cfg == nil {
				return nil
			}
			return &cfg
		}(),
		CreatedAt: p.CreatedAt,
		Description: func() *string {
			if p.Description.Valid {
				s := p.Description.String
				return &s
			}
			return nil
		}(),
		Id:          openapi_types.UUID(p.ID),
		IsEnabled:   p.IsEnabled,
		Name:        p.Name,
		PersonaType: gen.PersonaType(p.PersonaType),
		UpdatedAt:   p.UpdatedAt,
	}
}

// parseConfigDetails validates and normalizes config JSON based on persona type
func parsePersonaConfig(pt models.PersonaTypeEnum, raw json.RawMessage) (json.RawMessage, error) {
	switch pt {
	case models.PersonaTypeHTTP:
		var cfg models.HTTPConfigDetails
		if err := json.Unmarshal(raw, &cfg); err != nil {
			return nil, fmt.Errorf("invalid HTTP persona configuration: %w", err)
		}
		b, err := json.Marshal(cfg)
		if err != nil {
			return nil, fmt.Errorf("marshal http config: %w", err)
		}
		return b, nil
	case models.PersonaTypeDNS:
		var cfg models.DNSConfigDetails
		if err := json.Unmarshal(raw, &cfg); err != nil {
			return nil, fmt.Errorf("invalid DNS persona configuration: %w", err)
		}
		b, err := json.Marshal(cfg)
		if err != nil {
			return nil, fmt.Errorf("marshal dns config: %w", err)
		}
		return b, nil
	default:
		return nil, fmt.Errorf("unsupported persona type: %s", pt)
	}
}

// ---- Personas endpoints ----
func (h *strictHandlers) PersonasList(ctx context.Context, r gen.PersonasListRequestObject) (gen.PersonasListResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Persona == nil || h.deps.DB == nil {
		return gen.PersonasList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "persona store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Build filter
	var typeFilter models.PersonaTypeEnum
	if r.Params.PersonaType != nil {
		typeFilter = models.PersonaTypeEnum(*r.Params.PersonaType)
	}
	filter := store.ListPersonasFilter{
		Type:      typeFilter,
		IsEnabled: (*bool)(r.Params.IsEnabled),
	}
	if r.Params.Limit != nil {
		filter.Limit = int(*r.Params.Limit)
	}
	if r.Params.Offset != nil {
		filter.Offset = int(*r.Params.Offset)
	}

	personas, err := h.deps.Stores.Persona.ListPersonas(ctx, h.deps.DB, filter)
	if err != nil {
		return gen.PersonasList500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to list personas", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	items := make([]gen.PersonaResponse, 0, len(personas))
	for _, p := range personas {
		items = append(items, personaToResponse(p))
	}
	resp := gen.PersonasList200JSONResponse{
		Data:      &items,
		Metadata:  okMeta(),
		RequestId: reqID(),
		Success:   boolPtr(true),
	}
	return resp, nil
}

func (h *strictHandlers) PersonasCreate(ctx context.Context, r gen.PersonasCreateRequestObject) (gen.PersonasCreateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Persona == nil || h.deps.DB == nil {
		return gen.PersonasCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "persona store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.PersonasCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Validate persona type
	pt := models.PersonaTypeEnum(r.Body.PersonaType)
	if pt != models.PersonaTypeDNS && pt != models.PersonaTypeHTTP {
		return gen.PersonasCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid personaType (dns|http)", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Marshal configDetails
	var raw json.RawMessage
	if r.Body.ConfigDetails != nil {
		b, err := json.Marshal(r.Body.ConfigDetails)
		if err != nil {
			return gen.PersonasCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid configDetails", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		raw = b
	}
	parsed, err := parsePersonaConfig(pt, raw)
	if err != nil {
		return gen.PersonasCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid configuration details", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	now := time.Now()
	persona := &models.Persona{
		ID:          uuid.New(),
		Name:        r.Body.Name,
		PersonaType: pt,
		Description: sql.NullString{String: func() string {
			if r.Body.Description != nil {
				return *r.Body.Description
			}
			return ""
		}(), Valid: r.Body.Description != nil && *r.Body.Description != ""},
		ConfigDetails: parsed,
		IsEnabled:     r.Body.IsEnabled != nil && *r.Body.IsEnabled,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if err := h.deps.Stores.Persona.CreatePersona(ctx, h.deps.DB, persona); err != nil {
		if err == store.ErrDuplicateEntry {
			// 409 not defined for create; use 400
			return gen.PersonasCreate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "persona already exists", Code: gen.CONFLICT, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.PersonasCreate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to create persona", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	data := personaToResponse(persona)
	resp := gen.PersonasCreate201JSONResponse{
		Data:      &data,
		Metadata:  okMeta(),
		RequestId: reqID(),
		Success:   boolPtr(true),
	}
	return resp, nil
}

func (h *strictHandlers) PersonasGet(ctx context.Context, r gen.PersonasGetRequestObject) (gen.PersonasGetResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Persona == nil || h.deps.DB == nil {
		return gen.PersonasGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "persona store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	p, err := h.deps.Stores.Persona.GetPersonaByID(ctx, h.deps.DB, uuid.UUID(r.Id))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.PersonasGet404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "persona not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.PersonasGet500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch persona", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	data := personaToResponse(p)
	return gen.PersonasGet200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) PersonasGetDns(ctx context.Context, r gen.PersonasGetDnsRequestObject) (gen.PersonasGetDnsResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Persona == nil || h.deps.DB == nil {
		return gen.PersonasGetDns500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "persona store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	p, err := h.deps.Stores.Persona.GetPersonaByID(ctx, h.deps.DB, uuid.UUID(r.Id))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.PersonasGetDns404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "persona not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.PersonasGetDns500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch persona", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if p.PersonaType != models.PersonaTypeDNS {
		return gen.PersonasGetDns400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "persona is not DNS type", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	data := personaToResponse(p)
	return gen.PersonasGetDns200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) PersonasGetHttp(ctx context.Context, r gen.PersonasGetHttpRequestObject) (gen.PersonasGetHttpResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Persona == nil || h.deps.DB == nil {
		return gen.PersonasGetHttp500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "persona store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	p, err := h.deps.Stores.Persona.GetPersonaByID(ctx, h.deps.DB, uuid.UUID(r.Id))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.PersonasGetHttp404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "persona not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.PersonasGetHttp500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch persona", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if p.PersonaType != models.PersonaTypeHTTP {
		return gen.PersonasGetHttp400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "persona is not HTTP type", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	data := personaToResponse(p)
	return gen.PersonasGetHttp200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) PersonasUpdate(ctx context.Context, r gen.PersonasUpdateRequestObject) (gen.PersonasUpdateResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Persona == nil || h.deps.DB == nil {
		return gen.PersonasUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "persona store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if r.Body == nil {
		return gen.PersonasUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "missing body", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	id := uuid.UUID(r.Id)
	existing, err := h.deps.Stores.Persona.GetPersonaByID(ctx, h.deps.DB, id)
	if err != nil {
		if err == store.ErrNotFound {
			return gen.PersonasUpdate404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "persona not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.PersonasUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch persona", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	// Apply updates
	if r.Body.Name != nil {
		existing.Name = *r.Body.Name
	}
	if r.Body.Description != nil {
		existing.Description = sql.NullString{String: *r.Body.Description, Valid: *r.Body.Description != ""}
	}
	if r.Body.ConfigDetails != nil {
		b, err := json.Marshal(r.Body.ConfigDetails)
		if err != nil {
			return gen.PersonasUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid configDetails", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		parsed, err := parsePersonaConfig(existing.PersonaType, b)
		if err != nil {
			return gen.PersonasUpdate400JSONResponse{BadRequestJSONResponse: gen.BadRequestJSONResponse{Error: gen.ApiError{Message: "invalid configuration details", Code: gen.BADREQUEST, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		existing.ConfigDetails = parsed
	}
	if r.Body.IsEnabled != nil {
		existing.IsEnabled = *r.Body.IsEnabled
	}
	existing.UpdatedAt = time.Now()

	if err := h.deps.Stores.Persona.UpdatePersona(ctx, h.deps.DB, existing); err != nil {
		if err == store.ErrDuplicateEntry {
			return gen.PersonasUpdate409JSONResponse{ConflictJSONResponse: gen.ConflictJSONResponse{Error: gen.ApiError{Message: "duplicate persona name", Code: gen.CONFLICT, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		if err == store.ErrNotFound {
			return gen.PersonasUpdate404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "persona not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.PersonasUpdate500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to update persona", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}

	data := personaToResponse(existing)
	return gen.PersonasUpdate200JSONResponse{Data: &data, Metadata: okMeta(), RequestId: reqID(), Success: boolPtr(true)}, nil
}

func (h *strictHandlers) PersonasDelete(ctx context.Context, r gen.PersonasDeleteRequestObject) (gen.PersonasDeleteResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Persona == nil || h.deps.DB == nil {
		return gen.PersonasDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "persona store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	id := uuid.UUID(r.Id)
	existing, err := h.deps.Stores.Persona.GetPersonaByID(ctx, h.deps.DB, id)
	if err != nil {
		if err == store.ErrNotFound {
			return gen.PersonasDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "persona not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.PersonasDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch persona", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	if err := h.deps.Stores.Persona.DeletePersona(ctx, h.deps.DB, existing.ID); err != nil {
		if err == store.ErrNotFound {
			return gen.PersonasDelete404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "persona not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.PersonasDelete500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to delete persona", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	msg := fmt.Sprintf("persona %s deleted", existing.ID.String())
	resp := gen.PersonasDelete200JSONResponse{
		Data: &gen.PersonaDeleteResponse{
			Deleted:   true,
			Message:   &msg,
			PersonaId: openapi_types.UUID(existing.ID),
		},
		Metadata:  okMeta(),
		RequestId: reqID(),
		Success:   boolPtr(true),
	}
	return resp, nil
}

func (h *strictHandlers) PersonasTest(ctx context.Context, r gen.PersonasTestRequestObject) (gen.PersonasTestResponseObject, error) {
	if h.deps == nil || h.deps.Stores.Persona == nil || h.deps.DB == nil {
		return gen.PersonasTest500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "persona store not initialized", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	p, err := h.deps.Stores.Persona.GetPersonaByID(ctx, h.deps.DB, uuid.UUID(r.Id))
	if err != nil {
		if err == store.ErrNotFound {
			return gen.PersonasTest404JSONResponse{NotFoundJSONResponse: gen.NotFoundJSONResponse{Error: gen.ApiError{Message: "persona not found", Code: gen.NOTFOUND, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
		}
		return gen.PersonasTest500JSONResponse{InternalServerErrorJSONResponse: gen.InternalServerErrorJSONResponse{Error: gen.ApiError{Message: "failed to fetch persona", Code: gen.INTERNALSERVERERROR, Timestamp: time.Now()}, RequestId: reqID(), Success: boolPtr(false)}}, nil
	}
	now := time.Now().UTC().Format(time.RFC3339)
	name := p.Name
	pid := p.ID.String()
	ptype := string(p.PersonaType)
	ok := true
	passed := true
	msg := fmt.Sprintf("%s persona test completed successfully", p.PersonaType)
	data := gen.PersonasTest200JSONResponse{
		Data: &gen.PersonaTestResponse{
			Message:     &msg,
			PersonaId:   &pid,
			PersonaName: &name,
			PersonaType: &ptype,
			Success:     &ok,
			TestPassed:  &passed,
			TestResults: &map[string]interface{}{"details": "Mock test data - will be replaced with actual test results", "duration": 100, "requestCount": 1, "successCount": 1, "errorCount": 0},
			Results:     &map[string]interface{}{},
			Timestamp:   &now,
		},
		Metadata:  okMeta(),
		RequestId: reqID(),
		Success:   boolPtr(true),
	}
	return data, nil
}
