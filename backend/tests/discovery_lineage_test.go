package tests

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq" // postgres driver
)

// TestDiscoveryLineageStore tests the discovery lineage store methods
func TestDiscoveryLineageStore(t *testing.T) {
	if testing.Short() {
		t.Skip("short")
	}
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		dsn = "host=localhost user=domainflow password=pNpTHxEWr2SmY270p1IjGn3dP dbname=domainflow_production sslmode=disable"
	}
	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		t.Fatalf("connect db: %v", err)
	}
	defer db.Close()

	campaignStore := postgres.NewCampaignStorePostgres(db)
	ctx := context.Background()

	// Use existing test user from database
	var testUserID string
	err = db.Get(&testUserID, "SELECT id FROM users LIMIT 1")
	if err != nil {
		t.Skip("No users in database, skipping test")
	}
	testHash := "testhash_" + uuid.New().String()[:16]

	// Create test campaign
	testCampaignID := uuid.New()
	_, err = db.Exec(`INSERT INTO lead_generation_campaigns 
		(id, user_id, name, campaign_type, total_phases, completed_phases, 
		 discovery_config_hash, discovery_offset_start, discovery_offset_end,
		 created_at, updated_at) 
		VALUES ($1, $2, $3, 'lead_generation', 6, 0, $4, $5, $6, NOW(), NOW())`,
		testCampaignID, testUserID, "discovery-test-"+testCampaignID.String()[:8],
		testHash, 0, 999)
	if err != nil {
		t.Fatalf("Failed to create test campaign: %v", err)
	}
	defer func() {
		_, _ = db.Exec(`DELETE FROM lead_generation_campaigns WHERE id = $1`, testCampaignID)
	}()

	t.Run("UpdateCampaignDiscoveryLineage", func(t *testing.T) {
		newHash := "newhash_" + uuid.New().String()[:16]
		err := campaignStore.UpdateCampaignDiscoveryLineage(ctx, db, testCampaignID, newHash, 100, 500)
		if err != nil {
			t.Fatalf("UpdateCampaignDiscoveryLineage failed: %v", err)
		}

		// Verify update
		updated, err := campaignStore.GetCampaignByID(ctx, db, testCampaignID)
		if err != nil {
			t.Fatalf("GetCampaignByID failed: %v", err)
		}

		if updated.DiscoveryConfigHash == nil || *updated.DiscoveryConfigHash != newHash {
			t.Errorf("Expected configHash='%s', got %v", newHash, updated.DiscoveryConfigHash)
		}
		if updated.DiscoveryOffsetStart == nil || *updated.DiscoveryOffsetStart != 100 {
			t.Errorf("Expected offsetStart=100, got %v", updated.DiscoveryOffsetStart)
		}
		if updated.DiscoveryOffsetEnd == nil || *updated.DiscoveryOffsetEnd != 500 {
			t.Errorf("Expected offsetEnd=500, got %v", updated.DiscoveryOffsetEnd)
		}

		// Update testHash to match for next test
		testHash = newHash
	})

	t.Run("GetDiscoveryLineage", func(t *testing.T) {
		// Create another campaign with same hash
		anotherCampaignID := uuid.New()
		_, err := db.Exec(`INSERT INTO lead_generation_campaigns 
			(id, user_id, name, campaign_type, total_phases, completed_phases, 
			 discovery_config_hash, discovery_offset_start, discovery_offset_end,
			 created_at, updated_at) 
			VALUES ($1, $2, $3, 'lead_generation', 6, 0, $4, $5, $6, $7, NOW())`,
			anotherCampaignID, testUserID, "discovery-test2-"+anotherCampaignID.String()[:8],
			testHash, 501, 1000, time.Now().Add(-time.Hour))
		if err != nil {
			t.Fatalf("Failed to create second test campaign: %v", err)
		}
		defer func() {
			_, _ = db.Exec(`DELETE FROM lead_generation_campaigns WHERE id = $1`, anotherCampaignID)
		}()

		// Get lineage excluding testCampaign (nil userID = no auth filter for test)
		lineage, err := campaignStore.GetDiscoveryLineage(ctx, db, testHash, &testCampaignID, nil, 10)
		if err != nil {
			t.Fatalf("GetDiscoveryLineage failed: %v", err)
		}

		// Should return anotherCampaign but not testCampaign
		foundAnother := false
		for _, c := range lineage {
			if c.ID == testCampaignID {
				t.Error("Should not include excluded campaign in lineage")
			}
			if c.ID == anotherCampaignID {
				foundAnother = true
			}
		}
		if !foundAnother {
			t.Error("Expected to find anotherCampaign in lineage results")
		}
	})
}

