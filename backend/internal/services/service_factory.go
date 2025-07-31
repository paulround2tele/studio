package services

import (
	"fmt"
	"log"

	"github.com/fntelecomllc/studio/backend/internal/cache"
	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/httpvalidator"
	"github.com/fntelecomllc/studio/backend/internal/keywordscanner"
	"github.com/fntelecomllc/studio/backend/internal/proxymanager"
	"github.com/fntelecomllc/studio/backend/internal/store"
	"github.com/jmoiron/sqlx"
)

// ServiceFactory creates optimized service instances based on configuration
type ServiceFactory struct {
	config       config.OptimizationConfig
	featureFlags *FeatureFlagService
	cache        cache.Cache
	db           *sqlx.DB
}

// NewServiceFactory creates a new service factory with optimization support
func NewServiceFactory(
	db *sqlx.DB,
	optimizationConfig config.OptimizationConfig,
	cache cache.Cache,
) (*ServiceFactory, error) {

	featureFlags := NewFeatureFlagService(optimizationConfig.FeatureFlags)

	return &ServiceFactory{
		config:       optimizationConfig,
		featureFlags: featureFlags,
		cache:        cache,
		db:           db,
	}, nil
}

// ServiceConfiguration holds the dependencies needed for service creation
type ServiceConfiguration struct {
	CampaignStore    store.CampaignStore
	PersonaStore     store.PersonaStore
	KeywordStore     store.KeywordStore
	ProxyStore       store.ProxyStore
	AuditLogStore    store.AuditLogStore
	CampaignJobStore store.CampaignJobStore
	AppConfig        *config.AppConfig
}

// CreateOptimizedDNSCampaignService creates a DNS campaign service with appropriate optimizations
func (sf *ServiceFactory) CreateOptimizedDNSCampaignService(
	serviceConfig ServiceConfiguration,
	identifier string,
) (DNSCampaignService, error) {

	optimizationLevel := sf.featureFlags.GetOptimizationLevel(identifier)

	if sf.config.FeatureFlags.DebugLogging {
		log.Printf("ServiceFactory: Creating DNS campaign service with optimizations: %+v", optimizationLevel)
	}

	// PHASE 4 CACHING: Use enhanced service with Redis cache if caching is enabled
	if sf.config.Phases.Caching && optimizationLevel.Caching && sf.cache != nil {
		if sf.config.FeatureFlags.DebugLogging {
			log.Printf("ServiceFactory: Creating DNS campaign service with Redis cache integration")
		}

		// Convert generic cache to RedisCache interface
		if redisCache, ok := sf.cache.(cache.RedisCache); ok {
			service := NewDNSCampaignServiceWithCache(
				sf.db,
				serviceConfig.CampaignStore,
				serviceConfig.PersonaStore,
				serviceConfig.AuditLogStore,
				serviceConfig.CampaignJobStore,
				serviceConfig.AppConfig,
				redisCache,
				&sf.config,
			)
			return service, nil
		} else {
			if sf.config.FeatureFlags.DebugLogging {
				log.Printf("ServiceFactory: Cache is not RedisCache type, falling back to regular service")
			}
		}
	}

	// Fall back to regular service without cache
	if sf.config.FeatureFlags.DebugLogging {
		log.Printf("ServiceFactory: Creating standard DNS campaign service (no cache)")
	}

	service := NewDNSCampaignService(
		sf.db,
		serviceConfig.CampaignStore,
		serviceConfig.PersonaStore,
		serviceConfig.AuditLogStore,
		serviceConfig.CampaignJobStore,
		serviceConfig.AppConfig,
	)

	return service, nil
}

