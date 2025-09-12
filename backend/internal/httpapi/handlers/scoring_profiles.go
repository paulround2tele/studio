package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// ScoringProfileHandler provides HTTP endpoints for scoring profile CRUD & rescore.
type ScoringProfileHandler struct {
	Store    store.CampaignStore
	Analysis services.AnalysisService
}

func (h *ScoringProfileHandler) Register(mux *http.ServeMux) {
	mux.HandleFunc("/api/scoring-profiles", h.handleProfiles)
	mux.HandleFunc("/api/scoring-profiles/associate", h.handleAssociate)
	mux.HandleFunc("/api/campaigns/rescore", h.handleRescore)
}

type profilePayload struct {
	ID          *uuid.UUID         `json:"id,omitempty"`
	Name        string             `json:"name"`
	Description *string            `json:"description,omitempty"`
	Weights     map[string]float64 `json:"weights"`
	Version     int                `json:"version,omitempty"`
}

func (h *ScoringProfileHandler) handleProfiles(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	switch r.Method {
	case http.MethodGet:
		// list
		// Attempt dynamic method via type assertion (methods not on interface yet)
		if ext, ok := h.Store.(interface {
			ListScoringProfiles(context.Context, store.Querier, int) ([]*models.ScoringProfile, error)
		}); ok {
			items, err := ext.ListScoringProfiles(ctx, nil, 100)
			if err != nil {
				http.Error(w, err.Error(), 500)
				return
			}
			_ = json.NewEncoder(w).Encode(items)
			return
		}
		http.Error(w, "listing unsupported", 501)
		return
	case http.MethodPost:
		var p profilePayload
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, "invalid json", 400)
			return
		}
		raw, _ := json.Marshal(p.Weights)
		sp := &models.ScoringProfile{Name: p.Name, Weights: raw, Version: p.Version}
		if p.Description != nil {
			sp.Description.Scan(*p.Description)
		}
		if sp.Version == 0 {
			sp.Version = 1
		}
		if ext, ok := h.Store.(interface {
			CreateScoringProfile(context.Context, store.Querier, *models.ScoringProfile) error
		}); ok {
			if err := ext.CreateScoringProfile(ctx, nil, sp); err != nil {
				http.Error(w, err.Error(), 500)
				return
			}
		} else {
			http.Error(w, "create unsupported", 501)
			return
		}
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(sp)
	case http.MethodPut:
		var p profilePayload
		if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
			http.Error(w, "invalid json", 400)
			return
		}
		if p.ID == nil {
			http.Error(w, "id required", 400)
			return
		}
		var existing *models.ScoringProfile
		if ext, ok := h.Store.(interface {
			GetScoringProfile(context.Context, store.Querier, uuid.UUID) (*models.ScoringProfile, error)
		}); ok {
			res, gErr := ext.GetScoringProfile(ctx, nil, *p.ID)
			if gErr != nil {
				http.Error(w, "not found", 404)
				return
			}
			existing = res
		} else {
			http.Error(w, "get unsupported", 501)
			return
		}
		if p.Name != "" {
			existing.Name = p.Name
		}
		if p.Description != nil {
			existing.Description.Scan(*p.Description)
		}
		if len(p.Weights) > 0 {
			existing.Weights, _ = json.Marshal(p.Weights)
		}
		if p.Version > 0 {
			existing.Version = p.Version
		}
		existing.UpdatedAt = time.Now().UTC()
		if ext, ok := h.Store.(interface {
			UpdateScoringProfile(context.Context, store.Querier, *models.ScoringProfile) error
		}); ok {
			if err := ext.UpdateScoringProfile(ctx, nil, existing); err != nil {
				http.Error(w, err.Error(), 500)
				return
			}
		} else {
			http.Error(w, "update unsupported", 501)
			return
		}
		_ = json.NewEncoder(w).Encode(existing)
	case http.MethodDelete:
		idStr := r.URL.Query().Get("id")
		if idStr == "" {
			http.Error(w, "id required", 400)
			return
		}
		id, err := uuid.Parse(idStr)
		if err != nil {
			http.Error(w, "bad id", 400)
			return
		}
		if ext, ok := h.Store.(interface {
			DeleteScoringProfile(context.Context, store.Querier, uuid.UUID) error
		}); ok {
			if err := ext.DeleteScoringProfile(ctx, nil, id); err != nil {
				http.Error(w, err.Error(), 500)
				return
			}
		} else {
			http.Error(w, "delete unsupported", 501)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

type associatePayload struct {
	CampaignID string `json:"campaignId"`
	ProfileID  string `json:"profileId"`
}

func (h *ScoringProfileHandler) handleAssociate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var p associatePayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "invalid json", 400)
		return
	}
	cID, err := uuid.Parse(p.CampaignID)
	if err != nil {
		http.Error(w, "bad campaignId", 400)
		return
	}
	prID, err := uuid.Parse(p.ProfileID)
	if err != nil {
		http.Error(w, "bad profileId", 400)
		return
	}
	if ext, ok := h.Store.(interface {
		AssociateCampaignScoringProfile(context.Context, store.Querier, uuid.UUID, uuid.UUID) error
	}); ok {
		if err := ext.AssociateCampaignScoringProfile(r.Context(), nil, cID, prID); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
	} else {
		http.Error(w, "associate unsupported", 501)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type rescorePayload struct {
	CampaignID string `json:"campaignId"`
}

func (h *ScoringProfileHandler) handleRescore(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var p rescorePayload
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "invalid json", 400)
		return
	}
	cID, err := uuid.Parse(p.CampaignID)
	if err != nil {
		http.Error(w, "bad campaignId", 400)
		return
	}
	if h.Analysis == nil {
		http.Error(w, "analysis unavailable", 503)
		return
	}
	go func(ctx context.Context, id uuid.UUID) {
		if ext, ok := h.Analysis.(interface {
			RescoreCampaign(context.Context, uuid.UUID) error
		}); ok {
			_ = ext.RescoreCampaign(ctx, id)
		}
	}(context.Background(), cID)
	w.WriteHeader(http.StatusAccepted)
}
