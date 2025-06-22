// File: backend/internal/services/access_control_service.go
package services

import (
	"context"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
)

// AccessControlService defines the interface for campaign access control
type AccessControlService interface {
	CheckCampaignAccess(ctx context.Context, userID, campaignID uuid.UUID, action string, userRoles []string) (bool, *CampaignAccessResult, error)
	ValidateCampaignOwnership(ctx context.Context, userID, campaignID uuid.UUID) (bool, error)
	GetUserOwnedCampaigns(ctx context.Context, userID uuid.UUID, filter store.ListCampaignsFilter) ([]*models.Campaign, int64, error)
	TransferCampaignOwnership(ctx context.Context, campaignID, fromUserID, toUserID uuid.UUID, adminUserID uuid.UUID) error
	GetCampaignOwner(ctx context.Context, campaignID uuid.UUID) (*uuid.UUID, error)
	ApplyUserFilterToCampaignQuery(userID uuid.UUID, userRoles []string, filter *store.ListCampaignsFilter) *store.ListCampaignsFilter
}

// CampaignAccessResult represents the result of a campaign access check
type CampaignAccessResult struct {
	IsOwner        bool   `json:"isOwner"`
	HasAdminAccess bool   `json:"hasAdminAccess"`
	AccessType     string `json:"accessType"` // "owner", "admin", "denied"
	DenialReason   string `json:"denialReason,omitempty"`
}

// accessControlServiceImpl implements AccessControlService
type accessControlServiceImpl struct {
	db            *sqlx.DB
	campaignStore store.CampaignStore
}

// NewAccessControlService creates a new access control service
func NewAccessControlService(db *sqlx.DB, campaignStore store.CampaignStore) AccessControlService {
	return &accessControlServiceImpl{
		db:            db,
		campaignStore: campaignStore,
	}
}

// CheckCampaignAccess validates user access to a campaign with ownership and RBAC
func (s *accessControlServiceImpl) CheckCampaignAccess(ctx context.Context, userID, campaignID uuid.UUID, action string, userRoles []string) (bool, *CampaignAccessResult, error) {
	log.Printf("AccessControl: Checking campaign access for user %s, campaign %s, action %s", userID, campaignID, action)

	var querier store.Querier = s.db
	result := &CampaignAccessResult{
		IsOwner:        false,
		HasAdminAccess: false,
		AccessType:     "denied",
	}

	// Check admin access first - admin users can access any campaign
	hasAdminRole := s.hasAdminRole(userRoles)
	if hasAdminRole {
		// Admin users can access any campaign - use non-filtered method for admin override
		campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
		if err != nil {
			if err == store.ErrNotFound {
				result.DenialReason = "campaign_not_found"
				return false, result, nil
			}
			return false, nil, fmt.Errorf("failed to get campaign for admin access: %w", err)
		}

		result.HasAdminAccess = true
		result.AccessType = "admin"
		// Check if admin is also owner
		if campaign.UserID != nil && *campaign.UserID == userID {
			result.IsOwner = true
		}
		log.Printf("AccessControl: User %s has admin access to campaign %s", userID, campaignID)
		return true, result, nil
	}

	// For regular users, use user-filtered method for tenant isolation
	_, err := s.campaignStore.GetCampaignByIDWithUserFilter(ctx, querier, campaignID, userID)
	if err != nil {
		if err == store.ErrNotFound {
			result.DenialReason = "campaign_not_found_or_access_denied"
			log.Printf("AccessControl: Access denied for user %s to campaign %s: not found or not owned", userID, campaignID)
			return false, result, nil
		}
		return false, nil, fmt.Errorf("failed to get campaign with user filter: %w", err)
	}

	// If we reach here, user owns the campaign (due to user filter)
	result.IsOwner = true
	result.AccessType = "owner"
	log.Printf("AccessControl: User %s is owner of campaign %s", userID, campaignID)
	return true, result, nil
}

// ValidateCampaignOwnership checks if user owns the campaign
func (s *accessControlServiceImpl) ValidateCampaignOwnership(ctx context.Context, userID, campaignID uuid.UUID) (bool, error) {
	hasAccess, result, err := s.CheckCampaignAccess(ctx, userID, campaignID, "read", nil)
	if err != nil {
		return false, err
	}

	return hasAccess && result.IsOwner, nil
}

// GetUserOwnedCampaigns retrieves campaigns owned by the user with proper filtering
func (s *accessControlServiceImpl) GetUserOwnedCampaigns(ctx context.Context, userID uuid.UUID, filter store.ListCampaignsFilter) ([]*models.Campaign, int64, error) {
	// Apply user ownership filter - this enforces tenant isolation
	userFilter := s.ApplyUserFilterToCampaignQuery(userID, nil, &filter)

	var querier store.Querier = s.db
	campaigns, err := s.campaignStore.ListCampaigns(ctx, querier, *userFilter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list user campaigns: %w", err)
	}

	totalCount, err := s.campaignStore.CountCampaigns(ctx, querier, *userFilter)
	if err != nil {
		log.Printf("AccessControl: Error counting user campaigns for %s: %v", userID, err)
		totalCount = int64(len(campaigns))
	}

	return campaigns, totalCount, nil
}