// CreateOptimizedHTTPCampaignService creates an HTTP campaign service with appropriate optimizations
func (sf *ServiceFactory) CreateOptimizedHTTPCampaignService(
	serviceConfig ServiceConfiguration,
	identifier string,
	httpValidator *httpvalidator.HTTPValidator,
	keywordScanner *keywordscanner.Service,
	proxyManager *proxymanager.ProxyManager,
) (HTTPKeywordCampaignService, error) {

	optimizationLevel := sf.featureFlags.GetOptimizationLevel(identifier)

	if sf.config.FeatureFlags.DebugLogging {
		log.Printf("ServiceFactory: Creating HTTP campaign service with optimizations: %+v", optimizationLevel)
	}

	// PHASE 4 CACHING: Use enhanced service with Redis cache if caching is enabled
	if sf.config.Phases.Caching && optimizationLevel.Caching && sf.cache != nil {
		if sf.config.FeatureFlags.DebugLogging {
			log.Printf("ServiceFactory: Creating HTTP campaign service with Redis cache integration")
		}

		// Convert generic cache to RedisCache interface
		if redisCache, ok := sf.cache.(cache.RedisCache); ok {
			service := NewHTTPKeywordCampaignServiceWithCache(
				sf.db,
				serviceConfig.CampaignStore,
				serviceConfig.PersonaStore,
				serviceConfig.ProxyStore,
				serviceConfig.KeywordStore,
				serviceConfig.AuditLogStore,
				serviceConfig.CampaignJobStore,
				httpValidator,
				keywordScanner,
				proxyManager,
				serviceConfig.AppConfig,
				redisCache,
				&sf.config,
			)
			return service, nil
		} else {
			if sf.config.FeatureFlags.DebugLogging {
				log.Printf("ServiceFactory: Cache is not RedisCache type, falling back to regular service")
			}
		}
	}

	// Fall back to regular service without cache
	if sf.config.FeatureFlags.DebugLogging {
		log.Printf("ServiceFactory: Creating standard HTTP campaign service (no cache)")
	}

	service := NewHTTPKeywordCampaignService(
		sf.db,
		serviceConfig.CampaignStore,
		serviceConfig.PersonaStore,
		serviceConfig.ProxyStore,
		serviceConfig.KeywordStore,
		serviceConfig.AuditLogStore,
		serviceConfig.CampaignJobStore,
		httpValidator,
		keywordScanner,
		proxyManager,
		serviceConfig.AppConfig,
	)

	return service, nil
}

// CreateOptimizedDomainGenerationService creates a domain generation service with appropriate optimizations
func (sf *ServiceFactory) CreateOptimizedDomainGenerationService(
	serviceConfig ServiceConfiguration,
	identifier string,
	configManager ConfigManagerInterface,
) (DomainGenerationService, error) {

	optimizationLevel := sf.featureFlags.GetOptimizationLevel(identifier)

	if sf.config.FeatureFlags.DebugLogging {
		log.Printf("ServiceFactory: Creating domain generation service with optimizations: %+v", optimizationLevel)
	}

	// PHASE 4 CACHING: Use enhanced service with Redis cache if caching is enabled
	if sf.config.Phases.Caching && optimizationLevel.Caching && sf.cache != nil {
		if sf.config.FeatureFlags.DebugLogging {
			log.Printf("ServiceFactory: Creating domain generation service with Redis cache integration")
		}

		// Convert generic cache to RedisCache interface
		if redisCache, ok := sf.cache.(cache.RedisCache); ok {
			service := NewDomainGenerationServiceWithCache(
				sf.db,
				serviceConfig.CampaignStore,
				serviceConfig.CampaignJobStore,
				serviceConfig.AuditLogStore,
				configManager,
				redisCache,
				&sf.config,
			)
			return service, nil
		} else {
			if sf.config.FeatureFlags.DebugLogging {
				log.Printf("ServiceFactory: Cache is not RedisCache type, falling back to regular service")
			}
		}
	}

	// Fall back to regular service without cache
	if sf.config.FeatureFlags.DebugLogging {
		log.Printf("ServiceFactory: Creating standard domain generation service (no cache)")
	}

	service := NewDomainGenerationService(
		sf.db,
		serviceConfig.CampaignStore,
		serviceConfig.CampaignJobStore,
		serviceConfig.AuditLogStore,
		configManager,
	)

	return service, nil
}

// CreateOptimizedAnalysisService creates an analysis service with appropriate optimizations
func (sf *ServiceFactory) CreateOptimizedAnalysisService(
	serviceConfig ServiceConfiguration,
	identifier string,
) (AnalysisService, error) {

	optimizationLevel := sf.featureFlags.GetOptimizationLevel(identifier)

	if sf.config.FeatureFlags.DebugLogging {
		log.Printf("ServiceFactory: Creating analysis service with optimizations: %+v", optimizationLevel)
	}

	// PHASE 4 CACHING: Use enhanced service with Redis cache if caching is enabled
	if sf.config.Phases.Caching && optimizationLevel.Caching && sf.cache != nil {
		if sf.config.FeatureFlags.DebugLogging {
			log.Printf("ServiceFactory: Creating analysis service with Redis cache integration")
		}

		// Convert generic cache to RedisCache interface
		if redisCache, ok := sf.cache.(cache.RedisCache); ok {
			service := NewAnalysisServiceWithCache(
				serviceConfig.CampaignStore,
				sf.db,
				redisCache,
				&sf.config,
			)
			return service, nil
		} else {
			if sf.config.FeatureFlags.DebugLogging {
				log.Printf("ServiceFactory: Cache is not RedisCache type, falling back to regular service")
			}
		}
	}

	// Fall back to regular service without cache
	if sf.config.FeatureFlags.DebugLogging {
		log.Printf("ServiceFactory: Creating standard analysis service (no cache)")
	}

	service := NewAnalysisService(
		serviceConfig.CampaignStore,
		sf.db,
	)

	return service, nil
}

