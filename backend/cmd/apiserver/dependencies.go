package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/application"
	application_hooks "github.com/fntelecomllc/studio/backend/internal/application/hooks"
	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/contentfetcher"
	"github.com/fntelecomllc/studio/backend/internal/dnsvalidator"
	domainservices "github.com/fntelecomllc/studio/backend/internal/domain/services"
	domaininfra "github.com/fntelecomllc/studio/backend/internal/domain/services/infra"
	"github.com/fntelecomllc/studio/backend/internal/extraction"
	"github.com/fntelecomllc/studio/backend/internal/httpvalidator"
	"github.com/fntelecomllc/studio/backend/internal/monitoring"
	"github.com/fntelecomllc/studio/backend/internal/proxymanager"
	"github.com/fntelecomllc/studio/backend/internal/services"
	"github.com/fntelecomllc/studio/backend/internal/store"
	pg_store "github.com/fntelecomllc/studio/backend/internal/store/postgres"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
)

// AppDeps holds the minimal shared dependencies needed by strict handlers.
// We'll expand this incrementally as we migrate more endpoints.
type AppDeps struct {
	Config *config.AppConfig
	// Core runtime deps used by strict handlers
	DB     *sqlx.DB
	Stores struct {
		Campaign    store.CampaignStore
		Persona     store.PersonaStore
		Proxy       store.ProxyStore
		ProxyPools  store.ProxyPoolStore
		Keyword     store.KeywordStore
		AuditLog    store.AuditLogStore
		CampaignJob store.CampaignJobStore
	}
	ProxyMgr          *proxymanager.ProxyManager
	SSE               *services.SSEService
	Orchestrator      *application.CampaignOrchestrator
	RehydrationWorker *application.RehydrationWorker
	BulkOps           *BulkOpsTracker
	// Internal lightweight metrics (in-memory counters) until Prom/OTel integration
	Metrics *RuntimeMetrics
	// Monitoring suite
	Monitoring *monitoring.MonitoringService
	Cleanup    *monitoring.CleanupService
	// Auth/session
	Session *services.SessionService
	// Logger available to handlers (simple structured logger)
	Logger HandlerLogger
	// Aggregations cache (funnel & metrics)
	AggregatesCache *domainservices.AggregatesCache
}

// HandlerLogger defines the minimal logging surface required at the HTTP handler layer.
// We keep this narrow to allow pluggable implementations later (zap, zerolog, etc.).
type HandlerLogger interface {
	Debug(ctx context.Context, msg string, fields map[string]interface{})
	Info(ctx context.Context, msg string, fields map[string]interface{})
	Warn(ctx context.Context, msg string, fields map[string]interface{})
	Error(ctx context.Context, msg string, err error, fields map[string]interface{})
}

// eventBusAdapter bridges domain EventBus to the legacy SSE service
type eventBusAdapter struct{ sse *services.SSEService }

func (a *eventBusAdapter) PublishProgress(ctx context.Context, progress domainservices.PhaseProgress) error {
	if a == nil || a.sse == nil {
		return nil
	}
	campaignID := progress.CampaignID
	evt := services.SSEEvent{
		Event: services.SSEEventCampaignProgress,
		Data: map[string]interface{}{
			"phase":           string(progress.Phase),
			"status":          string(progress.Status),
			"progressPct":     progress.ProgressPct,
			"progress_pct":    progress.ProgressPct,
			"itemsTotal":      progress.ItemsTotal,
			"items_total":     progress.ItemsTotal,
			"itemsProcessed":  progress.ItemsProcessed,
			"items_processed": progress.ItemsProcessed,
			"message":         progress.Message,
			"error":           progress.Error,
			"timestamp":       progress.Timestamp,
			"currentPhase":    string(progress.Phase),
			"current_phase":   string(progress.Phase),
		},
		Timestamp: time.Now(),
	}
	a.enrichSSEIdentifiers(ctx, &evt, campaignID)
	a.sse.BroadcastEvent(evt)
	return nil
}

