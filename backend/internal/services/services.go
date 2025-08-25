package services

import (
	"context"
	"fmt"
	"studio/backend/internal/domain"

	"github.com/google/uuid"
)

// ============================================================================
// SERVICE LAYER - Business logic with proper dependency injection
// ============================================================================

// Repository interfaces (dependency inversion principle)
type UserRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	Create(ctx context.Context, user *domain.User) error
	Update(ctx context.Context, user *domain.User) error
	Delete(ctx context.Context, id uuid.UUID) error
}

type UserSecretsRepository interface {
	GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.UserSecrets, error)
	Create(ctx context.Context, secrets *domain.UserSecrets) error
	Update(ctx context.Context, secrets *domain.UserSecrets) error
	Delete(ctx context.Context, userID uuid.UUID) error
}

type ProxyRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Proxy, error)
	List(ctx context.Context, filters ProxyFilters) ([]*domain.Proxy, error)
	Create(ctx context.Context, proxy *domain.Proxy) error
	Update(ctx context.Context, proxy *domain.Proxy) error
	Delete(ctx context.Context, id uuid.UUID) error
	BulkUpdate(ctx context.Context, ids []uuid.UUID, updates ProxyUpdates) error
}

type KeywordRepository interface {
	GetSetByID(ctx context.Context, id uuid.UUID) (*domain.KeywordSet, error)
	ListSets(ctx context.Context, filters KeywordSetFilters) ([]*domain.KeywordSet, error)
	CreateSet(ctx context.Context, keywordSet *domain.KeywordSet) error
	UpdateSet(ctx context.Context, keywordSet *domain.KeywordSet) error
	DeleteSet(ctx context.Context, id uuid.UUID) error
}

type CampaignRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Campaign, error)
	List(ctx context.Context, filters CampaignFilters) ([]*domain.Campaign, error)
	Create(ctx context.Context, campaign *domain.Campaign) error
	Update(ctx context.Context, campaign *domain.Campaign) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// Filter types
type ProxyFilters struct {
	UserID    *uuid.UUID
	Status    *domain.ProxyStatus
	Protocol  *domain.ProxyProtocol
	IsEnabled *bool
}

type ProxyUpdates struct {
	Name        *string
	Description *string
	IsEnabled   *bool
	Status      *domain.ProxyStatus
}

type KeywordSetFilters struct {
	UserID    *uuid.UUID
	IsEnabled *bool
}

type CampaignFilters struct {
	UserID *uuid.UUID
	State  *domain.CampaignState
	Type   *domain.CampaignType
}

// ============================================================================
// USER SERVICE
// ============================================================================

type UserService struct {
	userRepo    UserRepository
	secretsRepo UserSecretsRepository
}

func NewUserService(userRepo UserRepository, secretsRepo UserSecretsRepository) *UserService {
	return &UserService{
		userRepo:    userRepo,
		secretsRepo: secretsRepo,
	}
}

// GetUserProfile returns public user information (NO SECRETS)
func (s *UserService) GetUserProfile(ctx context.Context, userID uuid.UUID) (*domain.User, error) {
	return s.userRepo.GetByID(ctx, userID)
}

// AuthenticateUser handles user authentication (with secrets)
func (s *UserService) AuthenticateUser(ctx context.Context, email, password string) (*domain.User, error) {
	user, err := s.userRepo.GetByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("user lookup failed: %w", err)
	}

	secrets, err := s.secretsRepo.GetByUserID(ctx, user.ID)
	if err != nil {
		return nil, fmt.Errorf("secrets lookup failed: %w", err)
	}

	// Verify password against hash
	if !s.verifyPassword(password, secrets.PasswordHash) {
		return nil, fmt.Errorf("invalid credentials")
	}

	// Update last login
	// user.LastLoginAt = time.Now()
	// s.userRepo.Update(ctx, user)

	return user, nil
}

func (s *UserService) verifyPassword(password, hash string) bool {
	// Implementation would use bcrypt or similar
	return true // Placeholder
}

// ============================================================================
// PROXY SERVICE
// ============================================================================

type ProxyService struct {
	proxyRepo ProxyRepository
}

func NewProxyService(proxyRepo ProxyRepository) *ProxyService {
	return &ProxyService{proxyRepo: proxyRepo}
}

func (s *ProxyService) ListProxies(ctx context.Context, filters ProxyFilters) ([]*domain.Proxy, error) {
	return s.proxyRepo.List(ctx, filters)
}

func (s *ProxyService) CreateProxy(ctx context.Context, proxy *domain.Proxy) error {
	// Business logic: validate proxy configuration
	if err := s.validateProxyConfig(proxy); err != nil {
		return fmt.Errorf("invalid proxy configuration: %w", err)
	}

	// Set initial status
	proxy.Status = domain.ProxyStatusUnknown

	return s.proxyRepo.Create(ctx, proxy)
}