// CreateOptimizedStores creates optimized store instances based on configuration
func (sf *ServiceFactory) CreateOptimizedStores(baseStores ServiceConfiguration) ServiceConfiguration {
	optimizedConfig := baseStores

	// Apply caching layer to stores if enabled
	if sf.config.Phases.Caching && sf.cache != nil {
		if sf.config.FeatureFlags.DebugLogging {
			log.Printf("ServiceFactory: Creating cached store implementations")
		}

		// Note: In a complete implementation, these would wrap the base stores with cached versions
		// For example:
		// optimizedConfig.PersonaStore = cached.NewCachedPersonaStore(baseStores.PersonaStore, sf.cache)
		// optimizedConfig.KeywordStore = cached.NewCachedKeywordStore(baseStores.KeywordStore, sf.cache)
		// optimizedConfig.ProxyStore = cached.NewCachedProxyStore(baseStores.ProxyStore, sf.cache)
	}

	return optimizedConfig
}

// GetOptimizationStatus returns the current optimization status for debugging
func (sf *ServiceFactory) GetOptimizationStatus(identifier string) OptimizationStatus {
	optimizationLevel := sf.featureFlags.GetOptimizationLevel(identifier)

	return OptimizationStatus{
		Enabled:           sf.config.Enabled,
		OptimizationLevel: optimizationLevel,
		CacheAvailable:    sf.cache != nil,
		FeatureFlagConfig: sf.config.FeatureFlags,
		PhaseConfig:       sf.config.Phases,
	}
}

// OptimizationStatus provides detailed status of optimization features
type OptimizationStatus struct {
	Enabled           bool                     `json:"enabled"`
	OptimizationLevel OptimizationLevel        `json:"optimizationLevel"`
	CacheAvailable    bool                     `json:"cacheAvailable"`
	FeatureFlagConfig config.FeatureFlagConfig `json:"featureFlagConfig"`
	PhaseConfig       config.PhaseConfig       `json:"phaseConfig"`
}

// HealthCheck performs health checks on optimization components
func (sf *ServiceFactory) HealthCheck() map[string]interface{} {
	health := make(map[string]interface{})

	// Check optimization configuration
	health["optimization_enabled"] = sf.config.Enabled
	health["phases"] = map[string]bool{
		"batch_queries":        sf.config.Phases.BatchQueries,
		"service_optimization": sf.config.Phases.ServiceOptimization,
		"external_validation":  sf.config.Phases.ExternalValidation,
		"caching":              sf.config.Phases.Caching,
	}

	// Check cache health
	if sf.cache != nil {
		health["cache_available"] = true
		// Note: In a complete implementation, this would ping the cache
		// health["cache_status"] = sf.cache.Ping()
	} else {
		health["cache_available"] = false
	}

	// Check feature flags
	health["feature_flags"] = map[string]interface{}{
		"gradual_rollout":    sf.config.FeatureFlags.GradualRollout,
		"rollout_percentage": sf.config.FeatureFlags.RolloutPercentage,
		"fallback_on_error":  sf.config.FeatureFlags.FallbackOnError,
		"debug_logging":      sf.config.FeatureFlags.DebugLogging,
	}

	return health
}

// UpdateConfiguration updates the optimization configuration at runtime
func (sf *ServiceFactory) UpdateConfiguration(newConfig config.OptimizationConfig) error {
	if err := newConfig.Redis.Validate(); err != nil {
		return fmt.Errorf("invalid Redis configuration: %w", err)
	}

	sf.config = newConfig
	sf.featureFlags.UpdateConfig(newConfig.FeatureFlags)

	if newConfig.FeatureFlags.DebugLogging {
		log.Printf("ServiceFactory: Configuration updated successfully")
	}

	return nil
}

// ShouldUseOptimization checks if optimizations should be used for a given identifier
func (sf *ServiceFactory) ShouldUseOptimization(identifier string) bool {
	if !sf.config.Enabled {
		return false
	}

	return sf.featureFlags.ShouldUseOptimization(identifier)
}

// GetFeatureFlagService returns the feature flag service for external use
func (sf *ServiceFactory) GetFeatureFlagService() *FeatureFlagService {
	return sf.featureFlags
}

// CreateFallbackService creates a non-optimized service for fallback scenarios
func (sf *ServiceFactory) CreateFallbackService(serviceType string, serviceConfig ServiceConfiguration) (interface{}, error) {
	switch serviceType {
	case "dns_campaign":
		return NewDNSCampaignService(
			sf.db,
			serviceConfig.CampaignStore,
			serviceConfig.PersonaStore,
			serviceConfig.AuditLogStore,
			serviceConfig.CampaignJobStore,
			serviceConfig.AppConfig,
		), nil
	default:
		return nil, fmt.Errorf("unknown service type: %s", serviceType)
	}
}
