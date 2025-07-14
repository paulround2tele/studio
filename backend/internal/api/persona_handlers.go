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
	ConfigDetails interface{}            `json:"configDetails" validate:"required" swaggertype:"object" example:"{}"` // Accept structured config as JSON - can be HttpPersonaConfig or DnsPersonaConfig
	IsEnabled     *bool                  `json:"isEnabled,omitempty"`
}

type UpdatePersonaRequest struct {
	Name          *string     `json:"name,omitempty" validate:"omitempty,min=1,max=255"`
	Description   *string     `json:"description,omitempty"`
	ConfigDetails interface{} `json:"configDetails,omitempty" swaggertype:"object" example:"{}"` // Accept structured config as JSON - can be HttpPersonaConfig or DnsPersonaConfig
	IsEnabled     *bool       `json:"isEnabled,omitempty"`
}

// PersonaResponse formats a persona for API responses.
// @Description API response containing persona details
type PersonaResponse struct {
	ID            uuid.UUID              `json:"id"`
	Name          string                 `json:"name"`
	PersonaType   models.PersonaTypeEnum `json:"personaType"`
	Description   string                 `json:"description,omitempty"`
	ConfigDetails interface{}            `json:"configDetails" swaggertype:"object"` // Return structured config as JSON - can be HttpPersonaConfig or DnsPersonaConfig
	IsEnabled     bool                   `json:"isEnabled"`
	CreatedAt     time.Time              `json:"createdAt"`
	UpdatedAt     time.Time              `json:"updatedAt"`
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
		PersonaType:   p.PersonaType,
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
		var httpConfig models.HttpPersonaConfig
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
		var dnsConfig models.DnsPersonaConfig
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
// @Summary List all personas
// @Description Retrieve a list of all personas with optional filtering by type and status
// @Tags personas
// @Produce json
// @Param limit query int false "Maximum number of results" default(20)
// @Param offset query int false "Number of results to skip" default(0)
// @Param isEnabled query bool false "Filter by enabled status"
// @Param personaType query string false "Filter by persona type (dns, http)"
// @Success 200 {array} PersonaResponse "List of personas"
// @Failure 400 {object} map[string]string "Invalid personaType parameter"
// @Failure 500 {object} map[string]string "Failed to list personas"
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
// @Summary Create persona
// @Description Create a new persona (DNS or HTTP) with configuration details
// @Tags personas
// @Accept json
// @Produce json
// @Param request body CreatePersonaRequest true "Persona creation request"
// @Success 201 {object} PersonaResponse "Created persona"
// @Failure 400 {object} map[string]string "Invalid request payload or configuration"
// @Failure 409 {object} map[string]string "Persona with name and type already exists"
// @Failure 500 {object} map[string]string "Failed to create persona"
// @Router /personas [post]
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
// @Summary Get persona by ID
// @Description Retrieve a specific persona by ID regardless of type
// @Tags personas
// @Produce json
// @Param id path string true "Persona ID"
// @Success 200 {object} PersonaResponse "Persona details"
// @Failure 400 {object} map[string]string "Invalid persona ID format"
// @Failure 404 {object} map[string]string "Persona not found"
// @Failure 500 {object} map[string]string "Failed to fetch persona"
// @Router /personas/{id} [get]
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
// @Summary Get HTTP persona by ID
// @Description Retrieve a specific HTTP persona by ID
// @Tags personas
// @Produce json
// @Param id path string true "HTTP Persona ID"
// @Success 200 {object} PersonaResponse "HTTP persona details"
// @Failure 400 {object} map[string]string "Invalid persona ID format or not HTTP persona"
// @Failure 404 {object} map[string]string "HTTP persona not found"
// @Failure 500 {object} map[string]string "Failed to fetch HTTP persona"
// @Router /personas/http/{id} [get]
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
// @Summary Get DNS persona by ID
// @Description Retrieve a specific DNS persona configuration by its unique identifier
// @Tags personas
// @Accept json
// @Produce json
// @Param id path string true "DNS Persona ID" format(uuid)
// @Success 200 {object} PersonaResponse "DNS persona retrieved successfully"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Persona Not Found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /personas/dns/{id} [get]
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
// @Summary Update persona
// @Description Update an existing persona's configuration by ID
// @Tags personas
// @Accept json
// @Produce json
// @Param id path string true "Persona ID (UUID)"
// @Param request body UpdatePersonaRequest true "Persona update request"
// @Success 200 {object} PersonaResponse "Persona updated successfully"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Persona not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /personas/{id} [put]
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
// @Summary Delete persona
// @Description Delete a persona by ID
// @Tags personas
// @Produce json
// @Param id path string true "Persona ID (UUID)"
// @Success 200 {object} PersonaDeleteResponse "Persona deleted successfully"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Persona not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /personas/{id} [delete]
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
// @Summary Test persona
// @Description Test a persona configuration to verify it works correctly
// @Tags personas
// @Produce json
// @Param id path string true "Persona ID (UUID)"
// @Success 200 {object} PersonaTestResponse "Persona test results"
// @Failure 400 {object} map[string]string "Bad Request"
// @Failure 404 {object} map[string]string "Persona not found"
// @Failure 500 {object} map[string]string "Internal Server Error"
// @Router /personas/{id}/test [post]
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
		Results:   PersonaTestResultData{}, // Legacy field for compatibility
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	}

	respondWithJSONGin(c, http.StatusOK, testResult)
}

