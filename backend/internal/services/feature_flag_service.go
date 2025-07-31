package services

import (
	"crypto/md5"
	"fmt"
	"hash/fnv"
	"log"

	"github.com/fntelecomllc/studio/backend/internal/config"
)

// FeatureFlagService handles gradual rollout and feature flag logic
type FeatureFlagService struct {
	config config.FeatureFlagConfig
}

// NewFeatureFlagService creates a new feature flag service
func NewFeatureFlagService(config config.FeatureFlagConfig) *FeatureFlagService {
	return &FeatureFlagService{
		config: config,
	}
}

// ShouldUseOptimization determines if optimization features should be used for a given identifier
func (f *FeatureFlagService) ShouldUseOptimization(identifier string) bool {
	if !f.config.GradualRollout {
		return true
	}

	// Use deterministic hashing to ensure consistent rollout behavior
	hash := fnv.New32a()
	hash.Write([]byte(identifier))
	hashValue := hash.Sum32()

	percentage := float64(hashValue%100) / 100.0
	shouldUse := percentage < (float64(f.config.RolloutPercentage) / 100.0)

	if f.config.DebugLogging {
		log.Printf("FeatureFlag: identifier=%s, hash=%d, percentage=%.2f, rollout=%.2f, shouldUse=%v",
			identifier, hashValue%100, percentage*100, float64(f.config.RolloutPercentage), shouldUse)
	}

	return shouldUse
}

// ShouldUseBatchQueries checks if batch query optimization should be used
func (f *FeatureFlagService) ShouldUseBatchQueries(identifier string) bool {
	return f.ShouldUseOptimization(identifier)
}

// ShouldUseServiceOptimization checks if service-level optimization should be used
func (f *FeatureFlagService) ShouldUseServiceOptimization(identifier string) bool {
	return f.ShouldUseOptimization(identifier)
}

// ShouldUseExternalValidation checks if external validation optimization should be used
func (f *FeatureFlagService) ShouldUseExternalValidation(identifier string) bool {
	return f.ShouldUseOptimization(identifier)
}

// ShouldUseCaching checks if caching optimization should be used
func (f *FeatureFlagService) ShouldUseCaching(identifier string) bool {
	return f.ShouldUseOptimization(identifier)
}

// GetOptimizationLevel returns a structured view of which optimizations are enabled
func (f *FeatureFlagService) GetOptimizationLevel(identifier string) OptimizationLevel {
	shouldUse := f.ShouldUseOptimization(identifier)

	return OptimizationLevel{
		BatchQueries:        shouldUse,
		ServiceOptimization: shouldUse,
		ExternalValidation:  shouldUse,
		Caching:             shouldUse,
		Identifier:          identifier,
	}
}

// OptimizationLevel represents which optimization features are enabled for a specific context
type OptimizationLevel struct {
	BatchQueries        bool   `json:"batchQueries"`
	ServiceOptimization bool   `json:"serviceOptimization"`
	ExternalValidation  bool   `json:"externalValidation"`
	Caching             bool   `json:"caching"`
	Identifier          string `json:"identifier"`
}

// GetConfig returns the current feature flag configuration
func (f *FeatureFlagService) GetConfig() config.FeatureFlagConfig {
	return f.config
}

// UpdateConfig updates the feature flag configuration
func (f *FeatureFlagService) UpdateConfig(newConfig config.FeatureFlagConfig) {
	f.config = newConfig
	if f.config.DebugLogging {
		log.Printf("FeatureFlag: Configuration updated - GradualRollout=%v, RolloutPercentage=%d",
			newConfig.GradualRollout, newConfig.RolloutPercentage)
	}
}

// GenerateUserIdentifier creates a consistent identifier for feature flag decisions
// This can be based on user ID, session ID, campaign ID, or other contextual data
func GenerateUserIdentifier(userID, sessionID, campaignID string) string {
	if userID != "" {
		return fmt.Sprintf("user:%s", userID)
	}
	if sessionID != "" {
		return fmt.Sprintf("session:%s", sessionID)
	}
	if campaignID != "" {
		return fmt.Sprintf("campaign:%s", campaignID)
	}
	// Fallback to a default identifier
	return "default:anonymous"
}

// GenerateCampaignIdentifier creates a campaign-specific identifier for optimization decisions
func GenerateCampaignIdentifier(campaignID string) string {
	return fmt.Sprintf("campaign:%s", campaignID)
}

// GenerateSessionIdentifier creates a session-specific identifier for optimization decisions
func GenerateSessionIdentifier(sessionID string) string {
	return fmt.Sprintf("session:%s", sessionID)
}

// HashIdentifier creates a consistent hash for any identifier
func HashIdentifier(identifier string) string {
	hash := md5.Sum([]byte(identifier))
	return fmt.Sprintf("%x", hash)
}

// IsOptimizationEnabled checks if any optimization features are enabled globally
func (f *FeatureFlagService) IsOptimizationEnabled() bool {
	return f.config.RolloutPercentage > 0
}

// GetRolloutPercentage returns the current rollout percentage
func (f *FeatureFlagService) GetRolloutPercentage() int {
	return f.config.RolloutPercentage
}

// ShouldFallbackOnError checks if the system should fallback to non-optimized behavior on errors
func (f *FeatureFlagService) ShouldFallbackOnError() bool {
	return f.config.FallbackOnError
}

// IsDebugLoggingEnabled checks if debug logging is enabled for feature flags
func (f *FeatureFlagService) IsDebugLoggingEnabled() bool {
	return f.config.DebugLogging
}
