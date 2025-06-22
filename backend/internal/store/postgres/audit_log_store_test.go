package postgres

import (
	"context"
	"database/sql"
	"encoding/json"
	"os"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestAuditLogStore_BL006_Compliance(t *testing.T) {
	ctx := context.Background()
	db := setupPostgresTestDB(t)
	defer db.Close()
	auditStore := NewAuditLogStorePostgres(db)

	t.Run("BL006_RejectsEmptyUserID", func(t *testing.T) {
		// Test that audit logs with empty UserID are rejected
		auditLog := &models.AuditLog{
			ID:         uuid.New(),
			UserID:     uuid.NullUUID{Valid: false}, // Empty UserID should be rejected
			Action:     "CAMPAIGN_CREATE",
			EntityType: sql.NullString{String: "campaigns", Valid: true},
			EntityID:   uuid.NullUUID{UUID: uuid.New(), Valid: true},
			Details:    createTestDetails(map[string]interface{}{"test": "data"}),
			ClientIP:   sql.NullString{String: "192.168.1.1", Valid: true},
			UserAgent:  sql.NullString{String: "test-agent", Valid: true},
			Timestamp:  time.Now(),
		}

		err := auditStore.CreateAuditLogWithValidation(ctx, db, auditLog)
		assert.Error(t, err, "Should reject audit log with empty UserID")
		assert.Contains(t, err.Error(), "BL-006", "Error should reference BL-006 compliance")
	})

	t.Run("BL006_RejectsNilUserID", func(t *testing.T) {
		// Test that audit logs with nil/zero UserID are rejected
		auditLog := &models.AuditLog{
			ID:         uuid.New(),
			UserID:     uuid.NullUUID{UUID: uuid.Nil, Valid: true}, // Nil UUID should be rejected
			Action:     "CAMPAIGN_CREATE",
			EntityType: sql.NullString{String: "campaigns", Valid: true},
			EntityID:   uuid.NullUUID{UUID: uuid.New(), Valid: true},
			Details:    createTestDetails(map[string]interface{}{"test": "data"}),
			ClientIP:   sql.NullString{String: "192.168.1.1", Valid: true},
			UserAgent:  sql.NullString{String: "test-agent", Valid: true},
			Timestamp:  time.Now(),
		}

		err := auditStore.CreateAuditLogWithValidation(ctx, db, auditLog)
		assert.Error(t, err, "Should reject audit log with nil UserID")
		assert.Contains(t, err.Error(), "BL-006", "Error should reference BL-006 compliance")
	})

	t.Run("BL006_AcceptsValidUserID", func(t *testing.T) {
		// Test that audit logs with valid UserID are accepted
		userID := uuid.New()
		entityID := uuid.New()
		auditLog := &models.AuditLog{
			ID:         uuid.New(),
			UserID:     uuid.NullUUID{UUID: userID, Valid: true},
			Action:     "CAMPAIGN_CREATE",
			EntityType: sql.NullString{String: "campaigns", Valid: true},
			EntityID:   uuid.NullUUID{UUID: entityID, Valid: true},
			Details:    createTestDetails(map[string]interface{}{"test": "data"}),
			ClientIP:   sql.NullString{String: "192.168.1.1", Valid: true},
			UserAgent:  sql.NullString{String: "test-agent", Valid: true},
			Timestamp:  time.Now(),
		}

		err := auditStore.CreateAuditLogWithValidation(ctx, db, auditLog)
		assert.NoError(t, err, "Should accept audit log with valid UserID")

		// Verify the audit log was created
		filter := store.ListAuditLogsFilter{
			UserID: userID.String(),
			Limit:  10,
		}
		logs, err := auditStore.GetAuditLogsWithUserFilter(ctx, db, userID, filter)
		require.NoError(t, err)
		assert.Len(t, logs, 1)
		assert.Equal(t, userID, logs[0].UserID.UUID)
		assert.True(t, logs[0].UserID.Valid)
	})

	t.Run("BL006_ValidateAuditLogCompleteness", func(t *testing.T) {
		// Test the completeness validation function
		userID := uuid.New()
		entityID := uuid.New()

		// Create a valid audit log
		validLog := &models.AuditLog{
			ID:         uuid.New(),
			UserID:     uuid.NullUUID{UUID: userID, Valid: true},
			Action:     "CAMPAIGN_CREATE",
			EntityType: sql.NullString{String: "campaigns", Valid: true},
			EntityID:   uuid.NullUUID{UUID: entityID, Valid: true},
			Details:    createTestDetails(map[string]interface{}{"test": "data"}),
			ClientIP:   sql.NullString{String: "192.168.1.1", Valid: true},
			UserAgent:  sql.NullString{String: "test-agent", Valid: true},
			Timestamp:  time.Now(),
		}

		err := auditStore.CreateAuditLogWithValidation(ctx, db, validLog)
		require.NoError(t, err)

		// Validate completeness for a time range that includes the log
		startTime := time.Now().Add(-1 * time.Hour)
		endTime := time.Now().Add(1 * time.Hour)
		incompleteEntries, err := auditStore.ValidateAuditLogCompleteness(ctx, db, startTime, endTime)
		require.NoError(t, err)
		assert.Empty(t, incompleteEntries, "No incomplete entries should be found")
	})

	t.Run("BL006_SecurityCriticalOperationsValidation", func(t *testing.T) {
		userID := uuid.New()
		securityActions := []string{
			"campaign_create",
			"campaign_delete",
			"user_login",
			"user_logout",
			"permission_change",
			"api_key_create",
			"configuration_change",
		}

		for _, action := range securityActions {
			entityID := uuid.New()
			auditLog := &models.AuditLog{
				ID:         uuid.New(),
				UserID:     uuid.NullUUID{UUID: userID, Valid: true},
				Action:     action,
				EntityType: sql.NullString{String: "campaigns", Valid: true},
				EntityID:   uuid.NullUUID{UUID: entityID, Valid: true},
				Details: createTestDetails(map[string]interface{}{
					"security_critical": true,
					"compliance_flags":  []string{"BL-006"},
				}),
				ClientIP:  sql.NullString{String: "192.168.1.1", Valid: true},
				UserAgent: sql.NullString{String: "test-agent", Valid: true},
				Timestamp: time.Now(),
			}

			err := auditStore.CreateAuditLogWithValidation(ctx, db, auditLog)
			assert.NoError(t, err, "Security critical action %s should be logged with valid UserID", action)
		}

		// Verify all security critical operations have valid user attribution
		filter := store.ListAuditLogsFilter{
			UserID: userID.String(),
			Limit:  100,
		}
		logs, err := auditStore.GetAuditLogsWithUserFilter(ctx, db, userID, filter)
		require.NoError(t, err)
		assert.Len(t, logs, len(securityActions))

		for _, log := range logs {
			assert.True(t, log.UserID.Valid, "Security critical operation should have valid UserID")
			assert.Equal(t, userID, log.UserID.UUID, "UserID should match")
		}
	})
}

func TestAuditLogStore_BL006_IntegrationWithUserContext(t *testing.T) {
	ctx := context.Background()
	db := setupPostgresTestDB(t)
	defer db.Close()
	auditStore := NewAuditLogStorePostgres(db)

	t.Run("BL006_SessionBasedAuthentication", func(t *testing.T) {
		userID := uuid.New()
		entityID := uuid.New()
		sessionID := "session_" + uuid.New().String()

		auditLog := &models.AuditLog{
			ID:         uuid.New(),
			UserID:     uuid.NullUUID{UUID: userID, Valid: true},
			Action:     "CAMPAIGN_VIEW",
			EntityType: sql.NullString{String: "campaigns", Valid: true},
			EntityID:   uuid.NullUUID{UUID: entityID, Valid: true},
			Details: createTestDetails(map[string]interface{}{
				"authentication_type": "session",
				"session_id":          sessionID,
				"user_context": map[string]interface{}{
					"authenticated": true,
					"session_valid": true,
				},
				"compliance_metadata": map[string]interface{}{
					"bl_006_compliant": true,
					"user_attribution": "complete",
				},
			}),
			ClientIP:  sql.NullString{String: "192.168.1.1", Valid: true},
			UserAgent: sql.NullString{String: "Mozilla/5.0", Valid: true},
			Timestamp: time.Now(),
		}

		err := auditStore.CreateAuditLogWithValidation(ctx, db, auditLog)
		assert.NoError(t, err, "Session-based authentication should be logged successfully")
	})

	t.Run("BL006_APIKeyAuthentication", func(t *testing.T) {
		userID := uuid.New()
		entityID := uuid.New()
		apiKeyID := "api_key_" + uuid.New().String()

		auditLog := &models.AuditLog{
			ID:         uuid.New(),
			UserID:     uuid.NullUUID{UUID: userID, Valid: true},
			Action:     "API_ACCESS",
			EntityType: sql.NullString{String: "campaigns", Valid: true},
			EntityID:   uuid.NullUUID{UUID: entityID, Valid: true},
			Details: createTestDetails(map[string]interface{}{
				"authentication_type": "api_key",
				"api_key_id":          apiKeyID,
				"user_context": map[string]interface{}{
					"authenticated": true,
					"api_key_valid": true,
				},
				"compliance_metadata": map[string]interface{}{
					"bl_006_compliant": true,
					"user_attribution": "complete",
				},
			}),
			ClientIP:  sql.NullString{String: "10.0.0.1", Valid: true},
			UserAgent: sql.NullString{String: "API-Client/1.0", Valid: true},
			Timestamp: time.Now(),
		}

		err := auditStore.CreateAuditLogWithValidation(ctx, db, auditLog)
		assert.NoError(t, err, "API key authentication should be logged successfully")
	})

	t.Run("BL006_SystemAuthentication", func(t *testing.T) {
		systemUserID := uuid.New() // System user should also have a valid UUID
		entityID := uuid.New()

		auditLog := &models.AuditLog{
			ID:         uuid.New(),
			UserID:     uuid.NullUUID{UUID: systemUserID, Valid: true},
			Action:     "SYSTEM_OPERATION",
			EntityType: sql.NullString{String: "system", Valid: true},
			EntityID:   uuid.NullUUID{UUID: entityID, Valid: true},
			Details: createTestDetails(map[string]interface{}{
				"authentication_type": "system",
				"system_operation":    true,
				"user_context": map[string]interface{}{
					"authenticated": true,
					"system_user":   true,
				},
				"compliance_metadata": map[string]interface{}{
					"bl_006_compliant": true,
					"user_attribution": "system",
				},
			}),
			ClientIP:  sql.NullString{String: "127.0.0.1", Valid: true},
			UserAgent: sql.NullString{String: "System/1.0", Valid: true},
			Timestamp: time.Now(),
		}

		err := auditStore.CreateAuditLogWithValidation(ctx, db, auditLog)
		assert.NoError(t, err, "System authentication should be logged successfully")
	})
}

func TestAuditLogStore_BL006_ComplianceReporting(t *testing.T) {
	ctx := context.Background()
	db := setupPostgresTestDB(t)
	defer db.Close()
	auditStore := NewAuditLogStorePostgres(db)

	t.Run("BL006_ComplianceMetrics", func(t *testing.T) {
		userID := uuid.New()

		// Create multiple audit logs to test compliance metrics
		for i := 0; i < 5; i++ {
			entityID := uuid.New()
			auditLog := &models.AuditLog{
				ID:         uuid.New(),
				UserID:     uuid.NullUUID{UUID: userID, Valid: true},
				Action:     "CAMPAIGN_OPERATION",
				EntityType: sql.NullString{String: "campaigns", Valid: true},
				EntityID:   uuid.NullUUID{UUID: entityID, Valid: true},
				Details: createTestDetails(map[string]interface{}{
					"operation_id": i,
					"compliance_metadata": map[string]interface{}{
						"bl_006_compliant": true,
						"user_attribution": "complete",
						"audit_timestamp":  time.Now().Unix(),
					},
				}),
				ClientIP:  sql.NullString{String: "192.168.1.1", Valid: true},
				UserAgent: sql.NullString{String: "test-agent", Valid: true},
				Timestamp: time.Now(),
			}

			err := auditStore.CreateAuditLogWithValidation(ctx, db, auditLog)
			require.NoError(t, err)
		}

		// Verify all logs have proper user attribution
		filter := store.ListAuditLogsFilter{
			UserID: userID.String(),
			Limit:  10,
		}
		logs, err := auditStore.GetAuditLogsWithUserFilter(ctx, db, userID, filter)
		require.NoError(t, err)
		assert.Len(t, logs, 5)

		for _, log := range logs {
			assert.True(t, log.UserID.Valid, "All audit logs should have valid UserID")
			assert.Equal(t, userID, log.UserID.UUID)

			if log.Details != nil {
				var details map[string]interface{}
				err := json.Unmarshal(*log.Details, &details)
				require.NoError(t, err, "Details should be valid JSON")

				if compliance, ok := details["compliance_metadata"].(map[string]interface{}); ok {
					assert.Equal(t, true, compliance["bl_006_compliant"], "Should be BL-006 compliant")
				}
			}
		}
	})
}

// Helper functions
func setupPostgresTestDB(t *testing.T) *sqlx.DB {
	dsn := os.Getenv("TEST_POSTGRES_DSN")
	if dsn == "" {
		t.Fatal("TEST_POSTGRES_DSN environment variable must be set")
	}

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		t.Fatalf("Failed to connect to test database: %v. DSN: %s", err, dsn)
	}

	// Clean test data by truncating audit_logs table to ensure a clean state
	_, err = db.Exec("TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE;")
	require.NoError(t, err, "Failed to clean audit_logs test data")

	return db
}

