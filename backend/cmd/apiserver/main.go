// @title DomainFlow API
// @version 2.0.0
// @description DomainFlow API for domain generation, validation, and campaign management.
// @contact.name API Support
// @contact.url http://www.domainflow.com/support
// @contact.email support@domainflow.com
// @license.name MIT
// @license.url https://opensource.org/licenses/MIT
// @host localhost:8080
// @BasePath /api/v2

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

	"github.com/fntelecomllc/studio/backend/internal/api"
	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/httpvalidator"
	"github.com/fntelecomllc/studio/backend/internal/keywordscanner"
	"github.com/fntelecomllc/studio/backend/internal/middleware"
	"github.com/fntelecomllc/studio/backend/internal/proxymanager"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/store"
	pg_store "github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/fntelecomllc/studio/backend/internal/websocket"
	"github.com/fntelecomllc/studio/backend/pkg/architecture"
	"github.com/fntelecomllc/studio/backend/pkg/communication"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

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
	log.Println("Configuration loaded with environment overrides.")

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
		// Fallback to environment variables for backward compatibility
		dbHost := os.Getenv("DB_HOST")
		dbPort := os.Getenv("DB_PORT")
		dbUser := os.Getenv("DB_USER")
		dbPassword := os.Getenv("DB_PASSWORD")
		dbName := os.Getenv("DB_NAME")
		dbSSLMode := os.Getenv("DB_SSLMODE")

		if dbHost == "" {
			dbHost = "localhost"
		}
		if dbPort == "" {
			dbPort = "5432"
		}
		if dbUser == "" {
			dbUser = "domainflow"
		}
		if dbPassword == "" {
			// Development fallback only - never used in production
			dbPassword = "domainflow_dev_password"
		}
		if dbName == "" {
			dbName = "domainflow_dev"
		}
		if dbSSLMode == "" {
			dbSSLMode = "disable"
		}

		dsn = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
			dbHost, dbPort, dbUser, dbPassword, dbName, dbSSLMode)
	}

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

	pmCfg := appConfig.ProxyManager
	if pmCfg.TestTimeout == 0 {
		if appConfig.HTTPValidator.RequestTimeoutSeconds > 0 {
			pmCfg.TestTimeout = time.Duration(appConfig.HTTPValidator.RequestTimeoutSeconds) * time.Second
		} else {
			pmCfg.TestTimeout = 30 * time.Second
		}
	}
	proxyMgr := proxymanager.NewProxyManager(appConfig.Proxies, pmCfg)
	log.Println("ProxyManager initialized.")

	httpValSvc := httpvalidator.NewHTTPValidator(appConfig)
	log.Println("HTTPValidator service initialized.")

	kwordScannerSvc := keywordscanner.NewService(keywordStore)
	log.Println("KeywordScanner service initialized.")

	// Initialize session service for session-based authentication
	sessionConfig := config.GetDefaultSessionSettings()
	sessionService, err := services.NewSessionService(db, sessionConfig.ToServiceConfig(), auditLogStore)
	if err != nil {
		log.Fatalf("FATAL: Failed to initialize session service: %v", err)
	}
	log.Println("Session service initialized.")

	// All stores including campaignJobStore are now properly initialized above
	configManager := services.NewConfigManager(db)
	domainGenSvc := services.NewDomainGenerationService(db, campaignStore, campaignJobStore, auditLogStore, configManager)
	log.Println("DomainGenerationService initialized.")

	dnsCampaignSvc := services.NewDNSCampaignService(db, campaignStore, personaStore, auditLogStore, campaignJobStore, appConfig)
	log.Println("DNSCampaignService initialized.")

	httpKeywordCampaignSvc := services.NewHTTPKeywordCampaignService(
		db,
		campaignStore, personaStore, proxyStore, keywordStore, auditLogStore,
		campaignJobStore,
		httpValSvc, kwordScannerSvc, proxyMgr, appConfig,
	)
	log.Println("HTTPKeywordCampaignService initialized.")

	mq := communication.NewSimpleQueue(100)
	es := communication.NewInMemoryEventStore()
	asyncMgr := communication.NewAsyncPatternManager(mq, es, nil)

	archRegistry := architecture.NewServiceRegistry(db.DB)
	if err := services.RegisterServiceContracts(archRegistry); err != nil {
		log.Printf("Warning: failed to register service contracts: %v", err)
	}

	campaignOrchestratorSvc := services.NewCampaignOrchestratorService(
		db,
		campaignStore,
		personaStore,
		keywordStore,
		auditLogStore,
		campaignJobStore,
		domainGenSvc,
		dnsCampaignSvc,
		httpKeywordCampaignSvc,
		asyncMgr,
	)
	log.Println("CampaignOrchestratorService initialized.")

	serverInstanceID, _ := os.Hostname()
	if serverInstanceID == "" {
		serverInstanceID = uuid.NewString()
	}
	workerService := services.NewCampaignWorkerService(
		campaignJobStore,
		domainGenSvc,
		dnsCampaignSvc,
		httpKeywordCampaignSvc,
		campaignOrchestratorSvc,
		serverInstanceID,
		appConfig,
		db,
	)
	log.Println("CampaignWorkerService initialized.")

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

	campaignOrchestratorAPIHandler := api.NewCampaignOrchestratorAPIHandler(campaignOrchestratorSvc)
	log.Println("CampaignOrchestratorAPIHandler initialized.")

	webSocketAPIHandler := api.NewWebSocketHandler(wsBroadcaster, sessionService)
	log.Println("WebSocketAPIHandler initialized.")

	// Initialize authentication and security handlers
	authHandler := api.NewAuthHandler(sessionService, sessionConfig, db)
	log.Println("AuthHandler initialized.")

	// Initialize middleware
	authMiddleware := middleware.NewAuthMiddleware(sessionService, sessionConfig)
	securityMiddleware := middleware.NewSecurityMiddleware()
	rateLimitMiddleware := middleware.NewRateLimitMiddleware(db, appConfig.RateLimiter)
	log.Println("Security middleware initialized.")

	// Initialize health check handler
	healthCheckHandler := api.NewHealthCheckHandler(db.DB)
	log.Println("HealthCheckHandler initialized.")

	appCtx, appCancel := context.WithCancel(context.Background())
	defer appCancel()

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
	router.Use(rateLimitMiddleware.IPRateLimit(100, time.Minute)) // 100 requests per minute per IP

	// WebSocket route (registered early to avoid middleware conflicts)
	router.GET("/api/v2/ws", webSocketAPIHandler.HandleConnections)
	log.Println("Registered WebSocket route under /api/v2/ws.")

	// Public routes (no authentication required)
	router.GET("/ping", api.PingHandlerGin)

	// OpenAPI 3.0 specification (public)
	// Serve OpenAPI 3.0 specification from the repository path
	router.StaticFile("/api/openapi.yaml", "backend/docs/openapi.yaml")
	log.Println("Registered OpenAPI 3.0 specification route under /api/openapi.yaml")

	// Authentication routes (public)
	authRoutes := router.Group("/api/v2/auth")
	{
		authRoutes.POST("/login", rateLimitMiddleware.LoginRateLimit(), authHandler.Login)
		authRoutes.POST("/logout", authHandler.Logout)
		authRoutes.POST("/refresh", authHandler.RefreshSession)
	}
	log.Println("Registered authentication routes under /api/v2/auth")

	// Register health check routes
	api.RegisterHealthCheckRoutes(router, healthCheckHandler)
	log.Println("Registered health check routes: /health, /health/ready, /health/live")

	log.Println("Authentication configured for session-only (offline mode)")

	// Protected routes with session authentication only
	apiV2 := router.Group("/api/v2")
	apiV2.Use(authMiddleware.SessionAuth())
	apiV2.Use(securityMiddleware.SessionProtection()) // Session-based protection for session-based requests
	{
		// Admin user management routes
		adminRoutes := apiV2.Group("/admin")
		{
			adminRoutes.GET("/users", apiHandler.ListUsersGin)
			adminRoutes.POST("/users", apiHandler.CreateUserGin)
			adminRoutes.GET("/users/:userId", apiHandler.GetUserGin)
			adminRoutes.PUT("/users/:userId", apiHandler.UpdateUserGin)
			adminRoutes.DELETE("/users/:userId", apiHandler.DeleteUserGin)
		}

		// Current user routes (authenticated users)
		apiV2.GET("/me", authHandler.Me)
		apiV2.POST("/change-password", authHandler.ChangePassword)

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
		keywordSetGroup := apiV2.Group("/keywords/sets")
		{
			keywordSetGroup.POST("", apiHandler.CreateKeywordSetGin)
			keywordSetGroup.GET("", apiHandler.ListKeywordSetsGin)
			keywordSetGroup.GET("/:setId", apiHandler.GetKeywordSetGin)
			keywordSetGroup.PUT("/:setId", apiHandler.UpdateKeywordSetGin)
			keywordSetGroup.DELETE("/:setId", apiHandler.DeleteKeywordSetGin)
		}

		// Keyword extraction routes (session auth only)
		extractGroup := apiV2.Group("/extract/keywords")
		{
			extractGroup.POST("", apiHandler.BatchExtractKeywordsGin)
			extractGroup.GET("/stream", apiHandler.StreamExtractKeywordsGin)
		}

		// Temporary test endpoint for WebSocket broadcast
		apiV2.GET("/broadcast-test", func(c *gin.Context) {
			testMessage := "WebSocket test broadcast message from server! Time: " + time.Now().String()
			if b := websocket.GetBroadcaster(); b != nil {
				b.BroadcastMessage([]byte(testMessage))
				c.JSON(http.StatusOK, gin.H{"message": "Test message broadcasted", "content": testMessage})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Broadcaster not available"})
			}
		})
		log.Println("Registered WebSocket test broadcast route under /api/v2/broadcast-test.")

		log.Println("Legacy campaign routes under /api/v2/campaigns/* have been removed. All APIs now use /api/v2.")
	}

	// V2 Campaign routes (session auth only)
	campaignApiV2 := router.Group("/api/v2")
	campaignApiV2.Use(authMiddleware.SessionAuth())
	campaignApiV2.Use(securityMiddleware.SessionProtection())
	newCampaignRoutesGroup := campaignApiV2.Group("/campaigns")
	campaignOrchestratorAPIHandler.RegisterCampaignOrchestrationRoutes(newCampaignRoutesGroup, authMiddleware)
	log.Println("Registered new campaign orchestration routes under /api/v2/campaigns.")

	// Use environment variable for port if set, otherwise use config
	serverPort := os.Getenv("DOMAINFLOW_PORT")
	if serverPort == "" {
		serverPort = appConfig.Server.Port
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
