// Package main provides the API server for the Domain Flow application.
//
//	@title			Domain Flow API
//	@version		1.0
//	@description	A comprehensive API for domain generation, validation, and management operations.
//	@termsOfService	http://swagger.io/terms/
//
//	@contact.name	API Support
//	@contact.url	http://www.swagger.io/support
//	@contact.email	support@swagger.io
//
//	@license.name	Apache 2.0
//	@license.url	http://www.apache.org/licenses/LICENSE-2.0.html
//
//	@BasePath	/api/v2
//
//	@securityDefinitions.basic	BasicAuth
//
//	@externalDocs.description	OpenAPI
//	@externalDocs.url			https://swagger.io/resources/open-api/
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	// REMOVED: api_pkg "github.com/fntelecomllc/studio/backend/api"  // Custom reflection system - no longer needed
	"github.com/fntelecomllc/studio/backend/internal/api"
	"github.com/fntelecomllc/studio/backend/internal/application"
	"github.com/fntelecomllc/studio/backend/internal/cache"
	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/contentfetcher"
	"github.com/fntelecomllc/studio/backend/internal/dnsvalidator"
	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	"github.com/fntelecomllc/studio/backend/internal/httpvalidator"

	// "github.com/fntelecomllc/studio/backend/internal/keywordscanner"  // PHASE 4.4: Wrapped by domain services
	"github.com/fntelecomllc/studio/backend/internal/middleware"
	"github.com/fntelecomllc/studio/backend/internal/monitoring"
	"github.com/fntelecomllc/studio/backend/internal/proxymanager"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/store"
	pg_store "github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/fntelecomllc/studio/backend/internal/websocket"
	"github.com/fntelecomllc/studio/backend/pkg/architecture"

	// "github.com/fntelecomllc/studio/backend/pkg/communication"  // PHASE 4.4: No longer needed
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	// REMOVED: "gopkg.in/yaml.v3"  // No longer needed without custom reflection

	// Swaggo imports for professional OpenAPI generation
	_ "github.com/fntelecomllc/studio/backend/docs" // Generated docs package
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// SimpleLogger implements the Logger interface for domain services
type SimpleLogger struct{}

func (l *SimpleLogger) Debug(ctx context.Context, msg string, fields map[string]interface{}) {
	log.Printf("[DEBUG] %s %v", msg, fields)
}

func (l *SimpleLogger) Info(ctx context.Context, msg string, fields map[string]interface{}) {
	log.Printf("[INFO] %s %v", msg, fields)
}

func (l *SimpleLogger) Warn(ctx context.Context, msg string, fields map[string]interface{}) {
	log.Printf("[WARN] %s %v", msg, fields)
}

func (l *SimpleLogger) Error(ctx context.Context, msg string, err error, fields map[string]interface{}) {
	log.Printf("[ERROR] %s: %v %v", msg, err, fields)
}

const (
	dbTypePostgres    = "postgres"
	defaultNumWorkers = 5
)