func setupTestAuditLogStore(t *testing.T) store.AuditLogStore {
	dbConn := setupPostgresTestDB(t)
	return NewAuditLogStorePostgres(dbConn)
}

func cleanupTestAuditLogStore(t *testing.T, auditStore store.AuditLogStore) {
	// Clean up test data
	ctx := context.Background()

	// Since we can't directly access the DB from the interface, we'll use a time-based cleanup
	// Delete audit logs created in the last hour (test duration)
	startTime := time.Now().Add(-1 * time.Hour)
	endTime := time.Now().Add(1 * time.Hour)

	// This is a basic cleanup - in a real scenario you might want more specific cleanup
	if impl, ok := auditStore.(*auditLogStorePostgres); ok {
		_, err := impl.db.ExecContext(ctx,
			"DELETE FROM audit_logs WHERE user_agent IN ('test-agent', 'Mozilla/5.0', 'API-Client/1.0', 'System/1.0') AND timestamp BETWEEN $1 AND $2",
			startTime, endTime)
		if err != nil {
			t.Logf("Failed to cleanup test audit logs: %v", err)
		}
	}
}

func createTestDetails(data map[string]interface{}) *json.RawMessage {
	bytes, _ := json.Marshal(data)
	rawMessage := json.RawMessage(bytes)
	return &rawMessage
}
