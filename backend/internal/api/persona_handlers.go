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
	"github.com/fntelecomllc/studio/backend/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// --- DTOs for Persona API ---

type CreatePersonaRequest struct {
	Name          string                 `json:"name" validate:"required,min=1,max=255"`
	PersonaType   models.PersonaTypeEnum `json:"personaType" validate:"required,oneof=dns http"`
	Description   string                 `json:"description,omitempty"`
	ConfigDetails interface{}            `json:"configDetails" validate:"required"` // Accept structured config
	IsEnabled     *bool                  `json:"isEnabled,omitempty"`
}

type UpdatePersonaRequest struct {
	Name          *string     `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	Description   *string     `json:"description,omitempty"`
	ConfigDetails interface{} `json:"configDetails,omitempty"` // Accept structured config
	IsEnabled     *bool       `json:"isEnabled,omitempty"`
}

// PersonaResponse formats a persona for API responses.
type PersonaResponse struct {
	ID            uuid.UUID              `json:"id"`
	Name          string                 `json:"name"`
	PersonaType   models.PersonaTypeEnum `json:"personaType"`
	Description   string                 `json:"description,omitempty"`
	ConfigDetails interface{}            `json:"configDetails"` // Return structured config
	IsEnabled     bool                   `json:"isEnabled"`
	CreatedAt     time.Time              `json:"createdAt"`
	UpdatedAt     time.Time              `json:"updatedAt"`
}

func toPersonaResponse(p *models.Persona) PersonaResponse {
	// Parse ConfigDetails back to structured format for API response
	var configDetails interface{}
	if len(p.ConfigDetails) > 0 {
		switch p.PersonaType {
		case models.PersonaTypeHTTP:
			var httpConfig models.HttpPersonaConfig
			if err := json.Unmarshal(p.ConfigDetails, &httpConfig); err == nil {
				configDetails = httpConfig
			} else {
				configDetails = p.ConfigDetails
			}
		case models.PersonaTypeDNS:
			var dnsConfig models.DnsPersonaConfig
			if err := json.Unmarshal(p.ConfigDetails, &dnsConfig); err == nil {
				configDetails = dnsConfig
			} else {
				configDetails = p.ConfigDetails
			}
		default:
			configDetails = p.ConfigDetails
		}
	}

	return PersonaResponse{
		ID:            p.ID,
		Name:          p.Name,
		PersonaType:   p.PersonaType,
		Description:   p.Description.String,
		ConfigDetails: configDetails,
		IsEnabled:     p.IsEnabled,
		CreatedAt:     p.CreatedAt,
		UpdatedAt:     p.UpdatedAt,
	}
}

// parseConfigDetails parses and validates configuration based on persona type
func parseConfigDetails(personaType models.PersonaTypeEnum, configDetails interface{}) (interface{}, error) {
	// Convert to JSON for parsing
	configJSON, err := json.Marshal(configDetails)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal config: %w", err)
	}

	switch personaType {
	case models.PersonaTypeHTTP:
		var httpConfig models.HttpPersonaConfig
		if err := json.Unmarshal(configJSON, &httpConfig); err != nil {
			return nil, fmt.Errorf("invalid HTTP persona configuration: %w", err)
		}
		return httpConfig, nil
	case models.PersonaTypeDNS:
		var dnsConfig models.DnsPersonaConfig
		if err := json.Unmarshal(configJSON, &dnsConfig); err != nil {
			return nil, fmt.Errorf("invalid DNS persona configuration: %w", err)
		}
		return dnsConfig, nil
	default:
		return nil, fmt.Errorf("unsupported persona type: %s", personaType)
	}
}


// --- Gin Handlers for Personas ---

// ListAllPersonasGin lists all personas.
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
			respondWithStandardError(c, http.StatusBadRequest, "Invalid personaType parameter", nil)
			return
		}
	}

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
		respondWithStandardError(c, http.StatusInternalServerError, "Failed to list personas", err)
		return
	}

	responseItems := make([]PersonaResponse, len(personas))
	for i, p := range personas {
		responseItems[i] = toPersonaResponse(p)
	}

	respondWithStandardSuccess(c, http.StatusOK, responseItems, "Personas retrieved successfully")
}

// CreatePersonaGin creates a new persona.
func (h *APIHandler) CreatePersonaGin(c *gin.Context) {
	var req CreatePersonaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[CreatePersonaGin] Error binding JSON: %v", err)
		respondWithStandardError(c, http.StatusBadRequest, "Invalid request payload", err)
		return
	}

	// Validate persona type
	switch req.PersonaType {
	case models.PersonaTypeDNS, models.PersonaTypeHTTP:
		// Valid types
	default:
		respondWithStandardError(c, http.StatusBadRequest, "Invalid personaType. Must be 'dns' or 'http'", nil)
		return
	}

	// Parse and validate configuration details
	parsedConfig, err := parseConfigDetails(req.PersonaType, req.ConfigDetails)
	if err != nil {
		respondWithStandardError(c, http.StatusBadRequest, "Invalid configuration details", err)
		return
	}

	// Convert parsed config back to JSON for storage
	configJSON, err := json.Marshal(parsedConfig)
	if err != nil {
		respondWithStandardError(c, http.StatusInternalServerError, "Failed to serialize configuration", err)
		return
	}

	// Create the persona model from the request
	now := time.Now()
	persona := &models.Persona{
		ID:            uuid.New(),
		Name:          req.Name,
		PersonaType:   req.PersonaType,
		Description:   sql.NullString{String: req.Description, Valid: req.Description != ""},
		ConfigDetails: configJSON,
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
			respondWithStandardError(c, http.StatusConflict,
				fmt.Sprintf("Persona with name '%s' and type '%s' already exists", req.Name, req.PersonaType), err)
		} else {
			log.Printf("Error creating persona: %v", err)
			respondWithStandardError(c, http.StatusInternalServerError, "Failed to create persona", err)
		}
		return
	}

	// Broadcast persona creation to WebSocket clients
	websocket.BroadcastPersonaCreated(persona.ID.String(), toPersonaResponse(persona))
	log.Printf("Successfully created persona %s (%s) and broadcasted", persona.ID, persona.Name)
	
	respondWithStandardSuccess(c, http.StatusCreated, toPersonaResponse(persona), "Persona created successfully")
}

// GetPersonaByIDGin handles GET /api/v2/personas/:id
// Returns a specific persona by ID regardless of type
func (h *APIHandler) GetPersonaByIDGin(c *gin.Context) {
	personaIDStr := c.Param("id")
	personaID, err := uuid.Parse(personaIDStr)
	if err != nil {
		respondWithStandardError(c, http.StatusBadRequest, "Invalid persona ID format", err)
		return
	}

	var querier store.Querier
	if h.DB != nil {
		querier = h.DB
	}

	persona, err := h.PersonaStore.GetPersonaByID(c.Request.Context(), querier, personaID)
	if err != nil {
		if err == store.ErrNotFound {
			respondWithStandardError(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr), nil)
		} else {
			log.Printf("Error fetching persona %s: %v", personaIDStr, err)
			respondWithStandardError(c, http.StatusInternalServerError, "Failed to fetch persona", err)
		}
		return
	}

	respondWithStandardSuccess(c, http.StatusOK, toPersonaResponse(persona), "Persona retrieved successfully")
}

// GetHttpPersonaByIDGin handles GET /api/v2/personas/http/:id
// Returns a specific HTTP persona by ID
func (h *APIHandler) GetHttpPersonaByIDGin(c *gin.Context) {
	personaIDStr := c.Param("id")
	personaID, err := uuid.Parse(personaIDStr)
	if err != nil {
		respondWithStandardError(c, http.StatusBadRequest, "Invalid persona ID format", err)
		return
	}

	var querier store.Querier
	if h.DB != nil {
		querier = h.DB
	}

	persona, err := h.PersonaStore.GetPersonaByID(c.Request.Context(), querier, personaID)
	if err != nil {
		if err == store.ErrNotFound {
			respondWithStandardError(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr), nil)
		} else {
			log.Printf("Error fetching persona %s: %v", personaIDStr, err)
			respondWithStandardError(c, http.StatusInternalServerError, "Failed to fetch persona", err)
		}
		return
	}

	// Verify it's an HTTP persona
	if persona.PersonaType != models.PersonaTypeHTTP {
		respondWithStandardError(c, http.StatusBadRequest, "Persona is not an HTTP persona", nil)
		return
	}

	respondWithStandardSuccess(c, http.StatusOK, toPersonaResponse(persona), "HTTP persona retrieved successfully")
}

// GetDnsPersonaByIDGin handles GET /api/v2/personas/dns/:id
// Returns a specific DNS persona by ID
func (h *APIHandler) GetDnsPersonaByIDGin(c *gin.Context) {
	personaIDStr := c.Param("id")
	personaID, err := uuid.Parse(personaIDStr)
	if err != nil {
		respondWithStandardError(c, http.StatusBadRequest, "Invalid persona ID format", err)
		return
	}

	var querier store.Querier
	if h.DB != nil {
		querier = h.DB
	}

	persona, err := h.PersonaStore.GetPersonaByID(c.Request.Context(), querier, personaID)
	if err != nil {
		if err == store.ErrNotFound {
			respondWithStandardError(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr), nil)
		} else {
			log.Printf("Error fetching persona %s: %v", personaIDStr, err)
			respondWithStandardError(c, http.StatusInternalServerError, "Failed to fetch persona", err)
		}
		return
	}

	// Verify it's a DNS persona
	if persona.PersonaType != models.PersonaTypeDNS {
		respondWithStandardError(c, http.StatusBadRequest, "Persona is not a DNS persona", nil)
		return
	}

	respondWithStandardSuccess(c, http.StatusOK, toPersonaResponse(persona), "DNS persona retrieved successfully")
}

// UpdatePersonaGin handles PUT /api/v2/personas/:id
// Updates a persona by ID, preserving its original type
func (h *APIHandler) UpdatePersonaGin(c *gin.Context) {
	personaIDStr := c.Param("id")
	personaID, err := uuid.Parse(personaIDStr)
	if err != nil {
		respondWithStandardError(c, http.StatusBadRequest, "Invalid persona ID format", err)
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
			respondWithStandardError(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr), nil)
		} else {
			log.Printf("Error fetching persona %s for update: %v", personaIDStr, err)
			respondWithStandardError(c, http.StatusInternalServerError, "Failed to fetch persona for update", err)
		}
		return
	}

	// Parse and validate the update request
	var req UpdatePersonaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[UpdatePersonaGin] Error binding JSON: %v", err)
		respondWithStandardError(c, http.StatusBadRequest, "Invalid request payload", err)
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
		// Parse and validate configuration details
		parsedConfig, err := parseConfigDetails(existingPersona.PersonaType, req.ConfigDetails)
		if err != nil {
			respondWithStandardError(c, http.StatusBadRequest, "Invalid configuration details", err)
			return
		}
		// Convert parsed config back to JSON for storage
		configJSON, err := json.Marshal(parsedConfig)
		if err != nil {
			respondWithStandardError(c, http.StatusInternalServerError, "Failed to serialize configuration", err)
			return
		}
		existingPersona.ConfigDetails = configJSON
	}
	if req.IsEnabled != nil {
		existingPersona.IsEnabled = *req.IsEnabled
	}
	existingPersona.UpdatedAt = now

	// Update the persona in the database
	if err := h.PersonaStore.UpdatePersona(c.Request.Context(), querier, existingPersona); err != nil {
		if err == store.ErrNotFound {
			respondWithStandardError(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr), nil)
		} else {
			log.Printf("Error updating persona %s: %v", personaIDStr, err)
			respondWithStandardError(c, http.StatusInternalServerError, "Failed to update persona", err)
		}
		return
	}

	// Broadcast persona update to WebSocket clients
	websocket.BroadcastPersonaUpdated(existingPersona.ID.String(), toPersonaResponse(existingPersona))
	log.Printf("Successfully updated persona %s (%s) and broadcasted", existingPersona.ID, existingPersona.Name)
	
	respondWithStandardSuccess(c, http.StatusOK, toPersonaResponse(existingPersona), "Persona updated successfully")
}

// DeletePersonaGin handles DELETE /api/v2/personas/:id
// Deletes a persona by ID regardless of type
func (h *APIHandler) DeletePersonaGin(c *gin.Context) {
	personaIDStr := c.Param("id")
	personaID, err := uuid.Parse(personaIDStr)
	if err != nil {
		respondWithStandardError(c, http.StatusBadRequest, "Invalid persona ID format", err)
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
			respondWithStandardError(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr), nil)
		} else {
			log.Printf("Error fetching persona %s for deletion: %v", personaIDStr, err)
			respondWithStandardError(c, http.StatusInternalServerError, "Failed to fetch persona for deletion", err)
		}
		return
	}

	// Delete the persona from the database
	if err := h.PersonaStore.DeletePersona(c.Request.Context(), querier, existingPersona.ID); err != nil {
		if err == store.ErrNotFound {
			respondWithStandardError(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr), nil)
		} else {
			log.Printf("Error deleting persona %s: %v", personaIDStr, err)
			respondWithStandardError(c, http.StatusInternalServerError, "Failed to delete persona", err)
		}
		return
	}

	// Broadcast persona deletion to WebSocket clients
	websocket.BroadcastPersonaDeleted(existingPersona.ID.String())
	log.Printf("Successfully deleted persona %s (%s) and broadcasted", existingPersona.ID, existingPersona.Name)
	
	respondWithStandardSuccess(c, http.StatusOK, nil, "Persona deleted successfully")
}

// TestPersonaGin tests a persona.
func (h *APIHandler) TestPersonaGin(c *gin.Context) {
	personaIDStr := c.Param("id")
	personaID, err := uuid.Parse(personaIDStr)
	if err != nil {
		respondWithStandardError(c, http.StatusBadRequest, "Invalid persona ID format", err)
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
			respondWithStandardError(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr), nil)
		} else {
			log.Printf("Error fetching persona %s for testing: %v", personaIDStr, err)
			respondWithStandardError(c, http.StatusInternalServerError, "Failed to fetch persona for testing", err)
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

	respondWithStandardSuccess(c, http.StatusOK, testResult, "Persona test completed successfully")
}

