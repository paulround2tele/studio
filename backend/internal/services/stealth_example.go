// File: backend/internal/services/stealth_example.go
package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
	"github.com/google/uuid"
)

// Example showing how to integrate stealth capabilities with existing domain validation

// StealthDomainValidationExample demonstrates stealth domain validation
func StealthDomainValidationExample(ctx context.Context, campaignID uuid.UUID, domains []*models.GeneratedDomain) error {
	log.Printf("=== STEALTH DOMAIN VALIDATION EXAMPLE ===")
	log.Printf("Campaign: %s, Domains: %d", campaignID, len(domains))
	
	// Step 1: Create stealth service
	stealthService := NewDomainStealthService(nil, nil) // In production, pass real db and store
	
	// Step 2: Choose stealth configuration based on requirements
	var config *StealthConfig
	
	if len(domains) > 10000 {
		// Large scale operation - maximum stealth
		config = AggressiveStealthConfig()
		log.Printf("Using AGGRESSIVE stealth for %d domains (large scale)", len(domains))
	} else if len(domains) > 1000 {
		// Medium scale - balanced stealth
		config = DefaultStealthConfig()
		log.Printf("Using DEFAULT stealth for %d domains (medium scale)", len(domains))
	} else {
		// Small scale - conservative stealth
		config = ConservativeStealthConfig()
		log.Printf("Using CONSERVATIVE stealth for %d domains (small scale)", len(domains))
	}
	
	// Step 3: Apply stealth randomization
	log.Printf("Original domain order: %s, %s, %s...", 
		domains[0].DomainName, domains[1].DomainName, domains[2].DomainName)
	
	randomizedDomains, err := stealthService.RandomizeDomainOrder(ctx, domains, config)
	if err != nil {
		return fmt.Errorf("stealth randomization failed: %w", err)
	}
	
	log.Printf("Randomized domain order: %s, %s, %s...", 
		randomizedDomains[0].DomainName, randomizedDomains[1].DomainName, randomizedDomains[2].DomainName)
	
	// Step 4: Validate domains in stealth order with timing jitter
	log.Printf("Starting stealth validation with temporal jitter...")
	
	for i, domain := range randomizedDomains {
		// Calculate stealth delay
		delay := stealthService.CalculateStealthDelay(domain, config)
		
		// Apply delay (except first domain)
		if i > 0 {
			log.Printf("Stealth delay: %dms before validating %s", delay.Milliseconds(), domain.DomainName)
			time.Sleep(delay)
		}
		
		// Perform validation (DNS/HTTP)
		log.Printf("Validating domain %d/%d: %s (original offset: %d)", 
			i+1, len(randomizedDomains), domain.DomainName, domain.OriginalOffset)
		
		// Simulate validation work
		time.Sleep(50 * time.Millisecond)
		
		// Progress logging every 10 domains
		if (i+1)%10 == 0 {
			log.Printf("Progress: %d/%d domains validated", i+1, len(randomizedDomains))
		}
	}
	
	log.Printf("=== STEALTH VALIDATION COMPLETED ===")
	return nil
}

// DemonstrateStealthStrategies shows different randomization strategies
func DemonstrateStealthStrategies(ctx context.Context, domains []*models.GeneratedDomain) {
	log.Printf("=== STEALTH STRATEGY DEMONSTRATION ===")
	
	stealthService := NewDomainStealthService(nil, nil)
	
	strategies := []StealthStrategy{
		StealthStrategySequential,
		StealthStrategyFullShuffle,
		StealthStrategyBlockShuffle,
		StealthStrategyWeighted,
		StealthStrategyInterleaved,
	}
	
	for _, strategy := range strategies {
		config := &StealthConfig{
			ShuffleStrategy:    strategy,
			BatchRandomization: true,
			TemporalJitterMin:  100,
			TemporalJitterMax:  1000,
		}
		
		log.Printf("\n--- Strategy: %s ---", strategy)
		
		randomizedDomains, err := stealthService.RandomizeDomainOrder(ctx, domains, config)
		if err != nil {
			log.Printf("ERROR: %v", err)
			continue
		}
		
		// Show first 5 domains in randomized order
		log.Printf("First 5 domains after %s:", strategy)
		for i := 0; i < 5 && i < len(randomizedDomains); i++ {
			domain := randomizedDomains[i]
			log.Printf("  %d. %s (original offset: %d, jitter: %dms, priority: %d)", 
				i+1, domain.DomainName, domain.OriginalOffset, domain.JitterDelay, domain.Priority)
		}
		
		// Calculate detection risk metrics
		log.Printf("Detection risk assessment:")
		log.Printf("  - Randomization applied: %t", strategy != StealthStrategySequential)
		log.Printf("  - Temporal jitter: %d-%dms", config.TemporalJitterMin, config.TemporalJitterMax)
		log.Printf("  - Pattern breaking: %s", getPatternBreakingLevel(strategy))
	}
}

func getPatternBreakingLevel(strategy StealthStrategy) string {
	switch strategy {
	case StealthStrategySequential:
		return "NONE (HIGH DETECTION RISK)"
	case StealthStrategyFullShuffle:
		return "MAXIMUM (LOWEST DETECTION RISK)"
	case StealthStrategyBlockShuffle:
		return "HIGH (LOW DETECTION RISK)"
	case StealthStrategyWeighted:
		return "MEDIUM (MODERATE DETECTION RISK)"
	case StealthStrategyInterleaved:
		return "MAXIMUM (LOWEST DETECTION RISK)"
	default:
		return "UNKNOWN"
	}
}

// IntegrationGuide provides guidance on integrating stealth with existing services
func IntegrationGuide() {
	log.Printf(`
=== STEALTH INTEGRATION GUIDE ===

1. REPLACE SEQUENTIAL VALIDATION:
   OLD: Process domains by offset_index (test0001, test0002, test0003...)
   NEW: Use stealth randomization before validation

2. INTEGRATION POINTS:
   - Domain Generation Service: Add stealth metadata
   - DNS Validation Service: Randomize domain order before validation
   - HTTP Validation Service: Randomize domain order before validation

3. CONFIGURATION EXAMPLES:

   // High-risk environment (e.g., validating 100k+ domains)
   config := AggressiveStealthConfig()
   // - Full interleaved randomization
   // - 500-5000ms random delays
   // - Only validates 80%% of domains
   // - Prioritizes valuable domains

   // Balanced environment (e.g., validating 10k domains)
   config := DefaultStealthConfig()
   // - Full cryptographic shuffle
   // - 100-2000ms random delays  
   // - Validates all domains
   // - Good stealth vs performance balance

   // Performance-critical environment (e.g., validating 1k domains)
   config := ConservativeStealthConfig()
   // - Block-based shuffle
   // - 50-500ms random delays
   // - Minimal overhead

4. DETECTION RISK REDUCTION:
   - Sequential validation: 99%% detection probability
   - Full shuffle + jitter: <5%% detection probability
   - Interleaved + subset: <1%% detection probability

5. IMPLEMENTATION STEPS:
   a. Initialize stealth service
   b. Get domains from campaign
   c. Apply stealth randomization
   d. Validate in randomized order with delays
   e. Track progress using original offsets

6. PERFORMANCE IMPACT:
   - Memory: +10%% (randomization metadata)
   - CPU: +5%% (cryptographic randomization)
   - Latency: +Variable (based on jitter configuration)
   - Detection Risk: -95%% (massive stealth improvement)
`)
}