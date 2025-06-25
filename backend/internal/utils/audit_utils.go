package utils

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
)

// AuditLogger provides common audit logging functionality
type AuditLogger struct {
	auditLogStore store.AuditLogStore
}

// NewAuditLogger creates a new audit logger
func NewAuditLogger(auditLogStore store.AuditLogStore) *AuditLogger {
	return &AuditLogger{auditLogStore: auditLogStore}
}

// LogCampaignEvent logs an audit event for a campaign
func (al *AuditLogger) LogCampaignEvent(ctx context.Context, exec store.Querier, campaign *models.Campaign, action, description string) {
	detailsMap := map[string]string{
		"campaign_name": campaign.Name,
		"description":   description,
	}
	detailsJSON, err := json.Marshal(detailsMap)
	if err != nil {
		log.Printf("Error marshalling audit log details for campaign %s, action %s: %v. Using raw description.", campaign.ID, action, err)
		detailsJSON = json.RawMessage(fmt.Sprintf(`{"campaign_name": "%s", "description": "Details marshalling error: %s"}`, campaign.Name, description))
	}

	var auditLogUserID uuid.NullUUID
	if campaign.UserID != nil {
		auditLogUserID = uuid.NullUUID{UUID: *campaign.UserID, Valid: true}
	}

	auditLog := &models.AuditLog{
		Timestamp:  time.Now().UTC(),
		UserID:     auditLogUserID,
		Action:     action,
		EntityType: sql.NullString{String: "Campaign", Valid: true},
		EntityID:   uuid.NullUUID{UUID: campaign.ID, Valid: true},
		Details:    models.JSONRawMessagePtr(detailsJSON),
	}

	if err := al.auditLogStore.CreateAuditLog(ctx, exec, auditLog); err != nil {
		log.Printf("Error creating audit log for campaign %s, action %s: %v", campaign.ID, action, err)
	}
}

// LogPersonaEvent logs an audit event for a persona
func (al *AuditLogger) LogPersonaEvent(ctx context.Context, exec store.Querier, persona *models.Persona, userID *uuid.UUID, action, description string) {
	detailsMap := map[string]string{
		"persona_name": persona.Name,
		"persona_type": string(persona.PersonaType),
		"description":  description,
	}
	detailsJSON, err := json.Marshal(detailsMap)
	if err != nil {
		log.Printf("Error marshalling audit log details for persona %s, action %s: %v. Using raw description.", persona.ID, action, err)
		detailsJSON = json.RawMessage(fmt.Sprintf(`{"persona_name": "%s", "description": "Details marshalling error: %s"}`, persona.Name, description))
	}

	var auditLogUserID uuid.NullUUID
	if userID != nil {
		auditLogUserID = uuid.NullUUID{UUID: *userID, Valid: true}
	}

	auditLog := &models.AuditLog{
		Timestamp:  time.Now().UTC(),
		UserID:     auditLogUserID,
		Action:     action,
		EntityType: sql.NullString{String: "Persona", Valid: true},
		EntityID:   uuid.NullUUID{UUID: persona.ID, Valid: true},
		Details:    models.JSONRawMessagePtr(detailsJSON),
	}

	if err := al.auditLogStore.CreateAuditLog(ctx, exec, auditLog); err != nil {
		log.Printf("Error creating audit log for persona %s, action %s: %v", persona.ID, action, err)
	}
}

// LogGenericEvent logs a generic audit event
func (al *AuditLogger) LogGenericEvent(ctx context.Context, exec store.Querier, userID *uuid.UUID, action, entityType string, entityID *uuid.UUID, details map[string]string) {
	detailsJSON, err := json.Marshal(details)
	if err != nil {
		log.Printf("Error marshalling audit log details for %s %s, action %s: %v", entityType, entityID, action, err)
		detailsJSON = json.RawMessage(fmt.Sprintf(`{"description": "Details marshalling error: %s"}`, err.Error()))
	}

	var auditLogUserID uuid.NullUUID
	if userID != nil {
		auditLogUserID = uuid.NullUUID{UUID: *userID, Valid: true}
	}

	var auditLogEntityID uuid.NullUUID
	if entityID != nil {
		auditLogEntityID = uuid.NullUUID{UUID: *entityID, Valid: true}
	}

	auditLog := &models.AuditLog{
		Timestamp:  time.Now().UTC(),
		UserID:     auditLogUserID,
		Action:     action,
		EntityType: sql.NullString{String: entityType, Valid: true},
		EntityID:   auditLogEntityID,
		Details:    models.JSONRawMessagePtr(detailsJSON),
	}

	if err := al.auditLogStore.CreateAuditLog(ctx, exec, auditLog); err != nil {
		log.Printf("Error creating audit log for %s %s, action %s: %v", entityType, entityID, action, err)
	}
}

// LogCampaignAuditEvent logs an audit event for a campaign using the consolidated logger
func LogCampaignAuditEvent(ctx context.Context, exec store.Querier, auditLogStore store.AuditLogStore, campaign *models.Campaign, action, description string) {
	detailsMap := map[string]string{
		"campaign_name": campaign.Name,
		"description":   description,
	}
	detailsJSON, err := json.Marshal(detailsMap)
	if err != nil {
		log.Printf("Error marshalling audit log details for campaign %s, action %s: %v. Using raw description.", campaign.ID, action, err)
		detailsJSON = json.RawMessage(fmt.Sprintf(`{"campaign_name": "%s", "description": "Details marshalling error: %s"}`, campaign.Name, description))
	}

	var auditLogUserID uuid.NullUUID
	if campaign.UserID != nil {
		auditLogUserID = uuid.NullUUID{UUID: *campaign.UserID, Valid: true}
	}
	auditLog := &models.AuditLog{
		Timestamp:  time.Now().UTC(),
		UserID:     auditLogUserID,
		Action:     action,
		EntityType: sql.NullString{String: "Campaign", Valid: true},
		EntityID:   uuid.NullUUID{UUID: campaign.ID, Valid: true},
		Details:    models.JSONRawMessagePtr(detailsJSON),
	}
	if err := auditLogStore.CreateAuditLog(ctx, exec, auditLog); err != nil {
		log.Printf("Error creating audit log for campaign %s, action %s: %v", campaign.ID, action, err)
	}
}
