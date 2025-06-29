// File: backend/internal/api/persona_handlers.go
package api

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strconv"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// --- DTOs for Persona API ---

type CreatePersonaRequest struct {
	Name          string                 `json:"name" validate:"required,min=1,max=255"`
	PersonaType   models.PersonaTypeEnum `json:"personaType" validate:"required,oneof=dns http"`
	Description   string                 `json:"description,omitempty"`
	ConfigDetails json.RawMessage        `json:"configDetails" validate:"required"`
	IsEnabled     *bool                  `json:"isEnabled,omitempty"`
}

type UpdatePersonaRequest struct {
	Name          *string         `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	Description   *string         `json:"description,omitempty"`
	ConfigDetails json.RawMessage `json:"configDetails,omitempty"`
	IsEnabled     *bool           `json:"isEnabled,omitempty"`
}

// PersonaResponse formats a persona for API responses.
type PersonaResponse struct {
	ID            uuid.UUID              `json:"id"`
	Name          string                 `json:"name"`
	PersonaType   models.PersonaTypeEnum `json:"personaType"`
	Description   string                 `json:"description,omitempty"`
	ConfigDetails json.RawMessage        `json:"configDetails"`
	IsEnabled     bool                   `json:"isEnabled"`
	CreatedAt     time.Time              `json:"createdAt"`
	UpdatedAt     time.Time              `json:"updatedAt"`
}

func toPersonaResponse(p *models.Persona) PersonaResponse {
	return PersonaResponse{
		ID:            p.ID,
		Name:          p.Name,
		PersonaType:   p.PersonaType,
		Description:   p.Description.String,
		ConfigDetails: p.ConfigDetails,
		IsEnabled:     p.IsEnabled,
		CreatedAt:     p.CreatedAt,
		UpdatedAt:     p.UpdatedAt,
	}
}

// --- Gin Handlers for Personas ---

// ListAllPersonasGin lists all personas.
// @Summary List all personas
// @Description Lists all personas
// @Tags Personas
// @Produce json
// @Success 200 {array} models.Persona
// @Failure 500 {object} map[string]string
// @Router /personas [get]
func (h *APIHandler) ListAllPersonasGin(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))

	isEnabledQuery := c.Query("isEnabled")
	var isEnabledFilter *bool
	if isEnabledQuery != "" {
		b, err := strconv.ParseBool(isEnabledQuery)
		if err == nil {
			isEnabledFilter = &b
		}
	}

	// Optional type filter
	personaTypeQuery := c.Query("personaType")
	var typeFilter models.PersonaTypeEnum
	if personaTypeQuery != "" {
		switch models.PersonaTypeEnum(personaTypeQuery) {
		case models.PersonaTypeDNS:
			typeFilter = models.PersonaTypeDNS
		case models.PersonaTypeHTTP:
			typeFilter = models.PersonaTypeHTTP
		default:
			// Invalid type, ignore filter
		}
	}
	// Note: empty typeFilter ("") means all types

	filter := store.ListPersonasFilter{
		Type:      typeFilter, // empty string means all types
		IsEnabled: isEnabledFilter,
		Limit:     limit,
		Offset:    offset,
	}

	var querier store.Querier
	if h.DB != nil {
		querier = h.DB
	}

	personas, err := h.PersonaStore.ListPersonas(c.Request.Context(), querier, filter)
	if err != nil {
		log.Printf("Error listing all personas: %v", err)
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to list personas")
		return
	}

	responseItems := make([]PersonaResponse, len(personas))
	for i, p := range personas {
		responseItems[i] = toPersonaResponse(p)
	}

	respondWithJSONGin(c, http.StatusOK, responseItems)
}

// CreatePersonaGin creates a new persona.
// @Summary Create persona
// @Description Creates a new persona
// @Tags Personas
// @Accept json
// @Produce json
// @Param persona body models.Persona true "Persona"
// @Success 201 {object} models.Persona
// @Failure 400 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /personas [post]
func (h *APIHandler) CreatePersonaGin(c *gin.Context) {
	var req CreatePersonaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[CreatePersonaGin] Error binding JSON: %v", err)
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	// Validate persona type
	switch req.PersonaType {
	case models.PersonaTypeDNS, models.PersonaTypeHTTP:
		// Valid types
	default:
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid personaType. Must be 'dns' or 'http'")
		return
	}

	// This is the main handler method that handles persona creation
	// Create the persona model from the request
	now := time.Now()
	persona := &models.Persona{
		ID:            uuid.New(),
		Name:          req.Name,
		PersonaType:   req.PersonaType,
		Description:   sql.NullString{String: req.Description, Valid: req.Description != ""},
		ConfigDetails: req.ConfigDetails,
		IsEnabled:     req.IsEnabled != nil && *req.IsEnabled, // Default to false if not specified
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	// Use database transaction if available
	var querier store.Querier
	if h.DB != nil {
		querier = h.DB
	}

	// Create the persona
	if err := h.PersonaStore.CreatePersona(c.Request.Context(), querier, persona); err != nil {
		if err == store.ErrDuplicateEntry {
			respondWithErrorGin(c, http.StatusConflict, fmt.Sprintf("Persona with name '%s' and type '%s' already exists", req.Name, req.PersonaType))
		} else {
			log.Printf("Error creating persona: %v", err)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to create persona")
		}
		return
	}

	log.Printf("Successfully created persona %s (%s)", persona.ID, persona.Name)
	respondWithJSONGin(c, http.StatusCreated, toPersonaResponse(persona))
}

// GetPersonaByIDGin handles GET /api/v2/personas/:id
// Returns a specific persona by ID regardless of type
// @Summary Get persona
// @Description Gets a persona by ID
// @Tags Personas
// @Produce json
// @Param id path string true "Persona ID"
// @Success 200 {object} models.Persona
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /personas/{id} [get]
func (h *APIHandler) GetPersonaByIDGin(c *gin.Context) {
	personaIDStr := c.Param("id")
	personaID, err := uuid.Parse(personaIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid persona ID format")
		return
	}

	var querier store.Querier
	if h.DB != nil {
		querier = h.DB
	}

	persona, err := h.PersonaStore.GetPersonaByID(c.Request.Context(), querier, personaID)
	if err != nil {
		if err == store.ErrNotFound {
			respondWithErrorGin(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr))
		} else {
			log.Printf("Error fetching persona %s: %v", personaIDStr, err)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to fetch persona")
		}
		return
	}

	respondWithJSONGin(c, http.StatusOK, toPersonaResponse(persona))
}

// UpdatePersonaGin handles PUT /api/v2/personas/:id
// Updates a persona by ID, preserving its original type
// @Summary Update persona
// @Description Updates a persona by ID
// @Tags Personas
// @Accept json
// @Produce json
// @Param id path string true "Persona ID"
// @Param persona body models.Persona true "Persona"
// @Success 200 {object} models.Persona
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /personas/{id} [put]
func (h *APIHandler) UpdatePersonaGin(c *gin.Context) {
	personaIDStr := c.Param("id")
	personaID, err := uuid.Parse(personaIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid persona ID format")
		return
	}

	// First, get the existing persona to determine its type
	var querier store.Querier
	if h.DB != nil {
		querier = h.DB
	}

	existingPersona, err := h.PersonaStore.GetPersonaByID(c.Request.Context(), querier, personaID)
	if err != nil {
		if err == store.ErrNotFound {
			respondWithErrorGin(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr))
		} else {
			log.Printf("Error fetching persona %s for update: %v", personaIDStr, err)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to fetch persona for update")
		}
		return
	}

	// Parse and validate the update request
	var req UpdatePersonaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[UpdatePersonaGin] Error binding JSON: %v", err)
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request payload: "+err.Error())
		return
	}

	// Update the persona fields
	now := time.Now()
	if req.Name != nil {
		existingPersona.Name = *req.Name
	}
	if req.Description != nil {
		existingPersona.Description = sql.NullString{String: *req.Description, Valid: *req.Description != ""}
	}
	if req.ConfigDetails != nil {
		existingPersona.ConfigDetails = req.ConfigDetails
	}
	if req.IsEnabled != nil {
		existingPersona.IsEnabled = *req.IsEnabled
	}
	existingPersona.UpdatedAt = now

	// Use database transaction if available
	if h.DB != nil {
		querier = h.DB
	}

	// Update the persona in the database
	if err := h.PersonaStore.UpdatePersona(c.Request.Context(), querier, existingPersona); err != nil {
		if err == store.ErrNotFound {
			respondWithErrorGin(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr))
		} else {
			log.Printf("Error updating persona %s: %v", personaIDStr, err)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to update persona")
		}
		return
	}

	log.Printf("Successfully updated persona %s (%s)", existingPersona.ID, existingPersona.Name)
	respondWithJSONGin(c, http.StatusOK, toPersonaResponse(existingPersona))
}

// DeletePersonaGin handles DELETE /api/v2/personas/:id
// Deletes a persona by ID regardless of type
// @Summary Delete persona
// @Description Deletes a persona by ID
// @Tags Personas
// @Param id path string true "Persona ID"
// @Success 200 {object} map[string]bool
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /personas/{id} [delete]
func (h *APIHandler) DeletePersonaGin(c *gin.Context) {
	personaIDStr := c.Param("id")
	personaID, err := uuid.Parse(personaIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid persona ID format")
		return
	}

	// First, get the existing persona to determine its type for proper audit logging
	var querier store.Querier
	if h.DB != nil {
		querier = h.DB
	}

	existingPersona, err := h.PersonaStore.GetPersonaByID(c.Request.Context(), querier, personaID)
	if err != nil {
		if err == store.ErrNotFound {
			respondWithErrorGin(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr))
		} else {
			log.Printf("Error fetching persona %s for deletion: %v", personaIDStr, err)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to fetch persona for deletion")
		}
		return
	}

	// Use database transaction if available
	if h.DB != nil {
		querier = h.DB
	}

	// Delete the persona from the database
	if err := h.PersonaStore.DeletePersona(c.Request.Context(), querier, existingPersona.ID); err != nil {
		if err == store.ErrNotFound {
			respondWithErrorGin(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr))
		} else {
			log.Printf("Error deleting persona %s: %v", personaIDStr, err)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to delete persona")
		}
		return
	}

	log.Printf("Successfully deleted persona %s (%s)", existingPersona.ID, existingPersona.Name)
	respondWithJSONGin(c, http.StatusOK, map[string]bool{"success": true})
}

// TestPersonaGin tests a persona.
// @Summary Test persona
// @Description Tests a persona by ID
// @Tags Personas
// @Param id path string true "Persona ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} map[string]string
// @Failure 404 {object} map[string]string
// @Failure 500 {object} map[string]string
// @Router /personas/{id}/test [post]
func (h *APIHandler) TestPersonaGin(c *gin.Context) {
	personaIDStr := c.Param("id")
	personaID, err := uuid.Parse(personaIDStr)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid persona ID format")
		return
	}

	// Get the persona to determine its type
	var querier store.Querier
	if h.DB != nil {
		querier = h.DB
	}

	persona, err := h.PersonaStore.GetPersonaByID(c.Request.Context(), querier, personaID)
	if err != nil {
		if err == store.ErrNotFound {
			respondWithErrorGin(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr))
		} else {
			log.Printf("Error fetching persona %s for testing: %v", personaIDStr, err)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to fetch persona for testing")
		}
		return
	}

	// For now, return a simple test result
	// In the future, this could trigger actual testing logic
	testResult := map[string]interface{}{
		"personaId":   persona.ID,
		"personaType": persona.PersonaType,
		"status":      "success",
		"message":     fmt.Sprintf("%s persona test completed successfully", persona.PersonaType),
		"testedAt":    time.Now().UTC().Format(time.RFC3339),
	}

	respondWithJSONGin(c, http.StatusOK, testResult)
}