func (s *ProxyService) UpdateProxy(ctx context.Context, id uuid.UUID, updates ProxyUpdates) (*domain.Proxy, error) {
	proxy, err := s.proxyRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("proxy not found: %w", err)
	}

	// Apply updates
	if updates.Name != nil {
		proxy.Name = *updates.Name
	}
	if updates.Description != nil {
		proxy.Description = *updates.Description
	}
	if updates.IsEnabled != nil {
		proxy.IsEnabled = *updates.IsEnabled
	}
	if updates.Status != nil {
		proxy.Status = *updates.Status
	}

	if err := s.proxyRepo.Update(ctx, proxy); err != nil {
		return nil, fmt.Errorf("update failed: %w", err)
	}

	return proxy, nil
}

func (s *ProxyService) validateProxyConfig(proxy *domain.Proxy) error {
	if proxy.Address == "" {
		return fmt.Errorf("address is required")
	}
	if proxy.Protocol == "" {
		return fmt.Errorf("protocol is required")
	}
	return nil
}

// ============================================================================
// KEYWORD SERVICE
// ============================================================================

type KeywordService struct {
	keywordRepo KeywordRepository
}

func NewKeywordService(keywordRepo KeywordRepository) *KeywordService {
	return &KeywordService{keywordRepo: keywordRepo}
}

func (s *KeywordService) ListKeywordSets(ctx context.Context, filters KeywordSetFilters) ([]*domain.KeywordSet, error) {
	return s.keywordRepo.ListSets(ctx, filters)
}

func (s *KeywordService) CreateKeywordSet(ctx context.Context, keywordSet *domain.KeywordSet) error {
	// Business logic: validate keyword set
	if err := s.validateKeywordSet(keywordSet); err != nil {
		return fmt.Errorf("invalid keyword set: %w", err)
	}

	return s.keywordRepo.CreateSet(ctx, keywordSet)
}

func (s *KeywordService) validateKeywordSet(keywordSet *domain.KeywordSet) error {
	if keywordSet.Name == "" {
		return fmt.Errorf("name is required")
	}

	for _, rule := range keywordSet.Rules {
		if rule.Pattern == "" {
			return fmt.Errorf("rule pattern is required")
		}
		if rule.Type != domain.KeywordRuleTypeString && rule.Type != domain.KeywordRuleTypeRegex {
			return fmt.Errorf("invalid rule type: %s", rule.Type)
		}
	}

	return nil
}

// ============================================================================
// CAMPAIGN SERVICE
// ============================================================================

type CampaignService struct {
	campaignRepo CampaignRepository
	userRepo     UserRepository
}

func NewCampaignService(campaignRepo CampaignRepository, userRepo UserRepository) *CampaignService {
	return &CampaignService{
		campaignRepo: campaignRepo,
		userRepo:     userRepo,
	}
}

func (s *CampaignService) ListCampaigns(ctx context.Context, filters CampaignFilters) ([]*domain.Campaign, error) {
	return s.campaignRepo.List(ctx, filters)
}

func (s *CampaignService) CreateCampaign(ctx context.Context, campaign *domain.Campaign) error {
	// Business logic: validate campaign
	if err := s.validateCampaign(ctx, campaign); err != nil {
		return fmt.Errorf("invalid campaign: %w", err)
	}

	// Set initial state
	campaign.State = domain.CampaignStateDraft

	return s.campaignRepo.Create(ctx, campaign)
}

func (s *CampaignService) StartCampaign(ctx context.Context, campaignID uuid.UUID) error {
	campaign, err := s.campaignRepo.GetByID(ctx, campaignID)
	if err != nil {
		return fmt.Errorf("campaign not found: %w", err)
	}

	if campaign.State != domain.CampaignStateDraft {
		return fmt.Errorf("campaign must be in draft state to start")
	}

	campaign.State = domain.CampaignStateRunning
	// campaign.StartedAt = time.Now()

	return s.campaignRepo.Update(ctx, campaign)
}

func (s *CampaignService) validateCampaign(ctx context.Context, campaign *domain.Campaign) error {
	if campaign.Name == "" {
		return fmt.Errorf("name is required")
	}

	// Verify user exists
	_, err := s.userRepo.GetByID(ctx, campaign.UserID)
	if err != nil {
		return fmt.Errorf("invalid user: %w", err)
	}

	// Validate configuration based on type
	if campaign.Type == domain.CampaignTypeLeadGeneration {
		return s.validateLeadGenerationConfig(campaign.Configuration)
	}

	return nil
}

func (s *CampaignService) validateLeadGenerationConfig(config domain.CampaignConfig) error {
	if config.DNSPhase == nil && config.HTTPPhase == nil {
		return fmt.Errorf("at least one phase must be configured")
	}

	if config.DNSPhase != nil && len(config.DNSPhase.PersonaIDs) == 0 {
		return fmt.Errorf("DNS phase requires at least one persona")
	}

	if config.HTTPPhase != nil && len(config.HTTPPhase.PersonaIDs) == 0 {
		return fmt.Errorf("HTTP phase requires at least one persona")
	}

	return nil
}
