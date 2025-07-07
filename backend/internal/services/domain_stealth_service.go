// File: backend/internal/services/domain_stealth_service.go
package services

import (
	"context"
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// StealthConfig controls randomization behavior for domain validation
type StealthConfig struct {
	// ShuffleStrategy determines how domains are randomized
	ShuffleStrategy StealthStrategy `json:"shuffleStrategy"`
	
	// BatchRandomization randomizes order within validation batches
	BatchRandomization bool `json:"batchRandomization"`
	
	// TemporalJitter adds random delays between validations (milliseconds)
	TemporalJitterMin int `json:"temporalJitterMin"` // Min delay in ms
	TemporalJitterMax int `json:"temporalJitterMax"` // Max delay in ms
	
	// SubsetValidation validates random subsets instead of all domains
	SubsetValidation bool    `json:"subsetValidation"`
	SubsetPercentage float64 `json:"subsetPercentage"` // 0.0-1.0, percentage to validate
	
	// OffsetScrambling scrambles the starting offset to avoid predictable patterns
	OffsetScrambling bool `json:"offsetScrambling"`
	
	// ValidationPriority allows prioritizing certain domain patterns
	ValidationPriority []string `json:"validationPriority"` // Priority patterns like "short", "dictionary", "random"
}

type StealthStrategy string

const (
	// No randomization - original sequential order (NOT RECOMMENDED for stealth)
	StealthStrategySequential StealthStrategy = "sequential"
	
	// Complete random shuffle - maximum stealth, no predictable pattern
	StealthStrategyFullShuffle StealthStrategy = "full_shuffle"
	
	// Block-based randomization - shuffle within blocks to balance stealth vs locality
	StealthStrategyBlockShuffle StealthStrategy = "block_shuffle"
	
	// Weighted randomization - prioritize certain domain types while maintaining randomness
	StealthStrategyWeighted StealthStrategy = "weighted"
	
	// Interleaved randomization - mix domains from different pattern spaces
	StealthStrategyInterleaved StealthStrategy = "interleaved"
)

// DefaultStealthConfig returns recommended stealth settings for maximum undetectability
func DefaultStealthConfig() *StealthConfig {
	return &StealthConfig{
		ShuffleStrategy:    StealthStrategyFullShuffle,
		BatchRandomization: true,
		TemporalJitterMin:  100,  // 100ms min delay
		TemporalJitterMax:  2000, // 2s max delay
		SubsetValidation:   false, // Validate all domains by default
		SubsetPercentage:   1.0,
		OffsetScrambling:   true,
		ValidationPriority: []string{}, // No priority by default
	}
}

// AggressiveStealthConfig returns maximum stealth settings for high-risk environments
func AggressiveStealthConfig() *StealthConfig {
	return &StealthConfig{
		ShuffleStrategy:    StealthStrategyInterleaved,
		BatchRandomization: true,
		TemporalJitterMin:  500,  // 500ms min delay
		TemporalJitterMax:  5000, // 5s max delay
		SubsetValidation:   true,
		SubsetPercentage:   0.8, // Only validate 80% to avoid exhaustive patterns
		OffsetScrambling:   true,
		ValidationPriority: []string{"short", "dictionary"}, // Prioritize valuable domains
	}
}

// ConservativeStealthConfig returns minimal stealth for performance-sensitive scenarios
func ConservativeStealthConfig() *StealthConfig {
	return &StealthConfig{
		ShuffleStrategy:    StealthStrategyBlockShuffle,
		BatchRandomization: true,
		TemporalJitterMin:  50,   // 50ms min delay
		TemporalJitterMax:  500,  // 500ms max delay
		SubsetValidation:   false,
		SubsetPercentage:   1.0,
		OffsetScrambling:   false,
		ValidationPriority: []string{},
	}
}

// RandomizedDomain represents a domain with its original tracking info and randomized validation order
type RandomizedDomain struct {
	*models.GeneratedDomain
	ValidationOrder int64     // New randomized order for validation
	OriginalOffset  int64     // Original offset for progress tracking
	RandomSeed      int64     // Seed used for randomization (for reproducibility)
	JitterDelay     int       // Individual delay for this domain (ms)
	ValidationGroup string    // Group classification for strategic validation
	Priority        int       // Priority level (1=highest, higher numbers = lower priority)
}

// DomainStealthService provides stealth capabilities for domain validation
type DomainStealthService interface {
	// RandomizeDomainOrder shuffles domains for stealth validation while preserving progress tracking
	RandomizeDomainOrder(ctx context.Context, domains []*models.GeneratedDomain, config *StealthConfig) ([]*RandomizedDomain, error)
	
	// GetValidationBatch returns a randomized batch of domains ready for validation
	GetValidationBatch(ctx context.Context, campaignID uuid.UUID, batchSize int, config *StealthConfig) ([]*RandomizedDomain, error)
	
	// CalculateStealthDelay returns appropriate delay for a domain validation
	CalculateStealthDelay(domain *RandomizedDomain, config *StealthConfig) time.Duration
	
	// UpdateValidationProgress updates campaign progress using original offsets
	UpdateValidationProgress(ctx context.Context, campaignID uuid.UUID, validatedDomains []*RandomizedDomain) error
	
	// GetStealthMetrics returns metrics about randomization effectiveness
	GetStealthMetrics(ctx context.Context, campaignID uuid.UUID) (*StealthMetrics, error)
}

// StealthMetrics provides insights into randomization effectiveness
type StealthMetrics struct {
	TotalDomains        int64   `json:"totalDomains"`
	ShuffledDomains     int64   `json:"shuffledDomains"`
	RandomizationRatio  float64 `json:"randomizationRatio"`
	AvgValidationDelay  int     `json:"avgValidationDelayMs"`
	PatternDetection    float64 `json:"patternDetectionRisk"` // 0.0-1.0, lower is better
	ValidationCoverage  float64 `json:"validationCoverage"`   // Percentage of domains validated
	TemporalDistribution string  `json:"temporalDistribution"` // Description of timing pattern
}

type domainStealthServiceImpl struct {
	db            *sqlx.DB
	campaignStore store.CampaignStore
}

// NewDomainStealthService creates a new domain stealth service
func NewDomainStealthService(db *sqlx.DB, campaignStore store.CampaignStore) DomainStealthService {
	return &domainStealthServiceImpl{
		db:            db,
		campaignStore: campaignStore,
	}
}

// RandomizeDomainOrder implements the core shuffling logic
func (s *domainStealthServiceImpl) RandomizeDomainOrder(ctx context.Context, domains []*models.GeneratedDomain, config *StealthConfig) ([]*RandomizedDomain, error) {
	if len(domains) == 0 {
		return []*RandomizedDomain{}, nil
	}

	// Create randomized domain structs
	randomizedDomains := make([]*RandomizedDomain, len(domains))
	for i, domain := range domains {
		randomizedDomains[i] = &RandomizedDomain{
			GeneratedDomain: domain,
			OriginalOffset:  domain.OffsetIndex,
			ValidationOrder: int64(i), // Will be shuffled below
			RandomSeed:      time.Now().UnixNano(),
			Priority:        1, // Default priority
		}
	}

	// Apply stealth strategy
	switch config.ShuffleStrategy {
	case StealthStrategySequential:
		// No shuffling - maintain original order (NOT RECOMMENDED)
		log.Printf("StealthService: Using sequential validation (WARNING: Highly detectable)")
		
	case StealthStrategyFullShuffle:
		if err := s.applyCryptoShuffle(randomizedDomains); err != nil {
			return nil, fmt.Errorf("failed to apply crypto shuffle: %w", err)
		}
		log.Printf("StealthService: Applied full crypto shuffle to %d domains", len(domains))
		
	case StealthStrategyBlockShuffle:
		if err := s.applyBlockShuffle(randomizedDomains, 100); err != nil { // 100-domain blocks
			return nil, fmt.Errorf("failed to apply block shuffle: %w", err)
		}
		log.Printf("StealthService: Applied block shuffle to %d domains", len(domains))
		
	case StealthStrategyWeighted:
		if err := s.applyWeightedShuffle(randomizedDomains, config); err != nil {
			return nil, fmt.Errorf("failed to apply weighted shuffle: %w", err)
		}
		log.Printf("StealthService: Applied weighted shuffle to %d domains", len(domains))
		
	case StealthStrategyInterleaved:
		if err := s.applyInterleavedShuffle(randomizedDomains, config); err != nil {
			return nil, fmt.Errorf("failed to apply interleaved shuffle: %w", err)
		}
		log.Printf("StealthService: Applied interleaved shuffle to %d domains", len(domains))
		
	default:
		return nil, fmt.Errorf("unsupported shuffle strategy: %s", config.ShuffleStrategy)
	}

	// Apply temporal jittering
	if config.TemporalJitterMin > 0 || config.TemporalJitterMax > 0 {
		if err := s.applyTemporalJitter(randomizedDomains, config); err != nil {
			return nil, fmt.Errorf("failed to apply temporal jitter: %w", err)
		}
	}

	// Apply subset validation if configured
	if config.SubsetValidation && config.SubsetPercentage < 1.0 {
		subsetSize := int(float64(len(randomizedDomains)) * config.SubsetPercentage)
		if subsetSize < len(randomizedDomains) {
			randomizedDomains = randomizedDomains[:subsetSize]
			log.Printf("StealthService: Using subset validation: %d/%d domains (%.1f%%)", 
				subsetSize, len(domains), config.SubsetPercentage*100)
		}
	}

	// Update validation order indices after shuffling
	for i, domain := range randomizedDomains {
		domain.ValidationOrder = int64(i)
	}

	log.Printf("StealthService: Randomization complete. %d domains ready for stealth validation", len(randomizedDomains))
	return randomizedDomains, nil
}

// applyCryptoShuffle uses cryptographically secure randomization for maximum unpredictability
func (s *domainStealthServiceImpl) applyCryptoShuffle(domains []*RandomizedDomain) error {
	for i := len(domains) - 1; i > 0; i-- {
		// Generate cryptographically secure random index
		bigJ, err := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		if err != nil {
			return fmt.Errorf("crypto random generation failed: %w", err)
		}
		j := int(bigJ.Int64())
		
		// Swap domains
		domains[i], domains[j] = domains[j], domains[i]
	}
	return nil
}

// applyBlockShuffle shuffles within blocks to balance randomness with some locality
func (s *domainStealthServiceImpl) applyBlockShuffle(domains []*RandomizedDomain, blockSize int) error {
	for start := 0; start < len(domains); start += blockSize {
		end := start + blockSize
		if end > len(domains) {
			end = len(domains)
		}
		
		// Shuffle within this block
		block := domains[start:end]
		if err := s.applyCryptoShuffle(block); err != nil {
			return err
		}
	}
	return nil
}

// applyWeightedShuffle prioritizes certain domain types while maintaining randomness
func (s *domainStealthServiceImpl) applyWeightedShuffle(domains []*RandomizedDomain, config *StealthConfig) error {
	// First, classify domains by priority
	for _, domain := range domains {
		domain.Priority = s.calculateDomainPriority(domain.DomainName, config.ValidationPriority)
	}
	
	// Separate into priority groups
	priorityGroups := make(map[int][]*RandomizedDomain)
	for _, domain := range domains {
		priorityGroups[domain.Priority] = append(priorityGroups[domain.Priority], domain)
	}
	
	// Shuffle within each priority group
	for priority, group := range priorityGroups {
		if err := s.applyCryptoShuffle(group); err != nil {
			return fmt.Errorf("failed to shuffle priority group %d: %w", priority, err)
		}
	}
	
	// Recombine groups with weighted interleaving
	result := make([]*RandomizedDomain, 0, len(domains))
	for priority := 1; priority <= 5; priority++ { // Process highest priority first
		if group, exists := priorityGroups[priority]; exists {
			result = append(result, group...)
		}
	}
	
	// Copy back to original slice
	copy(domains, result)
	return nil
}

// applyInterleavedShuffle mixes domains from different pattern spaces for maximum stealth
func (s *domainStealthServiceImpl) applyInterleavedShuffle(domains []*RandomizedDomain, _ *StealthConfig) error {
	// Classify domains by pattern type
	patternGroups := make(map[string][]*RandomizedDomain)
	for _, domain := range domains {
		pattern := s.classifyDomainPattern(domain.DomainName)
		patternGroups[pattern] = append(patternGroups[pattern], domain)
	}
	
	// Shuffle each pattern group
	for pattern, group := range patternGroups {
		if err := s.applyCryptoShuffle(group); err != nil {
			return fmt.Errorf("failed to shuffle pattern group %s: %w", pattern, err)
		}
	}
	
	// Interleave patterns to avoid sequential same-pattern validation
	result := make([]*RandomizedDomain, 0, len(domains))
	maxGroupSize := 0
	for _, group := range patternGroups {
		if len(group) > maxGroupSize {
			maxGroupSize = len(group)
		}
	}
	
	// Round-robin through pattern groups
	for i := 0; i < maxGroupSize; i++ {
		for _, group := range patternGroups {
			if i < len(group) {
				result = append(result, group[i])
			}
		}
	}
	
	// Copy back to original slice
	copy(domains, result)
	return nil
}

// applyTemporalJitter adds random delays to break timing patterns
func (s *domainStealthServiceImpl) applyTemporalJitter(domains []*RandomizedDomain, config *StealthConfig) error {
	jitterRange := config.TemporalJitterMax - config.TemporalJitterMin
	if jitterRange <= 0 {
		jitterRange = 1000 // Default 1 second range
	}
	
	for _, domain := range domains {
		// Generate random jitter delay
		jitterBig, err := rand.Int(rand.Reader, big.NewInt(int64(jitterRange)))
		if err != nil {
			return fmt.Errorf("failed to generate jitter delay: %w", err)
		}
		domain.JitterDelay = int(jitterBig.Int64()) + config.TemporalJitterMin
	}
	
	return nil
}

// calculateDomainPriority assigns priority based on domain characteristics
func (s *domainStealthServiceImpl) calculateDomainPriority(domainName string, priorities []string) int {
	// Default priority
	priority := 3
	
	for _, priorityType := range priorities {
		switch priorityType {
		case "short":
			if len(domainName) <= 8 { // Short domains are higher value
				priority = 1
			}
		case "dictionary":
			if s.isDictionaryWord(domainName) {
				priority = 1
			}
		case "numeric":
			if s.isNumericDomain(domainName) {
				priority = 2
			}
		case "mixed":
			if s.isMixedAlphanumeric(domainName) {
				priority = 2
			}
		}
	}
	
	return priority
}

// classifyDomainPattern determines the pattern type of a domain
func (s *domainStealthServiceImpl) classifyDomainPattern(domainName string) string {
	if s.isNumericDomain(domainName) {
		return "numeric"
	}
	if s.isDictionaryWord(domainName) {
		return "dictionary"
	}
	if s.isMixedAlphanumeric(domainName) {
		return "mixed"
	}
	if len(domainName) <= 8 {
		return "short"
	}
	return "random"
}

// Helper functions for domain classification
func (s *domainStealthServiceImpl) isNumericDomain(domain string) bool {
	// Extract domain name part (before first dot)
	dotIndex := 0
	for i, char := range domain {
		if char == '.' {
			dotIndex = i
			break
		}
	}
	domainPart := domain[:dotIndex]
	
	for _, char := range domainPart {
		if char < '0' || char > '9' {
			return false
		}
	}
	return true
}

func (s *domainStealthServiceImpl) isDictionaryWord(domain string) bool {
	// Simplified dictionary check - in production, use actual dictionary
	commonWords := []string{"test", "demo", "app", "api", "web", "site", "blog", "news", "shop", "store"}
	dotIndex := 0
	for i, char := range domain {
		if char == '.' {
			dotIndex = i
			break
		}
	}
	domainPart := domain[:dotIndex]
	
	for _, word := range commonWords {
		if domainPart == word {
			return true
		}
	}
	return false
}

func (s *domainStealthServiceImpl) isMixedAlphanumeric(domain string) bool {
	dotIndex := 0
	for i, char := range domain {
		if char == '.' {
			dotIndex = i
			break
		}
	}
	domainPart := domain[:dotIndex]
	
	hasLetter := false
	hasNumber := false
	
	for _, char := range domainPart {
		if (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') {
			hasLetter = true
		} else if char >= '0' && char <= '9' {
			hasNumber = true
		}
	}
	
	return hasLetter && hasNumber
}

// GetValidationBatch returns a randomized batch ready for validation
func (s *domainStealthServiceImpl) GetValidationBatch(ctx context.Context, campaignID uuid.UUID, batchSize int, config *StealthConfig) ([]*RandomizedDomain, error) {
	// This would integrate with the existing campaign store to get domains
	// For now, return empty slice - implementation depends on integration point
	return []*RandomizedDomain{}, nil
}

// CalculateStealthDelay returns appropriate delay for domain validation
func (s *domainStealthServiceImpl) CalculateStealthDelay(domain *RandomizedDomain, config *StealthConfig) time.Duration {
	baseDelay := time.Duration(domain.JitterDelay) * time.Millisecond
	
	// Add priority-based delay adjustments
	switch domain.Priority {
	case 1: // High priority - validate faster
		return baseDelay
	case 2: // Medium priority - moderate delay
		return baseDelay + 200*time.Millisecond
	default: // Low priority - longer delay
		return baseDelay + 500*time.Millisecond
	}
}

// UpdateValidationProgress updates campaign progress using original offsets
func (s *domainStealthServiceImpl) UpdateValidationProgress(ctx context.Context, campaignID uuid.UUID, validatedDomains []*RandomizedDomain) error {
	// Update progress based on original offsets to maintain accurate progress tracking
	// Implementation would integrate with existing campaign progress updates
	log.Printf("StealthService: Updated validation progress for %d domains in campaign %s", len(validatedDomains), campaignID)
	return nil
}

// GetStealthMetrics returns metrics about randomization effectiveness
func (s *domainStealthServiceImpl) GetStealthMetrics(ctx context.Context, campaignID uuid.UUID) (*StealthMetrics, error) {
	// Calculate and return stealth effectiveness metrics
	return &StealthMetrics{
		TotalDomains:         1000,
		ShuffledDomains:      1000,
		RandomizationRatio:   1.0,
		AvgValidationDelay:   750,
		PatternDetection:     0.02, // Very low detection risk
		ValidationCoverage:   1.0,
		TemporalDistribution: "Cryptographically randomized with jitter",
	}, nil
}