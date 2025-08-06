// File: backend/internal/models/stealth_presets.go
package models

// EnterpriseStealthPresets provides pre-configured stealth policies for different use cases
var EnterpriseStealthPresets = map[string]*StealthValidationConfig{
	"conservative": {
		Enabled:             true,
		RandomizationLevel:  "low",
		TemporalJitter:      true,
		PatternAvoidance:    true,
		UserAgentRotation:   true,
		ProxyRotationForced: false,
		DetectionThreshold:  0.8,
		RequestSpacing:      intPtr(2000), // 2 seconds
		AdvancedPolicy: &AdvancedStealthPolicy{
			Profile:                "conservative",
			MaxConcurrentRequests:  3,
			RequestBurstLimit:      5,
			AdaptiveThrottling:     true,
			GeographicDistribution: false,
			TimeZoneSimulation:     false,
			HumanBehaviorPatterns:  []string{"gradual_ramp", "natural_pauses"},
			CooldownPeriods:        []int{30, 60, 120},
		},
		BehavioralMimicry: &BehavioralMimicryConfig{
			Enabled:         true,
			BrowserBehavior: true,
			SearchPatterns:  false,
			TypingDelays:    true,
			SessionDuration: intPtr(300), // 5 minutes
			IdlePeriods:     []int{15, 30, 45},
		},
		ProxyStrategy: &EnterpriseProxyStrategy{
			Strategy:              "round_robin",
			ProxyRotationRate:     "per_batch",
			HealthCheckInterval:   300, // 5 minutes
			FailoverThreshold:     0.7,
			GeoTargeting:          false,
			ProxyQualityFiltering: true,
		},
		DetectionEvasion: &DetectionEvasionConfig{
			Enabled:                   true,
			FingerprintRandomization:  false,
			TLSFingerprintRotation:    false,
			HTTPHeaderRandomization:   true,
			RequestOrderRandomization: false,
			TimingAttackPrevention:    true,
			RateLimitEvasion:          true,
			HoneypotDetection:         true,
		},
	},
	"moderate": {
		Enabled:             true,
		RandomizationLevel:  "medium",
		TemporalJitter:      true,
		PatternAvoidance:    true,
		UserAgentRotation:   true,
		ProxyRotationForced: true,
		DetectionThreshold:  0.6,
		RequestSpacing:      intPtr(1500), // 1.5 seconds
		AdvancedPolicy: &AdvancedStealthPolicy{
			Profile:                "moderate",
			MaxConcurrentRequests:  5,
			RequestBurstLimit:      10,
			AdaptiveThrottling:     true,
			GeographicDistribution: true,
			TimeZoneSimulation:     true,
			HumanBehaviorPatterns:  []string{"gradual_ramp", "natural_pauses", "random_bursts"},
			CooldownPeriods:        []int{20, 40, 80},
		},
		BehavioralMimicry: &BehavioralMimicryConfig{
			Enabled:             true,
			BrowserBehavior:     true,
			SearchPatterns:      true,
			SocialMediaPatterns: false,
			TypingDelays:        true,
			ScrollingBehavior:   true,
			SessionDuration:     intPtr(600), // 10 minutes
			IdlePeriods:         []int{10, 20, 30, 60},
		},
		ProxyStrategy: &EnterpriseProxyStrategy{
			Strategy:              "weighted_random",
			ProxyRotationRate:     "per_domain",
			HealthCheckInterval:   180, // 3 minutes
			FailoverThreshold:     0.5,
			GeoTargeting:          true,
			ProxyQualityFiltering: true,
		},
		DetectionEvasion: &DetectionEvasionConfig{
			Enabled:                   true,
			FingerprintRandomization:  true,
			TLSFingerprintRotation:    true,
			HTTPHeaderRandomization:   true,
			RequestOrderRandomization: true,
			PayloadObfuscation:        false,
			TimingAttackPrevention:    true,
			RateLimitEvasion:          true,
			HoneypotDetection:         true,
			AntiAnalysisFeatures:      []string{"header_spoofing", "timing_variance"},
		},
	},
	"aggressive": {
		Enabled:             true,
		RandomizationLevel:  "high",
		TemporalJitter:      true,
		PatternAvoidance:    true,
		UserAgentRotation:   true,
		ProxyRotationForced: true,
		DetectionThreshold:  0.4,
		RequestSpacing:      intPtr(1000), // 1 second
		AdvancedPolicy: &AdvancedStealthPolicy{
			Profile:                "aggressive",
			MaxConcurrentRequests:  8,
			RequestBurstLimit:      15,
			AdaptiveThrottling:     true,
			GeographicDistribution: true,
			TimeZoneSimulation:     true,
			HumanBehaviorPatterns:  []string{"gradual_ramp", "natural_pauses", "random_bursts", "power_user"},
			CooldownPeriods:        []int{10, 20, 40},
		},
		BehavioralMimicry: &BehavioralMimicryConfig{
			Enabled:             true,
			BrowserBehavior:     true,
			SearchPatterns:      true,
			SocialMediaPatterns: true,
			RandomMouseMovement: true,
			TypingDelays:        true,
			ScrollingBehavior:   true,
			SessionDuration:     intPtr(900), // 15 minutes
			IdlePeriods:         []int{5, 10, 15, 30},
		},
		ProxyStrategy: &EnterpriseProxyStrategy{
			Strategy:              "intelligent_failover",
			ProxyRotationRate:     "per_request",
			HealthCheckInterval:   60, // 1 minute
			FailoverThreshold:     0.3,
			GeoTargeting:          true,
			ProxyQualityFiltering: true,
		},
		DetectionEvasion: &DetectionEvasionConfig{
			Enabled:                   true,
			FingerprintRandomization:  true,
			TLSFingerprintRotation:    true,
			HTTPHeaderRandomization:   true,
			RequestOrderRandomization: true,
			PayloadObfuscation:        true,
			TimingAttackPrevention:    true,
			RateLimitEvasion:          true,
			HoneypotDetection:         true,
			CAPTCHABypass:             false, // Disabled for compliance
			AntiAnalysisFeatures:      []string{"header_spoofing", "timing_variance", "payload_encryption"},
		},
	},
	"extreme_stealth": {
		Enabled:             true,
		RandomizationLevel:  "extreme",
		TemporalJitter:      true,
		PatternAvoidance:    true,
		UserAgentRotation:   true,
		ProxyRotationForced: true,
		DetectionThreshold:  0.2,
		RequestSpacing:      intPtr(3000), // 3 seconds for maximum stealth
		AdvancedPolicy: &AdvancedStealthPolicy{
			Profile:                "extreme_stealth",
			MaxConcurrentRequests:  2, // Very conservative concurrency
			RequestBurstLimit:      3,
			AdaptiveThrottling:     true,
			GeographicDistribution: true,
			TimeZoneSimulation:     true,
			HumanBehaviorPatterns:  []string{"gradual_ramp", "natural_pauses", "random_bursts", "power_user", "research_patterns"},
			CooldownPeriods:        []int{60, 120, 300, 600}, // Extended cooldowns
		},
		BehavioralMimicry: &BehavioralMimicryConfig{
			Enabled:             true,
			BrowserBehavior:     true,
			SearchPatterns:      true,
			SocialMediaPatterns: true,
			RandomMouseMovement: true,
			TypingDelays:        true,
			ScrollingBehavior:   true,
			SessionDuration:     intPtr(1800), // 30 minutes
			IdlePeriods:         []int{30, 60, 120, 300},
		},
		ProxyStrategy: &EnterpriseProxyStrategy{
			Strategy:              "geographic",
			ProxyRotationRate:     "adaptive",
			HealthCheckInterval:   30,  // 30 seconds for rapid detection
			FailoverThreshold:     0.1, // Very sensitive failover
			GeoTargeting:          true,
			ProxyQualityFiltering: true,
		},
		DetectionEvasion: &DetectionEvasionConfig{
			Enabled:                   true,
			FingerprintRandomization:  true,
			TLSFingerprintRotation:    true,
			HTTPHeaderRandomization:   true,
			RequestOrderRandomization: true,
			PayloadObfuscation:        true,
			TimingAttackPrevention:    true,
			RateLimitEvasion:          true,
			HoneypotDetection:         true,
			CAPTCHABypass:             false, // Compliance first
			AntiAnalysisFeatures:      []string{"header_spoofing", "timing_variance", "payload_encryption", "traffic_shaping", "protocol_mimicry"},
		},
	},
}

// intPtr is a helper function to get pointer to int
func intPtr(i int) *int {
	return &i
}

// GetStealthPreset returns a pre-configured stealth policy by name
func GetStealthPreset(name string) (*StealthValidationConfig, bool) {
	preset, exists := EnterpriseStealthPresets[name]
	if !exists {
		return nil, false
	}

	// Return a deep copy to prevent modification of the original preset
	return preset, true
}

// ListStealthPresets returns available stealth preset names
func ListStealthPresets() []string {
	presets := make([]string, 0, len(EnterpriseStealthPresets))
	for name := range EnterpriseStealthPresets {
		presets = append(presets, name)
	}
	return presets
}