func (a *eventBusAdapter) PublishStatusChange(ctx context.Context, status domainservices.PhaseStatus) error {
	if a == nil || a.sse == nil {
		return nil
	}
	evtType := services.SSEEventPhaseStarted
	switch status.Status {
	case "completed":
		evtType = services.SSEEventPhaseCompleted
	case "failed":
		evtType = services.SSEEventPhaseFailed
	}
	campaignID := status.CampaignID
	evt := services.SSEEvent{
		Event: evtType,
		Data: map[string]interface{}{
			"phase":           string(status.Phase),
			"status":          string(status.Status),
			"progressPct":     status.ProgressPct,
			"progress_pct":    status.ProgressPct,
			"itemsTotal":      status.ItemsTotal,
			"items_total":     status.ItemsTotal,
			"itemsProcessed":  status.ItemsProcessed,
			"items_processed": status.ItemsProcessed,
			"lastError":       status.LastError,
		},
		Timestamp: time.Now(),
	}
	a.enrichSSEIdentifiers(ctx, &evt, campaignID)
	a.sse.BroadcastEvent(evt)
	return nil
}

func (a *eventBusAdapter) PublishSystemEvent(ctx context.Context, name string, payload map[string]interface{}) error {
	if a == nil || a.sse == nil {
		return nil
	}
	evt := services.SSEEvent{Event: services.SSEEventType(name), Data: payload, Timestamp: time.Now()}
	if campaignID, ok := extractCampaignIDFromPayload(payload); ok {
		a.enrichSSEIdentifiers(ctx, &evt, campaignID)
	} else {
		// Still attempt to attach user context even without campaign identifier
		a.enrichSSEIdentifiers(ctx, &evt, uuid.Nil)
	}
	a.sse.BroadcastEvent(evt)
	return nil
}

func (a *eventBusAdapter) enrichSSEIdentifiers(ctx context.Context, evt *services.SSEEvent, campaignID uuid.UUID) {
	if evt == nil {
		return
	}
	if campaignID != uuid.Nil {
		// Attach campaign context on both envelope and payload for client routing
		clone := campaignID
		evt.CampaignID = &clone
		if evt.Data == nil {
			evt.Data = make(map[string]interface{})
		}
		evt.Data["campaign_id"] = campaignID.String()
	}

	if ctx == nil {
		return
	}
	if raw := ctx.Value("user_id"); raw != nil {
		switch v := raw.(type) {
		case uuid.UUID:
			if v != uuid.Nil {
				clone := v
				evt.UserID = &clone
			}
		case string:
			if parsed, err := uuid.Parse(v); err == nil {
				clone := parsed
				evt.UserID = &clone
			}
		}
	}
}

func extractCampaignIDFromPayload(payload map[string]interface{}) (uuid.UUID, bool) {
	if payload == nil {
		return uuid.Nil, false
	}
	if raw, ok := payload["campaign_id"]; ok {
		switch v := raw.(type) {
		case uuid.UUID:
			if v != uuid.Nil {
				return v, true
			}
		case string:
			if parsed, err := uuid.Parse(v); err == nil {
				return parsed, true
			}
		}
	}
	return uuid.Nil, false
}