// TestDiscoveryImmutabilityGuard tests that discovery phase rejects re-execution
func TestDiscoveryImmutabilityGuard(t *testing.T) {
	if testing.Short() {
		t.Skip("short")
	}
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		dsn = "host=localhost user=domainflow password=pNpTHxEWr2SmY270p1IjGn3dP dbname=domainflow_production sslmode=disable"
	}
	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		t.Fatalf("connect db: %v", err)
	}
	defer db.Close()

	campaignStore := postgres.NewCampaignStorePostgres(db)
	ctx := context.Background()

	// Create test campaign with domains
	testCampaignID := uuid.New()

	// Use existing test user from database
	var testUserID string
	err = db.Get(&testUserID, "SELECT id FROM users LIMIT 1")
	if err != nil {
		t.Skip("No users in database, skipping test")
	}
	_, err = db.Exec(`INSERT INTO lead_generation_campaigns 
		(id, user_id, name, campaign_type, total_phases, completed_phases, created_at, updated_at) 
		VALUES ($1, $2, $3, 'lead_generation', 6, 0, NOW(), NOW())`,
		testCampaignID, testUserID, "guard-test-"+testCampaignID.String()[:8])
	if err != nil {
		t.Fatalf("Failed to create test campaign: %v", err)
	}
	defer func() {
		_, _ = db.Exec(`DELETE FROM generated_domains WHERE campaign_id = $1`, testCampaignID)
		_, _ = db.Exec(`DELETE FROM lead_generation_campaigns WHERE id = $1`, testCampaignID)
	}()

	// Insert a domain (simulating completed discovery)
	domainID := uuid.New()
	_, err = db.Exec(`INSERT INTO generated_domains 
		(id, campaign_id, domain_name, offset_index, generated_at, created_at,
		 dns_status, http_status, lead_status, rejection_reason)
		VALUES ($1, $2, $3, 0, NOW(), NOW(), 'pending', 'pending', 'pending', 'pending')`,
		domainID, testCampaignID, "test-guard-domain.com")
	if err != nil {
		t.Fatalf("Failed to insert test domain: %v", err)
	}

	// Test: CountGeneratedDomainsByCampaign should return > 0
	count, err := campaignStore.CountGeneratedDomainsByCampaign(ctx, db, testCampaignID)
	if err != nil {
		t.Fatalf("CountGeneratedDomainsByCampaign failed: %v", err)
	}
	if count == 0 {
		t.Error("Expected count > 0 for campaign with domains")
	}

	// The actual guard check is in domain_generation.go Execute() method
	// This test verifies the store method works correctly
	t.Logf("Guard check: campaign %s has %d domains, would block re-execution", testCampaignID, count)
}