// TransferCampaignOwnership transfers ownership of a campaign (admin only)
func (s *accessControlServiceImpl) TransferCampaignOwnership(ctx context.Context, campaignID, fromUserID, toUserID uuid.UUID, adminUserID uuid.UUID) error {
	// This method requires admin privileges - use non-filtered method for admin override
	var querier store.Querier = s.db

	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return fmt.Errorf("failed to get campaign for ownership transfer: %w", err)
	}

	// Validate current ownership
	if campaign.UserID == nil || *campaign.UserID != fromUserID {
		return fmt.Errorf("current user does not own this campaign")
	}

	// Update ownership using regular method (admin operation)
	campaign.UserID = &toUserID
	err = s.campaignStore.UpdateCampaign(ctx, querier, campaign)
	if err != nil {
		return fmt.Errorf("failed to transfer campaign ownership: %w", err)
	}

	log.Printf("AccessControl: Campaign ownership transferred - Campaign: %s, From: %s, To: %s, Admin: %s",
		campaignID, fromUserID, toUserID, adminUserID)

	return nil
}

// GetCampaignOwner retrieves the owner of a campaign
func (s *accessControlServiceImpl) GetCampaignOwner(ctx context.Context, campaignID uuid.UUID) (*uuid.UUID, error) {
	var querier store.Querier = s.db
	campaign, err := s.campaignStore.GetCampaignByID(ctx, querier, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get campaign owner: %w", err)
	}

	return campaign.UserID, nil
}

// ApplyUserFilterToCampaignQuery applies tenant isolation filters based on user access level
func (s *accessControlServiceImpl) ApplyUserFilterToCampaignQuery(userID uuid.UUID, userRoles []string, filter *store.ListCampaignsFilter) *store.ListCampaignsFilter {
	// Create a copy of the filter to avoid modifying the original
	newFilter := *filter

	// Check if user has admin role
	if s.hasAdminRole(userRoles) {
		// Admin users can see all campaigns - no additional filtering
		log.Printf("AccessControl: Admin user %s - no ownership filtering applied", userID)
		return &newFilter
	}

	// Regular users can only see their own campaigns
	newFilter.UserID = userID.String()
	log.Printf("AccessControl: Regular user %s - filtering by ownership", userID)

	return &newFilter
}

// hasAdminRole checks if user has any admin-level role
func (s *accessControlServiceImpl) hasAdminRole(userRoles []string) bool {
	adminRoles := []string{"super_admin", "admin"}

	for _, userRole := range userRoles {
		for _, adminRole := range adminRoles {
			if userRole == adminRole {
				return true
			}
		}
	}

	return false
}

// Database-level security helpers

// CreateCampaignWithOwnership creates a campaign with proper ownership assignment
func (s *accessControlServiceImpl) CreateCampaignWithOwnership(ctx context.Context, campaign *models.Campaign, creatorUserID uuid.UUID) error {
	// Ensure ownership is assigned
	campaign.UserID = &creatorUserID

	var querier store.Querier = s.db
	err := s.campaignStore.CreateCampaign(ctx, querier, campaign)
	if err != nil {
		return fmt.Errorf("failed to create campaign with ownership: %w", err)
	}

	log.Printf("AccessControl: Campaign created with ownership - Campaign: %s, Owner: %s", campaign.ID, creatorUserID)
	return nil
}

// ValidateAndFilterCampaignAccess validates access and returns filtered campaign data
func (s *accessControlServiceImpl) ValidateAndFilterCampaignAccess(ctx context.Context, userID uuid.UUID, action string, userRoles []string, filter store.ListCampaignsFilter) ([]*models.Campaign, int64, error) {
	// Apply user-level filtering for tenant isolation
	userFilter := s.ApplyUserFilterToCampaignQuery(userID, userRoles, &filter)

	var querier store.Querier = s.db
	campaigns, err := s.campaignStore.ListCampaigns(ctx, querier, *userFilter)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to list campaigns with access control: %w", err)
	}

	// Additional access validation per campaign
	var filteredCampaigns []*models.Campaign
	for _, campaign := range campaigns {
		if campaign == nil {
			continue
		}

		hasAccess, _, err := s.CheckCampaignAccess(ctx, userID, campaign.ID, action, userRoles)
		if err != nil {
			log.Printf("AccessControl: Error checking access for campaign %s: %v", campaign.ID, err)
			continue
		}

		if hasAccess {
			filteredCampaigns = append(filteredCampaigns, campaign)
		}
	}

	totalCount, err := s.campaignStore.CountCampaigns(ctx, querier, *userFilter)
	if err != nil {
		log.Printf("AccessControl: Error counting filtered campaigns: %v", err)
		totalCount = int64(len(filteredCampaigns))
	}

	return filteredCampaigns, totalCount, nil
}