func main() {
	log.Println("Starting DomainFlow API Server...")

	// Load .env file from project root with multiple path attempts
	envPaths := []string{
		".env",                      // Current directory (when run from studio root)
		filepath.Join("..", ".env"), // Parent directory (when run from backend dir)
		filepath.Join(".", ".env"),  // Explicit current directory
	}

	envLoaded := false
	for _, envPath := range envPaths {
		if err := godotenv.Load(envPath); err == nil {
			log.Printf("Successfully loaded environment variables from %s", envPath)
			envLoaded = true
			break
		}
	}

	if !envLoaded {
		log.Println("Warning: Could not load .env file from any expected location")
		log.Println("Continuing with system environment variables...")
	}

	// Load configuration with environment variable support
	appConfig, err := config.LoadWithEnv("")
	if err != nil {
		log.Printf("Warning: Failed to load config file: %v", err)
		log.Println("Using environment variables and defaults...")
		// Create minimal config from environment
		if envConfig, err := config.LoadWithEnv(""); err != nil {
			log.Printf("Warning: Failed to load environment variables: %v", err)
			appConfig = &config.AppConfig{}
		} else {
			appConfig = envConfig
		}
	}

	// Initialize optimization configuration if not set
	if appConfig.Optimization.Enabled == false && appConfig.Optimization.Phases.BatchQueries == false {
		// Set default optimization configuration based on environment
		environment := os.Getenv("ENVIRONMENT")
		switch environment {
		case "development":
			appConfig.Optimization = config.GetDevelopmentOptimizationConfig()
		case "staging":
			appConfig.Optimization = config.GetStagingOptimizationConfig()
		case "production":
			appConfig.Optimization = config.GetProductionOptimizationConfig()
		default:
			appConfig.Optimization = config.GetDefaultOptimizationConfig()
		}
		log.Printf("Optimization configuration initialized for environment: %s", environment)
	}

	log.Println("Configuration loaded with environment overrides.")
	log.Printf("Optimization enabled: %v (phases: batch=%v, service=%v, external=%v, caching=%v)",
		appConfig.Optimization.Enabled,
		appConfig.Optimization.Phases.BatchQueries,
		appConfig.Optimization.Phases.ServiceOptimization,
		appConfig.Optimization.Phases.ExternalValidation,
		appConfig.Optimization.Phases.Caching)

	wsBroadcaster := websocket.InitGlobalBroadcaster()
	log.Println("Global WebSocket broadcaster initialized and started.")

	// Initialize PostgreSQL database connection
	log.Println("Initializing PostgreSQL database connection...")

	var campaignStore store.CampaignStore
	var personaStore store.PersonaStore
	var proxyStore store.ProxyStore
	var proxyPoolStore store.ProxyPoolStore
	var keywordStore store.KeywordStore
	var auditLogStore store.AuditLogStore
	var campaignJobStore store.CampaignJobStore
	var db *sqlx.DB

	// Use database configuration from enhanced config
	var dsn string
	if appConfig.Server.DatabaseConfig != nil {
		dsn = config.GetDatabaseDSN(appConfig.Server.DatabaseConfig)
	} else {
		// Load database configuration from environment variables only
		dbHost := os.Getenv("DB_HOST")
		dbPort := os.Getenv("DB_PORT")
		dbUser := os.Getenv("DB_USER")
		dbPassword := os.Getenv("DB_PASSWORD")
		dbName := os.Getenv("DB_NAME")
		dbSSLMode := os.Getenv("DB_SSLMODE")

		// Validate required environment variables
		if dbHost == "" {
			log.Fatal("FATAL: DB_HOST environment variable is required")
		}
		if dbPort == "" {
			log.Fatal("FATAL: DB_PORT environment variable is required")
		}
		if dbUser == "" {
			log.Fatal("FATAL: DB_USER environment variable is required")
		}
		if dbPassword == "" {
			log.Fatal("FATAL: DB_PASSWORD environment variable is required")
		}
		if dbName == "" {
			log.Fatal("FATAL: DB_NAME environment variable is required")
		}
		if dbSSLMode == "" {
			dbSSLMode = "disable" // Only this can have a reasonable default
		}

		dsn = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			dbHost, dbPort, dbUser, dbPassword, dbName, dbSSLMode)
	}

	log.Printf("Connecting to database: host=%s port=%s user=%s dbname=%s sslmode=%s",
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"), os.Getenv("DB_NAME"), os.Getenv("DB_SSLMODE"))

	var pgErr error
	db, pgErr = sqlx.Connect("postgres", dsn)
	if pgErr != nil {
		log.Fatalf("FATAL: Could not connect to PostgreSQL database: %v", pgErr)
	}
	defer db.Close()

	db.SetMaxOpenConns(appConfig.Server.DBMaxOpenConns)
	db.SetMaxIdleConns(appConfig.Server.DBMaxIdleConns)
	db.SetConnMaxLifetime(time.Duration(appConfig.Server.DBConnMaxLifetimeMinutes) * time.Minute)
	log.Println("Successfully connected to PostgreSQL database.")

	campaignStore = pg_store.NewCampaignStorePostgres(db)
	personaStore = pg_store.NewPersonaStorePostgres(db)
	proxyStore = pg_store.NewProxyStorePostgres(db)
	proxyPoolStore = pg_store.NewProxyPoolStorePostgres(db)
	keywordStore = pg_store.NewKeywordStorePostgres(db)
	auditLogStore = pg_store.NewAuditLogStorePostgres(db)
	campaignJobStore = pg_store.NewCampaignJobStorePostgres(db)
	log.Println("PostgreSQL-backed stores initialized.")

	// Initialize campaign state service for WebSocket state sync
	websocket.InitializeCampaignStateService(campaignStore, db)
	log.Println("Campaign state service initialized for WebSocket state sync.")

	pmCfg := appConfig.ProxyManager
	if pmCfg.TestTimeout == 0 {
		if appConfig.HTTPValidator.RequestTimeoutSeconds > 0 {
			pmCfg.TestTimeout = time.Duration(appConfig.HTTPValidator.RequestTimeoutSeconds) * time.Second
		} else {
			pmCfg.TestTimeout = 30 * time.Second
		}
	}
	proxyMgr := proxymanager.NewProxyManager(appConfig.Proxies, pmCfg, proxyStore, db)
	log.Println("ProxyManager initialized.")

	// Phase 2.5 & 3.9: Initialize engines directly for Phase Execution Service
	httpValSvc := httpvalidator.NewHTTPValidator(appConfig)
	log.Println("HTTPValidator engine initialized.")

	// PHASE 4.4: Legacy engine services REMOVED - now wrapped by domain services
	/*
		kwordScannerSvc := keywordscanner.NewService(keywordStore)
		log.Println("KeywordScanner engine initialized.")
	*/

	// Initialize additional engines required for direct integration
	dnsValSvc := dnsvalidator.New(appConfig.DNSValidator)
	log.Println("DNSValidator engine initialized.")

	contentFetcherSvc := contentfetcher.NewContentFetcher(appConfig, proxyMgr)
	log.Println("ContentFetcher engine initialized.")

	// Note: DomainGenerator will be created per-campaign based on generation parameters

	// Initialize session service for session-based authentication with environment-aware settings
	environment := os.Getenv("ENVIRONMENT")
	if environment == "" {
		environment = "development" // Default to development for localhost
	}

	sessionConfigManager := config.NewSessionConfigManager(environment)
	sessionConfig := sessionConfigManager.GetSettings()
	log.Printf("Using session configuration for environment: %s (CookieSecure: %v, CookieDomain: '%s', CookieName: '%s')",
		environment, sessionConfig.CookieSecure, sessionConfig.CookieDomain, sessionConfig.CookieName)

	sessionService, err := services.NewSessionService(db, sessionConfig.ToServiceConfig(), auditLogStore)
	if err != nil {
		log.Fatalf("FATAL: Failed to initialize session service: %v", err)
	}
	log.Println("Session service initialized.")

	// Initialize DomainGenerationService with global offset tracking
	domainGenerationService := services.NewDomainGenerationService(db, campaignStore, campaignJobStore, auditLogStore, nil)
	log.Println("DomainGenerationService initialized with global offset tracking.")

	// Initialize DNS and HTTP Campaign Services for service layer architecture
	// PHASE 4.4: Legacy validation services REMOVED - replaced by domain services in orchestrator

	// Phase 4: Initialize NEW Domain Services (orchestrate existing engines)
	// Create simple logger for domain services
	simpleLogger := &SimpleLogger{}

	domainServiceDeps := domainservices.Dependencies{
		EventBus: nil, // TODO: Implement EventBus if needed
		Logger:   simpleLogger,
	}

	// Create domain generation service (NO stealth - needs global offset tracking)
	newDomainGenerationSvc := domainservices.NewDomainGenerationService(campaignStore, domainServiceDeps)

	// Create standard validation services
	standardDnsValidationSvc := domainservices.NewDNSValidationService(dnsValSvc, campaignStore, domainServiceDeps)
	standardHttpValidationSvc := domainservices.NewHTTPValidationService(campaignStore, domainServiceDeps, httpValSvc)
	newAnalysisSvc := domainservices.NewAnalysisService(campaignStore, domainServiceDeps, contentFetcherSvc)

	// Initialize stealth integration service
	stealthIntegration := services.NewStealthIntegrationService(
		db,
		campaignStore,
		nil, // Legacy DNS service interface - not needed for new architecture
		nil, // Legacy HTTP service interface - not needed for new architecture
	)

	// Create stealth-aware validation services (wrapping standard services)
	stealthAwareDnsValidationSvc := domainservices.NewStealthAwareDNSValidationService(
		standardDnsValidationSvc,
		stealthIntegration,
	)

	stealthAwareHttpValidationSvc := domainservices.NewStealthAwareHTTPValidationService(
		standardHttpValidationSvc,
		stealthIntegration,
	)

	// Enable stealth mode by default for validation services
	// This provides domain randomization and temporal jitter to avoid detection
	defaultStealthConfig := services.DefaultStealthConfig()
	stealthAwareDnsValidationSvc.EnableStealthMode(defaultStealthConfig)
	stealthAwareHttpValidationSvc.EnableStealthMode(defaultStealthConfig)

	log.Println("Phase 4 Domain Services initialized - standard services with stealth-aware validation wrappers.")
	log.Println("Stealth mode enabled for DNS and HTTP validation - detection avoidance active.")

	// Initialize SSE service for real-time communication
	sseService := services.NewSSEService()
	log.Println("SSE service initialized for real-time campaign progress broadcasting.")

	// Create new CampaignOrchestrator using domain services
	// Domain generation: standard service (needs global offset)
	// Validation services: stealth-aware services for detection avoidance
	campaignOrchestrator := application.NewCampaignOrchestrator(
		campaignStore,
		domainServiceDeps,
		newDomainGenerationSvc,        // NO stealth - maintains global offset
		stealthAwareDnsValidationSvc,  // Stealth-aware DNS validation
		stealthAwareHttpValidationSvc, // Stealth-aware HTTP validation
		newAnalysisSvc,                // Analysis service (TODO: consider stealth for content extraction)
		sseService,                    // SSE service for real-time updates
	)
	log.Println("Phase 4 CampaignOrchestrator initialized with SSE broadcasting - ready to replace legacy services.")

	// Week 2 Day 3: Initialize Monitoring Service for real-time dashboard integration
	log.Println("Initializing monitoring service...")
	monitoringConfig := monitoring.DefaultMonitoringConfig()
	monitoringService := monitoring.NewMonitoringService(monitoringConfig)

	// Add default alert handler (log alerts)
	monitoringService.AddAlertHandler(monitoring.DefaultLogAlertHandler)

	// Week 2 Day 4: Initialize cleanup service
	log.Println("Initializing cleanup service...")
	cleanupConfig := monitoring.DefaultCleanupConfig()
	cleanupService := monitoring.NewCleanupService(monitoringService.ResourceMonitor, monitoringService, cleanupConfig)

	// Start monitoring service (will use context from below)
	defer func() {
		if monitoringService.IsRunning() {
			monitoringService.Stop()
		}
		if cleanupService.IsRunning() {
			cleanupService.Stop()
		}
	}()
	log.Println("✓ Monitoring and cleanup services initialized")

	// Phase 4 CampaignOrchestrator now fully integrated with API handlers

	// Async pattern manager removed - no longer needed after CampaignOrchestratorService elimination

	archRegistry := architecture.NewServiceRegistry(db.DB)
	if err := services.RegisterServiceContracts(archRegistry); err != nil {
		log.Printf("Warning: failed to register service contracts: %v", err)
	}

	// CampaignOrchestratorService eliminated - replaced by PhaseExecutionService

	serverInstanceID, _ := os.Hostname()
	if serverInstanceID == "" {
		serverInstanceID = uuid.NewString()
	}
	workerService := services.NewCampaignWorkerService(
		campaignJobStore,
		campaignOrchestrator, // NEW: Use Phase 4 orchestrator instead of legacy service
		serverInstanceID,
		appConfig,
		db,
	)
	log.Println("CampaignWorkerService initialized with Phase 4 orchestrator.")

	apiHandler := api.NewAPIHandler(
		appConfig,
		db,
		proxyMgr,
		campaignStore,
		personaStore,
		proxyStore,
		proxyPoolStore,
		keywordStore,
		auditLogStore,
		campaignJobStore,
	)
	log.Println("Main APIHandler initialized.")

	campaignOrchestratorAPIHandler := api.NewCampaignOrchestratorAPIHandler(
		campaignOrchestrator, // NEW: Use Phase 4 orchestrator instead of legacy service
		domainGenerationService,
		campaignStore,
		wsBroadcaster,
		db)
	log.Println("CampaignOrchestratorAPIHandler initialized with Phase 4 orchestrator.")

	// Initialize enterprise-scale bulk operations handlers (properly separated)
	bulkDomainsAPIHandler := api.NewBulkDomainsAPIHandler(campaignOrchestrator, sseService)
	bulkValidationAPIHandler := api.NewBulkValidationAPIHandler(campaignOrchestrator, sseService)
	bulkAnalyticsAPIHandler := api.NewBulkAnalyticsAPIHandler(campaignOrchestrator)
	bulkResourcesAPIHandler := api.NewBulkResourcesAPIHandler(campaignOrchestrator)
	log.Println("Bulk domains and validation handlers initialized with SSE integration for real-time updates.")

	// Week 2 Day 3: Initialize Monitoring API Handler
	monitoringAPIHandler := api.NewMonitoringHandlers(monitoringService, cleanupService)
	log.Println("✓ Monitoring API handler initialized for real-time dashboard integration.")

	webSocketAPIHandler := api.NewWebSocketHandler(wsBroadcaster, sessionService)
	log.Println("WebSocketAPIHandler initialized.")

	// Initialize high-performance distributed cache manager first (needed by auth handlers)
	cacheConfig := cache.CacheConfig{
		MaxMemoryMB:            100,
		DefaultTTL:             5 * time.Minute,
		CampaignDataTTL:        10 * time.Minute,
		BulkOperationTTL:       15 * time.Minute,
		ValidationDataTTL:      5 * time.Minute,
		EnableHotDataPreload:   true,
		HotDataRefreshInterval: 2 * time.Minute,
		MaxHotCampaigns:        50,
		CleanupInterval:        30 * time.Second,
	}
	cacheManager, err := cache.NewDistributedCacheManager(cacheConfig)
	if err != nil {
		log.Fatalf("Failed to initialize DistributedCacheManager: %v", err)
	}
	log.Println("DistributedCacheManager initialized with in-memory distributed caching.")

	// Initialize Redis cache for N+1 optimization if enabled
	var optimizationCache cache.Cache
	if appConfig.Optimization.Enabled && appConfig.Optimization.Phases.Caching && appConfig.Optimization.Redis.Enabled {
		log.Println("Initializing Redis cache for N+1 optimization...")

		// Convert config package's RedisCacheConfig to cache package's RedisCacheConfig
		redisCacheConfig := cache.RedisCacheConfig{
			RedisAddr:            appConfig.Optimization.Redis.Addr,
			RedisPassword:        appConfig.Optimization.Redis.Password,
			RedisDB:              appConfig.Optimization.Redis.DB,
			DefaultTTL:           appConfig.Optimization.Performance.CacheTTL.Personas,
			MaxRetries:           appConfig.Optimization.Redis.MaxRetries,
			PoolSize:             appConfig.Optimization.Redis.PoolSize,
			MinIdleConns:         appConfig.Optimization.Redis.MinIdleConns,
			IdleTimeout:          appConfig.Optimization.Redis.IdleTimeout,
			ConnMaxLifetime:      appConfig.Optimization.Redis.ConnMaxLifetime,
			DialTimeout:          appConfig.Optimization.Redis.DialTimeout,
			ReadTimeout:          appConfig.Optimization.Redis.ReadTimeout,
			WriteTimeout:         appConfig.Optimization.Redis.WriteTimeout,
			EnableMetrics:        appConfig.Optimization.Redis.Metrics.Enabled,
			MetricsFlushInterval: appConfig.Optimization.Redis.Metrics.FlushInterval,
		}

		redisCache, redisErr := cache.NewRedisCache(redisCacheConfig)
		if redisErr != nil {
			if appConfig.Optimization.FeatureFlags.FallbackOnError {
				log.Printf("Warning: Failed to initialize Redis cache, falling back to no caching: %v", redisErr)
				optimizationCache = nil
			} else {
				log.Fatalf("Failed to initialize Redis cache: %v", redisErr)
			}
		} else {
			optimizationCache = redisCache
			log.Println("Redis cache for N+1 optimization initialized successfully.")
		}
	} else {
		log.Println("Redis cache for N+1 optimization disabled in configuration.")
	}

	// Initialize optimization service factory
	serviceFactory, factoryErr := services.NewServiceFactory(db, appConfig.Optimization, optimizationCache)
	if factoryErr != nil {
		log.Fatalf("Failed to initialize service factory: %v", factoryErr)
	}
	log.Printf("Service factory initialized with optimization support (enabled: %v)", appConfig.Optimization.Enabled)

	// Store service factory for use in handlers if needed
	_ = serviceFactory // Mark as used for now

	// Initialize authentication and security handlers with user profile caching
	authHandler := api.NewAuthHandler(sessionService, sessionConfig, db, cacheManager)
	log.Println("AuthHandler initialized with user profile caching.")

	// Convert SessionSettings to SessionConfig for service compatibility
	sessionServiceConfig := sessionConfig.ToServiceConfig()

	// Initialize high-performance cached session service
	cachedSessionService, err := services.NewCachedSessionService(
		db,
		sessionServiceConfig,
		auditLogStore,
		cacheManager,
		services.DefaultCachedSessionConfig(),
	)
	if err != nil {
		log.Fatalf("Failed to initialize CachedSessionService: %v", err)
	}
	log.Println("CachedSessionService initialized with distributed caching.")

	// Initialize optimized middleware with caching
	authMiddleware := middleware.NewCachedAuthMiddleware(cachedSessionService, sessionConfig)
	securityMiddleware := middleware.NewSecurityMiddleware()
	rateLimitMiddleware := middleware.NewRateLimitMiddleware(db, appConfig.RateLimiter)
	log.Println("High-performance cached auth middleware initialized.")

	// Initialize health check handler
	healthCheckHandler := api.NewHealthCheckHandler(db.DB)
	log.Println("HealthCheckHandler initialized.")

	// Initialize database handler
	databaseHandler := api.NewDatabaseHandler(apiHandler)
	log.Println("DatabaseHandler initialized.")

	appCtx, appCancel := context.WithCancel(context.Background())
	defer appCancel()

	// Week 2 Day 3: Start monitoring service with proper context
	if err := monitoringService.Start(appCtx, monitoringConfig); err != nil {
		log.Printf("Warning: Failed to start monitoring service: %v", err)
	} else {
		log.Println("✓ Monitoring service started successfully")
	}

	// Week 2 Day 4: Start cleanup service
	if err := cleanupService.Start(appCtx); err != nil {
		log.Printf("Warning: Failed to start cleanup service: %v", err)
	} else {
		log.Println("✓ Cleanup service started successfully")
	}

	// Week 2 Day 3: Set up global monitoring integration for easy campaign tracking
	campaignMonitoringIntegration := monitoring.NewCampaignMonitoringIntegration(monitoringService)
	monitoring.SetGlobalMonitoringIntegration(campaignMonitoringIntegration)
	log.Println("✓ Global monitoring integration configured for campaigns")

	numWorkers := appConfig.Worker.NumWorkers
	if numWorkers <= 0 {
		numWorkers = defaultNumWorkers
	}
	go workerService.StartWorkers(appCtx, numWorkers)

	gin.SetMode(appConfig.Server.GinMode)
	router := gin.Default()

	// Apply basic security middleware to all routes
	router.Use(securityMiddleware.SecurityHeaders())
	router.Use(securityMiddleware.EnhancedCORS())

	// Basic CORS configuration for development
	log.Println("Backend configured for development with CORS support")

	// Add validation middleware for request/response validation
	router.Use(middleware.ValidateRequestMiddleware())
	router.Use(middleware.ValidateResponseMiddleware())

	// Create a middleware group for non-WebSocket routes that need request size limits
	nonWSMiddleware := func() gin.HandlerFunc {
		return gin.HandlerFunc(func(c *gin.Context) {
			// Skip request size limit for WebSocket upgrade requests
			if c.Request.URL.Path == "/api/v2/ws" {
				c.Next()
				return
			}
			// Apply request size limit for other routes
			securityMiddleware.RequestSizeLimit(10 * 1024 * 1024)(c)
		})
	}

	router.Use(nonWSMiddleware())
	// No general API rate limiting - maximizing performance for sonic speed!
	// Only login endpoints have rate limiting for security (brute force protection)

	// WebSocket route (registered early to avoid middleware conflicts)
	router.GET("/api/v2/ws", webSocketAPIHandler.HandleConnections)
	log.Println("Registered WebSocket route under /api/v2/ws.")

	// Public routes (no authentication required)
	router.GET("/ping", api.PingHandlerGin)

	// OpenAPI 3.0 specification and Swagger UI (public) - generated by swaggo
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	router.StaticFile("/api/openapi.yaml", "backend/docs/swagger.yaml")
	router.StaticFile("/api/openapi.json", "backend/docs/swagger.json")
	log.Println("Registered Swagger UI at /swagger/ and OpenAPI specs at /api/openapi.yaml and /api/openapi.json")

	// Authentication routes under /api/v2 for consistency
	authRoutesV2 := router.Group("/api/v2/auth")
	{
		authRoutesV2.POST("/login", rateLimitMiddleware.LoginRateLimit(), authHandler.Login)
		authRoutesV2.POST("/logout", authHandler.Logout)
		authRoutesV2.POST("/refresh", authHandler.RefreshSession)

		// Protected auth routes - require session authentication
		authRoutesV2.GET("/me", authMiddleware.FastSessionAuth(), authHandler.Me)
		authRoutesV2.POST("/change-password", authMiddleware.FastSessionAuth(), authHandler.ChangePassword)
	}
	log.Println("Registered authentication routes under /api/v2/auth")

	// Register health check routes under /api/v2/ to match frontend expectations
	router.GET("/api/v2/health", healthCheckHandler.HandleHealthCheck)
	router.GET("/api/v2/health/ready", healthCheckHandler.HandleReadinessCheck)
	router.GET("/api/v2/health/live", healthCheckHandler.HandleLivenessCheck)
	log.Println("Registered API v2 health check routes: /api/v2/health, /api/v2/health/ready, /api/v2/health/live")

	log.Println("Authentication configured for session-only (offline mode)")

	// Protected routes with session authentication only for /api/v2/* endpoints
	apiV2 := router.Group("/api/v2")
	apiV2.Use(authMiddleware.FastSessionAuth())
	apiV2.Use(securityMiddleware.SessionProtection())
	{
		// Persona routes (session auth only)
		personaGroup := apiV2.Group("/personas")
		{
			// Unified persona endpoints
			personaGroup.GET("", apiHandler.ListAllPersonasGin)
			personaGroup.POST("", apiHandler.CreatePersonaGin)
			personaGroup.GET("/:id", apiHandler.GetPersonaByIDGin)
			personaGroup.PUT("/:id", apiHandler.UpdatePersonaGin)
			personaGroup.DELETE("/:id", apiHandler.DeletePersonaGin)
			personaGroup.POST("/:id/test", apiHandler.TestPersonaGin)

			// Type-specific endpoints for HTTP personas
			personaGroup.GET("/http/:id", apiHandler.GetHttpPersonaByIDGin)

			// Type-specific endpoints for DNS personas
			personaGroup.GET("/dns/:id", apiHandler.GetDnsPersonaByIDGin)
		}

		// Proxy routes (session auth only)
		proxyGroup := apiV2.Group("/proxies")
		{
			proxyGroup.GET("", apiHandler.ListProxiesGin)
			proxyGroup.POST("", apiHandler.AddProxyGin)
			proxyGroup.GET("/status", apiHandler.GetProxyStatusesGin)
			proxyGroup.PUT("/:proxyId", apiHandler.UpdateProxyGin)
			proxyGroup.DELETE("/:proxyId", apiHandler.DeleteProxyGin)
			proxyGroup.POST("/:proxyId/test", apiHandler.TestProxyGin)
			proxyGroup.POST("/:proxyId/health-check", apiHandler.ForceCheckSingleProxyGin)
			proxyGroup.POST("/health-check", apiHandler.ForceCheckAllProxiesGin)

			// Bulk operations for N+1 pattern elimination
			bulkProxyGroup := proxyGroup.Group("/bulk")
			{
				bulkProxyGroup.PUT("/update", apiHandler.BulkUpdateProxiesGin)
				bulkProxyGroup.DELETE("/delete", apiHandler.BulkDeleteProxiesGin)
				bulkProxyGroup.POST("/test", apiHandler.BulkTestProxiesGin)
			}
		}

		proxyPoolGroup := apiV2.Group("/proxy-pools")
		{
			proxyPoolGroup.GET("", apiHandler.ListProxyPoolsGin)
			proxyPoolGroup.POST("", apiHandler.CreateProxyPoolGin)
			proxyPoolGroup.PUT("/:poolId", apiHandler.UpdateProxyPoolGin)
			proxyPoolGroup.DELETE("/:poolId", apiHandler.DeleteProxyPoolGin)
			proxyPoolGroup.POST("/:poolId/proxies", apiHandler.AddProxyToPoolGin)
			proxyPoolGroup.DELETE("/:poolId/proxies/:proxyId", apiHandler.RemoveProxyFromPoolGin)
		}

		// Configuration routes (session auth only)
		configGroup := apiV2.Group("/config")
		{
			configGroup.GET("/dns", apiHandler.GetDNSConfigGin)
			configGroup.POST("/dns", apiHandler.UpdateDNSConfigGin)
			configGroup.GET("/http", apiHandler.GetHTTPConfigGin)
			configGroup.POST("/http", apiHandler.UpdateHTTPConfigGin)
			configGroup.GET("/worker", apiHandler.GetWorkerConfigGin)
			configGroup.POST("/worker", apiHandler.UpdateWorkerConfigGin)
			configGroup.GET("/rate-limit", apiHandler.GetRateLimiterConfigGin)
			configGroup.POST("/rate-limit", apiHandler.UpdateRateLimiterConfigGin)
			configGroup.GET("/auth", apiHandler.GetAuthConfigGin)
			configGroup.POST("/auth", apiHandler.UpdateAuthConfigGin)
			configGroup.GET("/logging", apiHandler.GetLoggingConfigGin)
			configGroup.POST("/logging", apiHandler.UpdateLoggingConfigGin)
			configGroup.GET("/proxy-manager", apiHandler.GetProxyManagerConfigGin)
			configGroup.POST("/proxy-manager", apiHandler.UpdateProxyManagerConfigGin)
			configGroup.GET("/server", apiHandler.GetServerConfigGin)
			configGroup.PUT("/server", apiHandler.UpdateServerConfigGin)
			configGroup.GET("/features", apiHandler.GetFeatureFlagsGin)
			configGroup.POST("/features", apiHandler.UpdateFeatureFlagsGin)
		}

		// Keyword set routes (session auth only)
		keywordSetGroup := apiV2.Group("/keyword-sets")
		{
			keywordSetGroup.POST("", apiHandler.CreateKeywordSetGin)
			keywordSetGroup.GET("", apiHandler.ListKeywordSetsGin)
			keywordSetGroup.GET("/:setId", apiHandler.GetKeywordSetGin)
			keywordSetGroup.PUT("/:setId", apiHandler.UpdateKeywordSetGin)
			keywordSetGroup.DELETE("/:setId", apiHandler.DeleteKeywordSetGin)
			// NEW: High-performance endpoint for Phase 3 HTTP keyword validation
			keywordSetGroup.GET("/:setId/rules", apiHandler.GetKeywordSetWithRulesGin)
		}

		// NEW: Keyword rules routes for advanced querying (session auth only)
		keywordRulesGroup := apiV2.Group("/keyword-rules")
		{
			keywordRulesGroup.GET("", apiHandler.QueryKeywordRulesGin)
		}

		// Keyword extraction routes (session auth only)
		extractGroup := apiV2.Group("/extract/keywords")
		{
			extractGroup.POST("", apiHandler.BatchExtractKeywordsGin)
			extractGroup.GET("/stream", apiHandler.StreamExtractKeywordsGin)
		}

		// Database routes (session auth only) - Enterprise bulk operations
		databaseGroup := apiV2.Group("/database")
		{
			databaseGroup.POST("/query", databaseHandler.HandleBulkDatabaseQuery)
			databaseGroup.POST("/stats", databaseHandler.HandleBulkDatabaseStats)
		}

		// Temporary test endpoint for WebSocket broadcast
		apiV2.GET("/broadcast-test", func(c *gin.Context) {
			testMessage := "WebSocket test broadcast message from server! Time: " + time.Now().String()
			requestID := uuid.New().String()
			if b := websocket.GetBroadcaster(); b != nil {
				b.BroadcastMessage([]byte(testMessage))
				response := struct {
					Success   bool        `json:"success"`
					Data      interface{} `json:"data"`
					Error     interface{} `json:"error"`
					RequestID string      `json:"requestId"`
				}{
					Success: true,
					Data: struct {
						Message string `json:"message"`
						Content string `json:"content"`
					}{
						Message: "Test message broadcasted",
						Content: testMessage,
					},
					Error:     nil,
					RequestID: requestID,
				}
				c.JSON(http.StatusOK, response)
			} else {
				response := struct {
					Success   bool        `json:"success"`
					Data      interface{} `json:"data"`
					Error     interface{} `json:"error"`
					RequestID string      `json:"requestId"`
				}{
					Success:   false,
					Data:      nil,
					Error:     "Broadcaster not available",
					RequestID: requestID,
				}
				c.JSON(http.StatusInternalServerError, response)
			}
		})
		log.Println("Registered WebSocket test broadcast route under /api/v2/broadcast-test.")

		// Test endpoint for campaign-specific WebSocket messages
		apiV2.GET("/test-campaign-ws/:campaignId", func(c *gin.Context) {
			campaignID := c.Param("campaignId")
			messageType := c.DefaultQuery("type", "campaign_progress") // Default to campaign_progress
			requestID := uuid.New().String()

			if b := websocket.GetBroadcaster(); b != nil {
				var message websocket.WebSocketMessage

				switch messageType {
				case "campaign_progress":
					message = websocket.CreateCampaignProgressMessage(campaignID, 50.0, "running", "domain_generation")
				default:
					response := struct {
						Success   bool        `json:"success"`
						Data      interface{} `json:"data"`
						Error     interface{} `json:"error"`
						RequestID string      `json:"requestId"`
					}{
						Success:   false,
						Data:      nil,
						Error:     "Invalid message type",
						RequestID: requestID,
					}
					c.JSON(http.StatusBadRequest, response)
					return
				}

				b.BroadcastToCampaign(campaignID, message)
				response := struct {
					Success   bool        `json:"success"`
					Data      interface{} `json:"data"`
					Error     interface{} `json:"error"`
					RequestID string      `json:"requestId"`
				}{
					Success: true,
					Data: struct {
						Message     string `json:"message"`
						CampaignId  string `json:"campaignId"`
						MessageType string `json:"messageType"`
						MessageId   string `json:"messageId"`
					}{
						Message:     "Campaign message sent",
						CampaignId:  campaignID,
						MessageType: messageType,
						MessageId:   message.ID,
					},
					Error:     nil,
					RequestID: requestID,
				}
				c.JSON(http.StatusOK, response)
			} else {
				response := struct {
					Success   bool        `json:"success"`
					Data      interface{} `json:"data"`
					Error     interface{} `json:"error"`
					RequestID string      `json:"requestId"`
				}{
					Success:   false,
					Data:      nil,
					Error:     "Broadcaster not available",
					RequestID: requestID,
				}
				c.JSON(http.StatusInternalServerError, response)
			}
		})
		log.Println("Registered WebSocket campaign test route under /api/v2/test-campaign-ws/:campaignId.")
	}

	// V2 Campaign routes (session auth only) - simple auth like /auth/me
	campaignApiV2 := router.Group("/api/v2")
	campaignApiV2.Use(authMiddleware.FastSessionAuth())
	newCampaignRoutesGroup := campaignApiV2.Group("/campaigns")
	campaignOrchestratorAPIHandler.RegisterCampaignOrchestrationRoutes(newCampaignRoutesGroup, authMiddleware)
	log.Println("Registered new campaign orchestration routes under /api/v2/campaigns.")

	// V2 SSE routes for real-time campaign updates
	sseHandler := api.NewSSEHandler(sseService)
	sseRoutesGroup := campaignApiV2.Group("/sse")
	sseHandler.RegisterSSERoutes(sseRoutesGroup, authMiddleware)
	log.Println("Registered SSE routes for real-time campaign updates under /api/v2/sse.")

	// Week 2 Day 3: Monitoring routes for real-time dashboard integration
	monitoringRoutesGroup := campaignApiV2.Group("/monitoring")
	monitoringAPIHandler.RegisterMonitoringRoutes(monitoringRoutesGroup)
	log.Println("✓ Registered monitoring routes for real-time dashboard under /api/v2/monitoring.")

	// V2 Bulk Operations routes (enterprise-scale operations)
	bulkRoutesGroup := newCampaignRoutesGroup.Group("/bulk")
	registerBulkOperationRoutes(bulkRoutesGroup, bulkDomainsAPIHandler, bulkValidationAPIHandler, bulkAnalyticsAPIHandler, bulkResourcesAPIHandler)
	log.Println("Registered enterprise bulk operation routes under /api/v2/campaigns/bulk.")

	// Generate OpenAPI specification using TRUE automatic reflection from real server routes
	// DISABLED: Replaced with professional swaggo generation
	// log.Println("Generating OpenAPI specification using automatic reflection...")
	// spec := api_pkg.GenerateOpenAPISpecWithEngine(router)

	// Save to file
	// DISABLED: Now handled by swaggo CLI during build
	// specData, err := yaml.Marshal(spec)
	// if err != nil {
	// 	log.Printf("Warning: Failed to marshal OpenAPI spec: %v", err)
	// } else {
	// 	if err := os.WriteFile("docs/openapi-3.yaml", specData, 0644); err != nil {
	// 		log.Printf("Warning: Failed to write OpenAPI spec: %v", err)
	// 	} else {
	// 		log.Printf("✓ OpenAPI specification generated successfully using automatic reflection: docs/openapi-3.yaml")
	// 	}
	// }

	// Use environment variable for port if set, otherwise use config
	serverPort := os.Getenv("SERVER_PORT")
	if serverPort == "" {
		serverPort = appConfig.Server.Port
	}
	if serverPort == "" {
		serverPort = "8080" // Default fallback
	}

	srv := &http.Server{
		Addr:    ":" + serverPort,
		Handler: router,
	}

	go func() {
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("ListenAndServe: %s\n", err)
		}
	}()

	log.Printf("Server starting on %s (Gin Mode: %s)", srv.Addr, appConfig.Server.GinMode)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server and workers...")

	appCancel()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server and workers exited gracefully.")
}

