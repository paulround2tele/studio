//go:build legacy_gin
// +build legacy_gin

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

	// WS removed

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// --- DTOs for Persona API ---

type CreatePersonaRequest struct {
	Name          string      `json:"name" validate:"required,min=1,max=255"`
	PersonaType   PersonaType `json:"personaType" validate:"required,oneof=dns http"`
	Description   string      `json:"description,omitempty"`
	ConfigDetails interface{} `json:"configDetails" validate:"required"` // Accept structured config as JSON - can be HTTPConfigDetails or DNSConfigDetails
	IsEnabled     *bool       `json:"isEnabled,omitempty"`
}

type UpdatePersonaRequest struct {
	Name          *string     `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	Description   *string     `json:"description,omitempty"`
	ConfigDetails interface{} `json:"configDetails,omitempty"` // Accept structured config as JSON - can be HTTPConfigDetails or DNSConfigDetails
	IsEnabled     *bool       `json:"isEnabled,omitempty"`
}

// PersonaResponse formats a persona for API responses.
type PersonaResponse struct {
	ID            uuid.UUID   `json:"id"`
	Name          string      `json:"name"`
	PersonaType   PersonaType `json:"personaType"`
	Description   string      `json:"description,omitempty"`
	ConfigDetails interface{} `json:"configDetails"` // Return structured config as JSON - can be HTTPConfigDetails or DNSConfigDetails
	IsEnabled     bool        `json:"isEnabled"`
	CreatedAt     time.Time   `json:"createdAt"`
	UpdatedAt     time.Time   `json:"updatedAt"`
}

func toPersonaResponse(p *models.Persona) PersonaResponse {
	// Convert json.RawMessage to interface{} for proper OpenAPI typing
	var configDetails interface{}
	if len(p.ConfigDetails) > 0 {
		json.Unmarshal(p.ConfigDetails, &configDetails)
	}

	return PersonaResponse{
		ID:            p.ID,
		Name:          p.Name,
		PersonaType:   PersonaType(p.PersonaType),
		Description:   p.Description.String,
		ConfigDetails: configDetails, // Convert JSON to proper object for OpenAPI
		IsEnabled:     p.IsEnabled,
		CreatedAt:     p.CreatedAt,
		UpdatedAt:     p.UpdatedAt,
	}
}

// parseConfigDetails parses and validates configuration based on persona type
func parseConfigDetails(personaType models.PersonaTypeEnum, configDetails json.RawMessage) (json.RawMessage, error) {
	switch personaType {
	case models.PersonaTypeHTTP:
		var httpConfig models.HTTPConfigDetails
		if err := json.Unmarshal(configDetails, &httpConfig); err != nil {
			return nil, fmt.Errorf("invalid HTTP persona configuration: %w", err)
		}
		// Marshal back to JSON for return
		validated, err := json.Marshal(httpConfig)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal validated HTTP config: %w", err)
		}
		return validated, nil
	case models.PersonaTypeDNS:
		var dnsConfig models.DNSConfigDetails
		if err := json.Unmarshal(configDetails, &dnsConfig); err != nil {
			return nil, fmt.Errorf("invalid DNS persona configuration: %w", err)
		}
		// Marshal back to JSON for return
		validated, err := json.Marshal(dnsConfig)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal validated DNS config: %w", err)
		}
		return validated, nil
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
			respondWithErrorGin(c, http.StatusBadRequest, "Invalid personaType parameter")
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
func (h *APIHandler) CreatePersonaGin(c *gin.Context) {
	var req CreatePersonaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("[CreatePersonaGin] Error binding JSON: %v", err)
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request payload")
		return
	}

	// Validate persona type
	switch req.PersonaType {
	case PersonaTypeDNS, PersonaTypeHTTP:
		// Valid types
	default:
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid personaType. Must be 'dns' or 'http'")
		return
	}

	// Convert ConfigDetails from interface{} to json.RawMessage
	var configDetails json.RawMessage
	if req.ConfigDetails != nil {
		configBytes, err := json.Marshal(req.ConfigDetails)
		if err != nil {
			respondWithErrorGin(c, http.StatusBadRequest, "Invalid configuration details format")
			return
		}
		configDetails = configBytes
	}

	// Parse and validate configuration details
	parsedConfig, err := parseConfigDetails(models.PersonaTypeEnum(req.PersonaType), configDetails)
	if err != nil {
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid configuration details")
		return
	}

	// Convert parsed config back to JSON for storage
	configJSON, err := json.Marshal(parsedConfig)
	if err != nil {
		respondWithErrorGin(c, http.StatusInternalServerError, "Failed to serialize configuration")
		return
	}

	// Create the persona model from the request
	now := time.Now()
	persona := &models.Persona{
		ID:            uuid.New(),
		Name:          req.Name,
		PersonaType:   models.PersonaTypeEnum(req.PersonaType),
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
			respondWithErrorGin(c, http.StatusConflict, fmt.Sprintf("Persona with name '%s' and type '%s' already exists", req.Name, req.PersonaType))
		} else {
			log.Printf("Error creating persona: %v", err)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to create persona")
		}
		return
	}

	// Realtime broadcast via WebSocket removed
	log.Printf("Successfully created persona %s (%s)", persona.ID, persona.Name)

	personaResponse := toPersonaResponse(persona)
	respondWithJSONGin(c, http.StatusCreated, personaResponse)
}

// GetPersonaByIDGin returns a specific persona by ID regardless of type.
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

	personaResponse := toPersonaResponse(persona)
	respondWithJSONGin(c, http.StatusOK, personaResponse)
}

// GetHttpPersonaByIDGin returns a specific HTTP persona by ID.
func (h *APIHandler) GetHttpPersonaByIDGin(c *gin.Context) {
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

	// Verify it's an HTTP persona
	if persona.PersonaType != models.PersonaTypeHTTP {
		respondWithErrorGin(c, http.StatusBadRequest, "Persona is not an HTTP persona")
		return
	}

	personaResponse := toPersonaResponse(persona)
	respondWithJSONGin(c, http.StatusOK, personaResponse)
}

// GetDnsPersonaByIDGin returns a specific DNS persona by ID.
func (h *APIHandler) GetDnsPersonaByIDGin(c *gin.Context) {
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

	// Verify it's a DNS persona
	if persona.PersonaType != models.PersonaTypeDNS {
		respondWithErrorGin(c, http.StatusBadRequest, "Persona is not a DNS persona")
		return
	}

	personaResponse := toPersonaResponse(persona)
	respondWithJSONGin(c, http.StatusOK, personaResponse)
}

// UpdatePersonaGin updates a persona by ID, preserving its original type.
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
		respondWithErrorGin(c, http.StatusBadRequest, "Invalid request payload")
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
		// Convert ConfigDetails from interface{} to json.RawMessage
		var configDetails json.RawMessage
		configBytes, err := json.Marshal(req.ConfigDetails)
		if err != nil {
			respondWithErrorGin(c, http.StatusBadRequest, "Invalid configuration details format")
			return
		}
		configDetails = configBytes

		// Parse and validate configuration details
		parsedConfig, err := parseConfigDetails(existingPersona.PersonaType, configDetails)
		if err != nil {
			respondWithErrorGin(c, http.StatusBadRequest, "Invalid configuration details")
			return
		}
		// Convert parsed config back to JSON for storage
		configJSON, err := json.Marshal(parsedConfig)
		if err != nil {
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to serialize configuration")
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
			respondWithErrorGin(c, http.StatusNotFound, fmt.Sprintf("Persona with ID %s not found", personaIDStr))
		} else {
			log.Printf("Error updating persona %s: %v", personaIDStr, err)
			respondWithErrorGin(c, http.StatusInternalServerError, "Failed to update persona")
		}
		return
	}

	// Realtime broadcast via WebSocket removed
	log.Printf("Successfully updated persona %s (%s)", existingPersona.ID, existingPersona.Name)

	respondWithJSONGin(c, http.StatusOK, toPersonaResponse(existingPersona))
}

// DeletePersonaGin deletes a persona by ID regardless of type.
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

	// Realtime broadcast via WebSocket removed
	log.Printf("Successfully deleted persona %s (%s)", existingPersona.ID, existingPersona.Name)

	respondWithJSONGin(c, http.StatusOK, nil)
}

// TestPersonaGin tests a persona.
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
	testResult := PersonaTestResponse{
		PersonaID:   persona.ID.String(),
		PersonaType: string(persona.PersonaType),
		PersonaName: persona.Name,
		Success:     true,
		TestPassed:  true,
		Message:     fmt.Sprintf("%s persona test completed successfully", persona.PersonaType),
		TestResults: PersonaTestResultData{
			Duration:     100, // Mock data
			RequestCount: 1,
			SuccessCount: 1,
			ErrorCount:   0,
			Details:      "Mock test data - will be replaced with actual test results",
		},
		Results:   PersonaTestResultData{},
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	respondWithJSONGin(c, http.StatusOK, testResult)
}
