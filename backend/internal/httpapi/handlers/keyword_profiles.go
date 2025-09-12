package handlers

import (
    "context"
    "database/sql"
    "encoding/json"
    "net/http"
    "strings"

    "github.com/fntelecomllc/studio/backend/internal/models"
    "github.com/fntelecomllc/studio/backend/internal/store"
    "github.com/google/uuid"
)

// KeywordProfileHandler provides HTTP endpoints for keyword profile CRUD.
// This is a lightweight parallel to ScoringProfileHandler until OpenAPI generated strict server wiring is completed.
type KeywordProfileHandler struct {
    Store interface {
        CreateKeywordProfile(context.Context, store.Querier, *models.KeywordProfile) error
        GetKeywordProfile(context.Context, store.Querier, uuid.UUID) (*models.KeywordProfile, error)
        ListKeywordProfiles(context.Context, store.Querier, int) ([]*models.KeywordProfile, error)
        UpdateKeywordProfile(context.Context, store.Querier, *models.KeywordProfile) error
        DeleteKeywordProfile(context.Context, store.Querier, uuid.UUID) error
        AssociateCampaignKeywordProfile(context.Context, store.Querier, uuid.UUID, uuid.UUID) error
    }
}

func (h *KeywordProfileHandler) Register(mux *http.ServeMux) {
    mux.HandleFunc("/api/keyword-profiles", h.handleProfiles)
    mux.HandleFunc("/api/keyword-profiles/", h.handleProfileByID)
    mux.HandleFunc("/api/campaigns/", h.handleAssociate) // expects /api/campaigns/{id}/keyword-profile
}

func (h *KeywordProfileHandler) handleProfiles(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    switch r.Method {
    case http.MethodGet:
        ext := h.Store
        items, err := ext.ListKeywordProfiles(ctx, nil, 100)
        if err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }
        writeJSON(w, http.StatusOK, map[string]any{"data": items})
    case http.MethodPost:
        var req struct {
            Name string `json:"name"`
            Description *string `json:"description"`
            Keywords []string `json:"keywords"`
        }
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil { http.Error(w, "invalid body", http.StatusBadRequest); return }
        if req.Name == "" || len(req.Keywords) == 0 { http.Error(w, "name & keywords required", http.StatusBadRequest); return }
        raw, _ := json.Marshal(req.Keywords)
        kp := &models.KeywordProfile{Name: req.Name, Keywords: raw}
        if req.Description != nil { kp.Description = nullableString(*req.Description) }
        if err := h.Store.CreateKeywordProfile(ctx, nil, kp); err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }
        writeJSON(w, http.StatusCreated, map[string]any{"data": kp})
    default:
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
    }
}

// writeJSON small helper mirroring scoring handler style
func writeJSON(w http.ResponseWriter, status int, v any) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    _ = json.NewEncoder(w).Encode(v)
}

func nullableString(s string) sql.NullString { return sql.NullString{String: s, Valid: true} }

func (h *KeywordProfileHandler) handleProfileByID(w http.ResponseWriter, r *http.Request) {
    if !strings.HasPrefix(r.URL.Path, "/api/keyword-profiles/") { http.NotFound(w, r); return }
    idStr := strings.TrimPrefix(r.URL.Path, "/api/keyword-profiles/")
    if idStr == "" { http.NotFound(w, r); return }
    ctx := r.Context()
    id, err := uuid.Parse(idStr)
    if err != nil { http.Error(w, "invalid id", http.StatusBadRequest); return }
    switch r.Method {
    case http.MethodGet:
        kp, err := h.Store.GetKeywordProfile(ctx, nil, id)
        if err != nil { http.Error(w, err.Error(), http.StatusNotFound); return }
        writeJSON(w, http.StatusOK, map[string]any{"data": kp})
    case http.MethodPatch:
        existing, err := h.Store.GetKeywordProfile(ctx, nil, id)
        if err != nil { http.Error(w, err.Error(), http.StatusNotFound); return }
        var req struct { Name *string `json:"name"`; Description *string `json:"description"`; Keywords *[]string `json:"keywords"` }
        if err := json.NewDecoder(r.Body).Decode(&req); err != nil { http.Error(w, "invalid body", http.StatusBadRequest); return }
        if req.Name != nil { existing.Name = *req.Name }
        if req.Description != nil { existing.Description = nullableString(*req.Description) }
        if req.Keywords != nil { raw, _ := json.Marshal(req.Keywords); existing.Keywords = raw }
        if err := h.Store.UpdateKeywordProfile(ctx, nil, existing); err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }
        writeJSON(w, http.StatusOK, map[string]any{"data": existing})
    case http.MethodDelete:
        if err := h.Store.DeleteKeywordProfile(ctx, nil, id); err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }
        w.WriteHeader(http.StatusNoContent)
    default:
        http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
    }
}

func (h *KeywordProfileHandler) handleAssociate(w http.ResponseWriter, r *http.Request) {
    // pattern: /api/campaigns/{id}/keyword-profile
    if !strings.Contains(r.URL.Path, "/keyword-profile") { return }
    parts := strings.Split(r.URL.Path, "/")
    if len(parts) < 4 { http.NotFound(w, r); return }
    campaignID, err := uuid.Parse(parts[3])
    if err != nil { http.Error(w, "invalid campaign id", http.StatusBadRequest); return }
    if r.Method != http.MethodPost { http.Error(w, "method not allowed", http.StatusMethodNotAllowed); return }
    var req struct { KeywordProfileID string `json:"keyword_profile_id"` }
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil { http.Error(w, "invalid body", http.StatusBadRequest); return }
    kpID, err := uuid.Parse(req.KeywordProfileID)
    if err != nil { http.Error(w, "invalid keyword_profile_id", http.StatusBadRequest); return }
    if err := h.Store.AssociateCampaignKeywordProfile(r.Context(), nil, campaignID, kpID); err != nil { http.Error(w, err.Error(), http.StatusInternalServerError); return }
    w.WriteHeader(http.StatusNoContent)
}