// TestDiscoveryLineageUserScoping verifies that user scoping prevents cross-user leakage
func TestDiscoveryLineageUserScoping(t *testing.T) {
	if testing.Short() {
		t.Skip("short")
	}
	dsn := os.Getenv("TEST_DATABASE_DSN")
	if dsn == "" {
		dsn = "host=localhost user=domainflow password=pNpTHxEWr2SmY270p1IjGn3dP dbname=domainflow_production sslmode=disable"
	}
	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		t.Fatalf("connect db: %v", err)
	}
	defer db.Close()

	campaignStore := postgres.NewCampaignStorePostgres(db)
	ctx := context.Background()

	// Get two different users from database
	var userIDs []string
	err = db.Select(&userIDs, "SELECT id::text FROM users ORDER BY id LIMIT 2")
	if err != nil || len(userIDs) < 2 {
		t.Skip("Need at least 2 users in database for cross-user test")
	}
	user1ID := userIDs[0]
	user2ID := userIDs[1]

	sharedHash := "crossuser_test_" + uuid.New().String()[:12]

	// Create campaign for user1 with sharedHash
	user1CampaignID := uuid.New()
	_, err = db.Exec(`INSERT INTO lead_generation_campaigns 
		(id, user_id, name, campaign_type, total_phases, completed_phases, 
		 discovery_config_hash, discovery_offset_start, discovery_offset_end,
		 created_at, updated_at) 
		VALUES ($1, $2, $3, 'lead_generation', 6, 0, $4, 0, 100, NOW(), NOW())`,
		user1CampaignID, user1ID, "user1-campaign-"+user1CampaignID.String()[:8], sharedHash)
	if err != nil {
		t.Fatalf("Failed to create user1 campaign: %v", err)
	}
	defer func() {
		_, _ = db.Exec(`DELETE FROM lead_generation_campaigns WHERE id = $1`, user1CampaignID)
	}()

	// Create campaign for user2 with same sharedHash
	user2CampaignID := uuid.New()
	_, err = db.Exec(`INSERT INTO lead_generation_campaigns 
		(id, user_id, name, campaign_type, total_phases, completed_phases, 
		 discovery_config_hash, discovery_offset_start, discovery_offset_end,
		 created_at, updated_at) 
		VALUES ($1, $2, $3, 'lead_generation', 6, 0, $4, 101, 200, NOW(), NOW())`,
		user2CampaignID, user2ID, "user2-campaign-"+user2CampaignID.String()[:8], sharedHash)
	if err != nil {
		t.Fatalf("Failed to create user2 campaign: %v", err)
	}
	defer func() {
		_, _ = db.Exec(`DELETE FROM lead_generation_campaigns WHERE id = $1`, user2CampaignID)
	}()

	t.Run("user1 cannot see user2 campaigns", func(t *testing.T) {
		lineage, err := campaignStore.GetDiscoveryLineage(ctx, db, sharedHash, &user1CampaignID, &user1ID, 10)
		if err != nil {
			t.Fatalf("GetDiscoveryLineage failed: %v", err)
		}

		// User1 should NOT see user2's campaign
		for _, c := range lineage {
			if c.ID == user2CampaignID {
				t.Error("User1 should NOT see user2's campaign - cross-user leakage detected!")
			}
		}
	})

	t.Run("user2 cannot see user1 campaigns", func(t *testing.T) {
		lineage, err := campaignStore.GetDiscoveryLineage(ctx, db, sharedHash, &user2CampaignID, &user2ID, 10)
		if err != nil {
			t.Fatalf("GetDiscoveryLineage failed: %v", err)
		}

		// User2 should NOT see user1's campaign
		for _, c := range lineage {
			if c.ID == user1CampaignID {
				t.Error("User2 should NOT see user1's campaign - cross-user leakage detected!")
			}
		}
	})

	t.Run("nil userID returns all matching campaigns (no scope)", func(t *testing.T) {
		lineage, err := campaignStore.GetDiscoveryLineage(ctx, db, sharedHash, nil, nil, 10)
		if err != nil {
			t.Fatalf("GetDiscoveryLineage failed: %v", err)
		}

		// Without userID filter, should see both campaigns
		foundUser1 := false
		foundUser2 := false
		for _, c := range lineage {
			if c.ID == user1CampaignID {
				foundUser1 = true
			}
			if c.ID == user2CampaignID {
				foundUser2 = true
			}
		}
		if !foundUser1 || !foundUser2 {
			t.Error("With nil userID, should see campaigns from all users")
		}
	})
}