// registerBulkOperationRoutes registers all bulk operation routes for enterprise-scale operations with proper separation
func registerBulkOperationRoutes(
	group *gin.RouterGroup,
	domainsHandler *api.BulkDomainsAPIHandler,
	validationHandler *api.BulkValidationAPIHandler,
	analyticsHandler *api.BulkAnalyticsAPIHandler,
	resourcesHandler *api.BulkResourcesAPIHandler,
) {
	// Bulk domain operations
	group.POST("/domains/generate", domainsHandler.BulkGenerateDomains)

	// Bulk validation operations
	group.POST("/domains/validate-dns", validationHandler.BulkValidateDNS)
	group.POST("/domains/validate-http", validationHandler.BulkValidateHTTP)

	// Bulk analytics operations
	group.POST("/domains/analyze", analyticsHandler.BulkAnalyzeDomains)

	// Bulk operation monitoring and management
	group.GET("/operations/:operationId/status", resourcesHandler.GetBulkOperationStatus)
	group.GET("/operations", resourcesHandler.ListBulkOperations)
	group.POST("/operations/:operationId/cancel", resourcesHandler.CancelBulkOperation)

	// Resource management
	group.POST("/resources/allocate", resourcesHandler.AllocateBulkResources)
	group.GET("/resources/status/:allocationId", resourcesHandler.GetBulkResourceStatus)
}