// initAppDependencies loads environment/config and returns core dependencies for the Chi strict server.
// This is a lifted, shared initializer derived from the previous Gin path startup.
func initAppDependencies() (*AppDeps, error) {
	// Load .env from common locations (same logic as legacy path)
	envPaths := []string{
		".env",
		filepath.Join("..", ".env"),
		filepath.Join(".", ".env"),
	}
	for _, p := range envPaths {
		if err := godotenv.Load(p); err == nil {
			log.Printf("Loaded environment variables from %s", p)
			break
		}
	}

	// Load configuration with environment variable support
	appConfig, err := config.LoadWithEnv("")
	if err != nil {
		log.Printf("Warning: Failed to load config file: %v", err)
		log.Println("Falling back to environment variables and defaults…")
		if envConfig, err2 := config.LoadWithEnv(""); err2 != nil {
			log.Printf("Warning: Failed to load environment variables: %v", err2)
			appConfig = &config.AppConfig{}
		} else {
			appConfig = envConfig
		}
	}

	// Initialize optimization configuration if not set
	if !appConfig.Optimization.Enabled && !appConfig.Optimization.Phases.BatchQueries {
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

	deps := &AppDeps{Config: appConfig}

	// Initialize PostgreSQL (mirror legacy path)
	// Prefer DSN from config if present, else env vars
	var dsn string
	if appConfig.Server.DatabaseConfig != nil {
		dsn = config.GetDatabaseDSN(appConfig.Server.DatabaseConfig)
	} else {
		dbHost := os.Getenv("DB_HOST")
		dbPort := os.Getenv("DB_PORT")
		dbUser := os.Getenv("DB_USER")
		dbPassword := os.Getenv("DB_PASSWORD")
		dbName := os.Getenv("DB_NAME")
		dbSSLMode := os.Getenv("DB_SSLMODE")
		if dbSSLMode == "" {
			dbSSLMode = "disable"
		}
		if dbHost == "" || dbPort == "" || dbUser == "" || dbPassword == "" || dbName == "" {
			// Database not configured; allow Chi server to run with limited endpoints
			log.Println("Database environment variables not fully set; starting with limited functionality")
		} else {
			dsn = fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s", dbHost, dbPort, dbUser, dbPassword, dbName, dbSSLMode)
		}
	}

	if dsn != "" {
		db, err := sqlx.Connect("postgres", dsn)
		if err != nil {
			return nil, fmt.Errorf("connect postgres: %w", err)
		}
		db.SetMaxOpenConns(appConfig.Server.DBMaxOpenConns)
		db.SetMaxIdleConns(appConfig.Server.DBMaxIdleConns)
		db.SetConnMaxLifetime(time.Duration(appConfig.Server.DBConnMaxLifetimeMinutes) * time.Minute)
		deps.DB = db

		// Initialize stores
		deps.Stores.Campaign = pg_store.NewCampaignStorePostgres(db)
		deps.Stores.Persona = pg_store.NewPersonaStorePostgres(db)
		deps.Stores.Proxy = pg_store.NewProxyStorePostgres(db)
		deps.Stores.ProxyPools = pg_store.NewProxyPoolStorePostgres(db)
		deps.Stores.Keyword = pg_store.NewKeywordStorePostgres(db)
		deps.Stores.AuditLog = pg_store.NewAuditLogStorePostgres(db)
		deps.Stores.CampaignJob = pg_store.NewCampaignJobStorePostgres(db)

		// Extraction metrics initialization (idempotent)
		func() {
			defer func() { _ = recover() }()
			extraction.InitMetrics()
			// Start periodic gauge updater (30s default)
			if raw := db.DB; raw != nil {
				ctx, cancel := context.WithCancel(context.Background())
				_ = cancel // in future wire into shutdown
				extraction.StartFeatureMetricsLoop(ctx, raw, 30*time.Second)
			}
		}()
	}

	// Initialize aggregates cache (always, even if DB nil; handlers will guard)
	deps.AggregatesCache = domainservices.NewAggregatesCache()

	// Initialize session service (uses DB if available; defaults to relaxed config)
	sessSvc, err := services.NewSessionService(deps.DB, nil, deps.Stores.AuditLog)
	if err == nil {
		deps.Session = sessSvc
	}

	// Initialize ProxyManager if DB and store available
	if deps.DB != nil && deps.Stores.Proxy != nil {
		pmCfg := appConfig.ProxyManager
		if pmCfg.TestTimeout == 0 {
			if appConfig.HTTPValidator.RequestTimeoutSeconds > 0 {
				pmCfg.TestTimeout = time.Duration(appConfig.HTTPValidator.RequestTimeoutSeconds) * time.Second
			} else {
				pmCfg.TestTimeout = 30 * time.Second
			}
		}
		deps.ProxyMgr = proxymanager.NewProxyManager(appConfig.Proxies, pmCfg, deps.Stores.Proxy, deps.DB)
	}

	// Initialize engines/services required by orchestrator
	httpValSvc := httpvalidator.NewHTTPValidator(appConfig)
	dnsValSvc := dnsvalidator.New(appConfig.DNSValidator)
	var contentFetcherSvc *contentfetcher.ContentFetcher
	if deps.ProxyMgr != nil {
		contentFetcherSvc = contentfetcher.NewContentFetcher(appConfig, deps.ProxyMgr)
	} else {
		contentFetcherSvc = contentfetcher.NewContentFetcher(appConfig, nil)
	}

	// Domain services deps and implementations
	simpleLogger := &SimpleLogger{}
	deps.Logger = simpleLogger
	// Initialize infrastructure adapters using existing connections
	var auditLogger = domaininfra.NewAuditService()
	var rawSQL *sql.DB
	if deps.DB != nil {
		rawSQL = deps.DB.DB
	}
	var metricsRecorder = domaininfra.NewMetricsSQLX(rawSQL)
	var txManager = domaininfra.NewTxSQLX(deps.DB)
	var cacheAdapter = domaininfra.NewCacheRedis(nil)
	var configManager = domaininfra.NewConfigManagerAdapter()

	domainDeps := domainservices.Dependencies{
		Logger:          simpleLogger,
		DB:              deps.DB,
		AuditLogger:     auditLogger,
		MetricsRecorder: metricsRecorder,
		TxManager:       txManager,
		ConfigManager:   configManager,
		Cache:           cacheAdapter,
		// EventBus, SSE, StealthIntegration provided where needed separately
	}

	// Provide EventBus adapter early so services can emit events
	deps.SSE = services.NewSSEService()
	deps.SSE.Start(context.Background())
	domainDeps.EventBus = &eventBusAdapter{sse: deps.SSE}

	// Use store-backed config manager and stealth adapter where applicable
	domainDeps.ConfigManager = domaininfra.NewStoreBackedConfigManager(deps.Stores.Campaign)

	domainGenSvc := domainservices.NewDomainGenerationService(deps.Stores.Campaign, domainDeps)
	dnsValidationSvc := domainservices.NewDNSValidationService(dnsValSvc, deps.Stores.Campaign, domainDeps)
	httpValidationSvc := domainservices.NewHTTPValidationService(deps.Stores.Campaign, domainDeps, httpValSvc, deps.Stores.Persona, deps.Stores.Proxy, deps.Stores.Keyword)
	enrichmentSvc := domainservices.NewEnrichmentService(deps.Stores.Campaign, domainDeps)
	analysisSvc := domainservices.NewAnalysisService(deps.Stores.Campaign, domainDeps, contentFetcherSvc, deps.Stores.Persona, deps.Stores.Proxy)

	var extractionPhaseSvc domainservices.PhaseService
	if deps.DB != nil {
		featureExtractionSvc := domainservices.NewFeatureExtractionService(deps.DB, simpleLogger)
		keywordExtractionSvc := domainservices.NewKeywordExtractionService(deps.DB, simpleLogger)
		microcrawler := extraction.NewHTTPMicrocrawler()
		adaptiveCrawlingSvc := domainservices.NewAdaptiveCrawlingService(deps.DB, simpleLogger, microcrawler, featureExtractionSvc, keywordExtractionSvc)
		advancedScoringSvc := domainservices.NewAdvancedScoringService(deps.DB, simpleLogger)
		batchExtractionSvc := domainservices.NewBatchExtractionService(
			deps.DB,
			simpleLogger,
			featureExtractionSvc,
			keywordExtractionSvc,
			adaptiveCrawlingSvc,
			advancedScoringSvc,
			domainservices.BatchProcessingConfig{},
		)
		dataMigrationSvc := domainservices.NewDataMigrationService(deps.DB, simpleLogger)
		extractionOrchestrator := domainservices.NewExtractionAnalysisOrchestrator(
			deps.DB,
			simpleLogger,
			featureExtractionSvc,
			keywordExtractionSvc,
			adaptiveCrawlingSvc,
			advancedScoringSvc,
			batchExtractionSvc,
			dataMigrationSvc,
			domainservices.OrchestratorConfig{},
		)
		extractionPhaseSvc = domainservices.NewExtractionPhaseService(deps.Stores.Campaign, domainDeps, extractionOrchestrator, batchExtractionSvc)
	}

	// Stealth integration and wrappers (decoupled from legacy)
	// Use toggleable stealth: frontend can flip enableStealth via /config/features
	realStealth := domaininfra.NewRealStealthIntegration(deps.Stores.Campaign)
	noopStealth := domaininfra.NewNoopStealthIntegration()
	stealthIntegration := domaininfra.NewToggleableStealthIntegration(realStealth, noopStealth, deps.Config)
	stealthAwareDNS := domainservices.NewStealthAwareDNSValidationService(dnsValidationSvc, stealthIntegration)
	stealthAwareHTTP := domainservices.NewStealthAwareHTTPValidationService(httpValidationSvc, stealthIntegration)
	// Enable stealth mode globally; Noop integration will fall back to standard execution.
	stealthAwareDNS.EnableStealthMode()
	stealthAwareHTTP.EnableStealthMode()

	// Initialize runtime metrics container EARLY so we don't pass a typed-nil into orchestrator
	deps.Metrics = NewRuntimeMetrics()

	// SSE and Orchestrator
	if deps.Stores.Campaign != nil {
		deps.Orchestrator = application.NewCampaignOrchestrator(
			deps.Stores.Campaign,
			domainDeps,
			domainGenSvc,
			stealthAwareDNS,
			stealthAwareHTTP,
			extractionPhaseSvc,
			enrichmentSvc,
			analysisSvc,
			deps.SSE,
			deps.Metrics,
		)

		// Register post-completion hooks
		deps.Orchestrator.RegisterPostCompletionHook(&application_hooks.SummaryReportHook{Store: deps.Stores.Campaign, Deps: domainDeps})

		cfg := application.DefaultRehydrationWorkerConfig()
		deps.RehydrationWorker = application.NewRehydrationWorker(deps.Orchestrator, domainDeps.Logger, cfg)
		deps.RehydrationWorker.Start(context.Background())
	}

	// Monitoring and cleanup services
	deps.Monitoring = monitoring.NewMonitoringService(monitoring.DefaultMonitoringConfig())
	_ = deps.Monitoring.Start(context.Background(), monitoring.DefaultMonitoringConfig())
	deps.Cleanup = monitoring.NewCleanupService(deps.Monitoring.ResourceMonitor, deps.Monitoring, monitoring.DefaultCleanupConfig())
	_ = deps.Cleanup.Start(context.Background())
	// Global integration for convenience
	monitoring.SetGlobalMonitoringIntegration(monitoring.NewCampaignMonitoringIntegration(deps.Monitoring))

	// In-memory bulk operations tracker
	deps.BulkOps = NewBulkOpsTracker()

	// Start domain counters reconciliation job if enabled
	if deps.DB != nil && deps.Config.Reconciliation.Enabled {
		interval := time.Duration(deps.Config.Reconciliation.IntervalMinutes) * time.Minute
		cfg := domainservices.CounterReconcilerConfig{
			Interval:          interval,
			DriftThresholdPct: deps.Config.Reconciliation.DriftThresholdPct,
			AutoCorrect:       deps.Config.Reconciliation.AutoCorrect,
			MaxCorrections:    deps.Config.Reconciliation.MaxCorrectionsPerRun,
		}
		domainservices.StartDomainCountersReconciler(deps.DB, deps.Logger, domainDeps.MetricsRecorder, domainDeps.EventBus, cfg)
	}

	return deps, nil
}
