// src/lib/api-client/types.ts
// Configuration-driven OpenAPI types for DomainFlow API
// Generated from OpenAPI 3.0.3 schema with environment-aware patterns

/**
 * This file provides TypeScript definitions for the DomainFlow API
 * Uses configuration-driven patterns to adapt to different environments
 */

export interface paths {
  "/api/v2/config/auth": {
    get: operations["getAuthConfig"];
    post: operations["updateAuthConfig"];
  };
  "/api/v2/config/dns": {
    get: operations["getDNSConfig"];
    post: operations["updateDNSConfig"];
  };
  "/api/v2/config/http": {
    get: operations["getHTTPConfig"];
    post: operations["updateHTTPConfig"];
  };
  "/api/v2/config/logging": {
    get: operations["getLoggingConfig"];
    post: operations["updateLoggingConfig"];
  };
  "/api/v2/config/proxy-manager": {
    get: operations["getProxyManagerConfig"];
    post: operations["updateProxyManagerConfig"];
  };
  "/api/v2/config/rate-limit": {
    get: operations["getRateLimiterConfig"];
    post: operations["updateRateLimiterConfig"];
  };
  "/api/v2/config/server": {
    get: operations["getServerConfig"];
    put: operations["updateServerConfig"];
  };
  "/api/v2/config/worker": {
    get: operations["getWorkerConfig"];
    post: operations["updateWorkerConfig"];
  };
  "/auth/login": {
    post: operations["login"];
  };
  "/auth/logout": {
    post: operations["logout"];
  };
  "/auth/refresh": {
    post: operations["refreshSession"];
  };
  "/campaigns": {
    get: operations["listCampaigns"];
    post: operations["createCampaign"];
  };
  "/campaigns/{campaignId}": {
    get: operations["getCampaignDetails"];
    delete: operations["deleteCampaign"];
  };
  "/campaigns/{campaignId}/cancel": {
    post: operations["cancelCampaign"];
  };
  "/campaigns/{campaignId}/pause": {
    post: operations["pauseCampaign"];
  };
  "/campaigns/{campaignId}/results/dns-validation": {
    get: operations["getDNSValidationResults"];
  };
  "/campaigns/{campaignId}/results/generated-domains": {
    get: operations["getGeneratedDomains"];
  };
  "/campaigns/{campaignId}/results/http-keyword": {
    get: operations["getHTTPKeywordResults"];
  };
  "/campaigns/{campaignId}/resume": {
    post: operations["resumeCampaign"];
  };
  "/campaigns/{campaignId}/start": {
    post: operations["startCampaign"];
  };
  "/change-password": {
    post: operations["changePassword"];
  };
  "/config/features": {
    get: operations["getFeatureFlags"];
    post: operations["updateFeatureFlags"];
  };
  "/keywords/sets": {
    get: operations["listKeywordSets"];
    post: operations["createKeywordSet"];
  };
  "/keywords/sets/{setId}": {
    get: operations["getKeywordSet"];
    put: operations["updateKeywordSet"];
    delete: operations["deleteKeywordSet"];
  };
  "/me": {
    get: operations["getCurrentUser"];
  };
  "/personas": {
    get: operations["listPersonas"];
    post: operations["createPersona"];
  };
  "/personas/{id}": {
    get: operations["getPersonaById"];
    put: operations["updatePersona"];
    delete: operations["deletePersona"];
  };
  "/personas/{id}/test": {
    post: operations["testPersona"];
  };
  "/personas/dns/{id}": {
    get: operations["getDnsPersonaById"];
  };
  "/personas/http/{id}": {
    get: operations["getHttpPersonaById"];
  };
  "/proxies": {
    get: operations["listProxies"];
    post: operations["createProxy"];
  };
  "/proxies/{proxyId}": {
    put: operations["updateProxy"];
    delete: operations["deleteProxy"];
  };
  "/proxies/{proxyId}/health-check": {
    post: operations["forceCheckSingleProxy"];
  };
  "/proxies/{proxyId}/test": {
    post: operations["testProxy"];
  };
  "/proxies/health-check": {
    post: operations["forceCheckAllProxies"];
  };
  "/proxies/status": {
    get: operations["getProxyStatuses"];
  };
  "/proxy-pools": {
    get: operations["listProxyPools"];
    post: operations["createProxyPool"];
  };
  "/proxy-pools/{poolId}": {
    put: operations["updateProxyPool"];
    delete: operations["deleteProxyPool"];
  };
  "/proxy-pools/{poolId}/proxies": {
    post: operations["addProxyToPool"];
  };
  "/proxy-pools/{poolId}/proxies/{proxyId}": {
    delete: operations["removeProxyFromPool"];
  };
}

export interface components {
  schemas: {
    AddProxyToPoolRequest: {
      proxyId: string;
      weight?: number;
    };
    AuthConfig: Record<string, unknown>;
    Campaign: {
      id: string;
      name: string;
      campaignType: "domain_generation" | "dns_validation" | "http_keyword_validation";
      status: "pending" | "queued" | "running" | "pausing" | "paused" | "completed" | "failed" | "archived" | "cancelled";
      userId: string;
      createdAt: string;
      updatedAt: string;
      startedAt?: string;
      completedAt?: string;
      lastHeartbeatAt?: string;
      estimatedCompletionAt?: string;
      errorMessage?: string;
      totalItems?: number;
      processedItems?: number;
      successfulItems?: number;
      failedItems?: number;
      progressPercentage?: number;
      avgProcessingRate?: number;
      metadata?: Record<string, unknown>;
    };
    CampaignDetailsResponse: {
      campaign: components["schemas"]["Campaign"];
      params?: Record<string, unknown>;
    };
    CampaignListResponse: {
      data: components["schemas"]["Campaign"][];
      metadata?: components["schemas"]["PaginationMetadata"];
      status: "success";
    };
    CampaignOperationResponse: {
      campaign_id: string;
      message: string;
    };
    ChangePasswordRequest: {
      currentPassword: string;
      newPassword: string;
    };
    CreateCampaignRequest: {
      campaignType: "domain_generation" | "dns_validation" | "http_keyword_validation";
      name: string;
      description?: string;
      userId?: string;
      domainGenerationParams?: components["schemas"]["DomainGenerationParams"];
      dnsValidationParams?: components["schemas"]["DnsValidationParams"];
      httpKeywordParams?: components["schemas"]["HttpKeywordParams"];
    };
    CreateKeywordSetRequest: {
      name: string;
      description?: string;
      isEnabled?: boolean;
      rules?: components["schemas"]["KeywordRuleRequest"][];
    };
    CreatePersonaRequest: {
      name: string;
      description?: string;
      personaType: "dns" | "http";
      isEnabled?: boolean;
      configDetails: components["schemas"]["HttpPersonaConfig"] | components["schemas"]["DnsPersonaConfig"];
    };
    CreateProxyRequest: {
      name: string;
      protocol: "http" | "https" | "socks5" | "socks4";
      address: string;
      description?: string;
      username?: string;
      password?: string;
      countryCode?: string;
      isEnabled?: boolean;
    };
    DNSConfig: Record<string, unknown>;
    DNSValidationResult: {
      id: string;
      dnsCampaignId: string;
      generatedDomainId: string;
      domainName: string;
      validationStatus: "pending" | "valid" | "invalid" | "error" | "skipped";
      validatedByPersonaId?: string;
      businessStatus?: string;
      dnsRecords?: Record<string, unknown>;
      attempts?: number;
      lastCheckedAt?: string;
      createdAt: string;
    };
    DNSValidationResultsResponse: {
      data: components["schemas"]["DNSValidationResult"][];
      totalCount: number;
      nextCursor?: string;
    };
    DnsPersonaConfig: {
      resolvers: string[];
      queryTimeoutSeconds: number;
      maxDomainsPerRequest: number;
      resolverStrategy: "round_robin" | "random" | "weighted" | "priority";
      useSystemResolvers?: boolean;
      concurrentQueriesPerDomain?: number;
      maxConcurrentGoroutines?: number;
      queryDelayMinMs?: number;
      queryDelayMaxMs?: number;
      rateLimitBurst?: number;
      rateLimitDps?: number;
      resolversPreferredOrder?: string[];
      resolversWeighted?: Record<string, number>;
    };
    DnsValidationParams: {
      sourceCampaignId: string;
      personaIds: string[];
      batchSize?: number;
      processingSpeedPerMinute?: number;
      retryAttempts?: number;
      rotationIntervalSeconds?: number;
    };
    DomainGenerationParams: {
      patternType: "prefix" | "suffix" | "both";
      variableLength: number;
      characterSet: string;
      constantString: string;
      tld: string;
      numDomainsToGenerate?: number;
    };
    ErrorResponse: {
      error: string;
    };
    FeatureFlags: {
      enableAnalytics?: boolean;
      enableDebugMode?: boolean;
      enableOfflineMode?: boolean;
      enableRealTimeUpdates?: boolean;
    };
    GeneratedDomain: {
      id: string;
      generationCampaignId: string;
      domainName: string;
      tld: string;
      sourceKeyword?: string;
      sourcePattern?: string;
      offsetIndex?: number;
      generatedAt: string;
      createdAt: string;
    };
    GeneratedDomainsResponse: {
      data: components["schemas"]["GeneratedDomain"][];
      totalCount: number;
      nextCursor?: number;
    };
    HTTPConfig: Record<string, unknown>;
    HTTPKeywordResult: {
      id: string;
      httpKeywordCampaignId: string;
      dnsResultId: string;
      domainName: string;
      validationStatus: "pending" | "valid" | "invalid" | "error" | "skipped";
      validatedByPersonaId?: string;
      usedProxyId?: string;
      httpStatusCode?: number;
      pageTitle?: string;
      extractedContentSnippet?: string;
      contentHash?: string;
      responseHeaders?: Record<string, unknown>;
      foundKeywordsFromSets?: Record<string, unknown>;
      foundAdHocKeywords?: string[];
      attempts?: number;
      lastCheckedAt?: string;
      createdAt: string;
    };
    HTTPKeywordResultsResponse: {
      data: components["schemas"]["HTTPKeywordResult"][];
      totalCount: number;
      nextCursor?: string;
    };
    HttpKeywordParams: {
      sourceCampaignId: string;
      personaIds: string[];
      keywordSetIds?: string[];
      adHocKeywords?: string[];
      proxyPoolId?: string;
      proxySelectionStrategy?: string;
      targetHttpPorts?: number[];
      batchSize?: number;
      processingSpeedPerMinute?: number;
      retryAttempts?: number;
      rotationIntervalSeconds?: number;
    };
    HttpPersonaConfig: {
      userAgent: string;
      headers?: Record<string, string>;
      headerOrder?: string[];
      maxRedirects?: number;
      requestTimeoutSec?: number;
      allowInsecureTls?: boolean;
      useHeadless?: boolean;
      headlessUserAgent?: string;
      headlessTimeoutSeconds?: number;
      viewportWidth?: number;
      viewportHeight?: number;
      loadImages?: boolean;
      scriptExecution?: boolean;
      screenshot?: boolean;
      domSnapshot?: boolean;
      waitDelaySeconds?: number;
      fetchBodyForKeywords?: boolean;
      rateLimitBurst?: number;
      rateLimitDps?: number;
      cookieHandling?: components["schemas"]["CookieHandling"];
      tlsClientHello?: components["schemas"]["TLSClientHello"];
      http2Settings?: components["schemas"]["HTTP2SettingsConfig"];
    };
    CookieHandling: {
      mode?: "preserve" | "ignore" | "custom";
    };
    TLSClientHello: {
      ja3?: string;
      minVersion?: "TLS10" | "TLS11" | "TLS12" | "TLS13";
      maxVersion?: "TLS10" | "TLS11" | "TLS12" | "TLS13";
      cipherSuites?: string[];
      curvePreferences?: string[];
    };
    HTTP2SettingsConfig: {
      enabled?: boolean;
    };
    KeywordRule: {
      id: string;
      keywordSetId: string;
      pattern: string;
      ruleType: "string" | "regex";
      category?: string;
      isCaseSensitive?: boolean;
      contextChars?: number;
      createdAt: string;
      updatedAt: string;
    };
    KeywordRuleRequest: {
      pattern: string;
      ruleType: "string" | "regex";
      category?: string;
      isCaseSensitive?: boolean;
      contextChars?: number;
    };
    KeywordSetResponse: {
      id: string;
      name: string;
      description?: string;
      isEnabled: boolean;
      ruleCount: number;
      rules?: components["schemas"]["KeywordRule"][];
      createdAt: string;
      updatedAt: string;
    };
    LoginRequest: {
      email: string;
      password: string;
      rememberMe?: boolean;
      captchaToken?: string;
    };
    LoginResponse: {
      user: components["schemas"]["User"];
      sessionId?: string;
      expiresAt?: string;
    };
    LoggingConfig: Record<string, unknown>;
    PageInfo: {
      current: number;
      total: number;
      pageSize: number;
      count: number;
    };
    PaginationMetadata: {
      page: components["schemas"]["PageInfo"];
    };
    PersonaListResponse: {
      data: components["schemas"]["PersonaResponse"][];
      status: "success";
      message?: string;
    };
    PersonaResponse: {
      id: string;
      name: string;
      description?: string;
      personaType: "dns" | "http";
      isEnabled: boolean;
      configDetails: components["schemas"]["HttpPersonaConfig"] | components["schemas"]["DnsPersonaConfig"];
      createdAt: string;
      updatedAt: string;
    };
    PersonaTestResult: {
      status: "success";
      message: string;
      data: {
        personaId: string;
        personaType: "dns" | "http";
        status: string;
        message: string;
        testedAt: string;
      };
    };
    Proxy: {
      id: string;
      name: string;
      description?: string;
      protocol: "http" | "https" | "socks5" | "socks4";
      address: string;
      host?: string;
      port?: number;
      username?: string;
      countryCode?: string;
      city?: string;
      provider?: string;
      isEnabled: boolean;
      isHealthy?: boolean;
      lastCheckedAt?: string;
      lastStatus?: string;
      latencyMs?: number;
      createdAt: string;
      updatedAt: string;
    };
    ProxyManagerConfig: Record<string, unknown>;
    ProxyPool: {
      id: string;
      name: string;
      description?: string;
      poolStrategy?: string;
      isEnabled: boolean;
      healthCheckEnabled?: boolean;
      healthCheckIntervalSeconds?: number;
      timeoutSeconds?: number;
      maxRetries?: number;
      proxies?: components["schemas"]["Proxy"][];
      createdAt: string;
      updatedAt: string;
    };
    ProxyPoolMembership: {
      poolId: string;
      proxyId: string;
      weight?: number;
      isActive: boolean;
      addedAt: string;
    };
    ProxyPoolRequest: {
      name: string;
      description?: string;
      poolStrategy?: string;
      isEnabled?: boolean;
      healthCheckEnabled?: boolean;
      healthCheckIntervalSeconds?: number;
      timeoutSeconds?: number;
      maxRetries?: number;
    };
    ProxyStatus: {
      id: string;
      name: string;
      description?: string;
      address: string;
      protocol: string;
      username?: string;
      password?: string;
      userEnabled: boolean;
      isHealthy: boolean;
      consecutiveFailures?: number;
      lastFailure?: string;
    };
    ProxyTestResult: {
      proxyId: string;
      success: boolean;
      statusCode?: number;
      returnedIp?: string;
      durationMs?: number;
      error?: string;
    };
    RateLimiterConfig: Record<string, unknown>;
    RefreshResponse: {
      sessionId: string;
      expiresAt: string;
    };
    ServerConfig: Record<string, unknown>;
    StandardAPIResponse: {
      status: "success" | "error";
      message: string;
      data?: unknown;
      error?: string;
    };
    UpdateKeywordSetRequest: {
      name?: string;
      description?: string;
      isEnabled?: boolean;
      rules?: components["schemas"]["KeywordRuleRequest"][];
    };
    UpdatePersonaRequest: {
      name?: string;
      description?: string;
      isEnabled?: boolean;
      configDetails?: components["schemas"]["HttpPersonaConfig"] | components["schemas"]["DnsPersonaConfig"];
    };
    UpdateProxyRequest: {
      name?: string;
      description?: string;
      protocol?: "http" | "https" | "socks5" | "socks4";
      address?: string;
      username?: string;
      password?: string;
      countryCode?: string;
      isEnabled?: boolean;
    };
    User: {
      id: string;
      email: string;
      emailVerified: boolean;
      firstName?: string;
      lastName?: string;
      isActive: boolean;
      isLocked: boolean;
      lastLoginAt?: string;
      mustChangePassword: boolean;
      mfaEnabled: boolean;
      createdAt: string;
      updatedAt: string;
    };
    WorkerConfig: Record<string, unknown>;
  };
}

export interface operations {
  // Auth operations
  login: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["LoginRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["LoginResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  logout: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["StandardAPIResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  refreshSession: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["RefreshResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  getCurrentUser: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["User"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  changePassword: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["ChangePasswordRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["StandardAPIResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };

  // Campaign operations
  listCampaigns: {
    parameters: {
      query?: {
        limit?: number;
        offset?: number;
        status?: string;
        type?: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["CampaignListResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  createCampaign: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateCampaignRequest"];
      };
    };
    responses: {
      201: {
        content: {
          "application/json": components["schemas"]["Campaign"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  getCampaignDetails: {
    parameters: {
      path: {
        campaignId: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["CampaignDetailsResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  deleteCampaign: {
    parameters: {
      path: {
        campaignId: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["CampaignOperationResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      409: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  startCampaign: {
    parameters: {
      path: {
        campaignId: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["CampaignOperationResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      409: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  pauseCampaign: {
    parameters: {
      path: {
        campaignId: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["CampaignOperationResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      409: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  resumeCampaign: {
    parameters: {
      path: {
        campaignId: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["CampaignOperationResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      409: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  cancelCampaign: {
    parameters: {
      path: {
        campaignId: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["CampaignOperationResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      409: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  getGeneratedDomains: {
    parameters: {
      path: {
        campaignId: string;
      };
      query?: {
        limit?: number;
        cursor?: number;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["GeneratedDomainsResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  getDNSValidationResults: {
    parameters: {
      path: {
        campaignId: string;
      };
      query?: {
        limit?: number;
        cursor?: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["DNSValidationResultsResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  getHTTPKeywordResults: {
    parameters: {
      path: {
        campaignId: string;
      };
      query?: {
        limit?: number;
        cursor?: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["HTTPKeywordResultsResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };

  // Persona operations
  listPersonas: {
    parameters: {
      query?: {
        limit?: number;
        offset?: number;
        personaType?: "dns" | "http";
        isEnabled?: boolean;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["PersonaListResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  createPersona: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreatePersonaRequest"];
      };
    };
    responses: {
      201: {
        content: {
          "application/json": components["schemas"]["PersonaResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      409: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  getPersonaById: {
    parameters: {
      path: {
        id: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["PersonaResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  updatePersona: {
    parameters: {
      path: {
        id: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdatePersonaRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["PersonaResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  deletePersona: {
    parameters: {
      path: {
        id: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["StandardAPIResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  testPersona: {
    parameters: {
      path: {
        id: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["PersonaTestResult"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  getDnsPersonaById: {
    parameters: {
      path: {
        id: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["PersonaResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  getHttpPersonaById: {
    parameters: {
      path: {
        id: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["PersonaResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };

  // Proxy operations
  listProxies: {
    parameters: {
      query?: {
        limit?: number;
        offset?: number;
        protocol?: "http" | "https" | "socks5" | "socks4";
        isEnabled?: boolean;
        isHealthy?: boolean;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["Proxy"][];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  createProxy: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateProxyRequest"];
      };
    };
    responses: {
      201: {
        content: {
          "application/json": components["schemas"]["Proxy"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  updateProxy: {
    parameters: {
      path: {
        proxyId: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateProxyRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["Proxy"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  deleteProxy: {
    parameters: {
      path: {
        proxyId: string;
      };
    };
    responses: {
      204: {
        description: "Proxy deleted successfully";
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  testProxy: {
    parameters: {
      path: {
        proxyId: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["ProxyTestResult"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  forceCheckSingleProxy: {
    parameters: {
      path: {
        proxyId: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["ProxyStatus"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  forceCheckAllProxies: {
    requestBody?: {
      content: {
        "application/json": {
          ids?: string[];
        };
      };
    };
    responses: {
      202: {
        content: {
          "application/json": {
            message: string;
          };
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  getProxyStatuses: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["ProxyStatus"][];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };

  // Proxy Pool operations
  listProxyPools: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["ProxyPool"][];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  createProxyPool: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["ProxyPoolRequest"];
      };
    };
    responses: {
      201: {
        content: {
          "application/json": components["schemas"]["ProxyPool"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  updateProxyPool: {
    parameters: {
      path: {
        poolId: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["ProxyPoolRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["ProxyPool"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  deleteProxyPool: {
    parameters: {
      path: {
        poolId: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": {
            deleted: boolean;
          };
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  addProxyToPool: {
    parameters: {
      path: {
        poolId: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["AddProxyToPoolRequest"];
      };
    };
    responses: {
      201: {
        content: {
          "application/json": components["schemas"]["ProxyPoolMembership"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  removeProxyFromPool: {
    parameters: {
      path: {
        poolId: string;
        proxyId: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": {
            removed: boolean;
          };
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };

  // Keyword Set operations
  listKeywordSets: {
    parameters: {
      query?: {
        limit?: number;
        offset?: number;
        isEnabled?: boolean;
        includeRules?: boolean;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["KeywordSetResponse"][];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  createKeywordSet: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["CreateKeywordSetRequest"];
      };
    };
    responses: {
      201: {
        content: {
          "application/json": components["schemas"]["KeywordSetResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      409: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  getKeywordSet: {
    parameters: {
      path: {
        setId: string;
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["KeywordSetResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  updateKeywordSet: {
    parameters: {
      path: {
        setId: string;
      };
    };
    requestBody: {
      content: {
        "application/json": components["schemas"]["UpdateKeywordSetRequest"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["KeywordSetResponse"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      409: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  deleteKeywordSet: {
    parameters: {
      path: {
        setId: string;
      };
    };
    responses: {
      204: {
        description: "Keyword set deleted successfully";
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      404: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };

  // Feature Flag operations
  getFeatureFlags: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["FeatureFlags"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };
  updateFeatureFlags: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["FeatureFlags"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["FeatureFlags"];
        };
      };
      400: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      401: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
      500: {
        content: {
          "application/json": components["schemas"]["ErrorResponse"];
        };
      };
    };
  };

  // Configuration operations
  getAuthConfig: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["AuthConfig"];
        };
      };
    };
  };
  updateAuthConfig: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["AuthConfig"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["AuthConfig"];
        };
      };
    };
  };
  getDNSConfig: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["DNSConfig"];
        };
      };
    };
  };
  updateDNSConfig: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["DNSConfig"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["DNSConfig"];
        };
      };
    };
  };
  getHTTPConfig: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["HTTPConfig"];
        };
      };
    };
  };
  updateHTTPConfig: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["HTTPConfig"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["HTTPConfig"];
        };
      };
    };
  };
  getLoggingConfig: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["LoggingConfig"];
        };
      };
    };
  };
  updateLoggingConfig: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["LoggingConfig"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["LoggingConfig"];
        };
      };
    };
  };
  getProxyManagerConfig: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["ProxyManagerConfig"];
        };
      };
    };
  };
  updateProxyManagerConfig: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["ProxyManagerConfig"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["ProxyManagerConfig"];
        };
      };
    };
  };
  getRateLimiterConfig: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["RateLimiterConfig"];
        };
      };
    };
  };
  updateRateLimiterConfig: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["RateLimiterConfig"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["RateLimiterConfig"];
        };
      };
    };
  };
  getServerConfig: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["ServerConfig"];
        };
      };
    };
  };
  updateServerConfig: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["ServerConfig"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["ServerConfig"];
        };
      };
    };
  };
  getWorkerConfig: {
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["WorkerConfig"];
        };
      };
    };
  };
  updateWorkerConfig: {
    requestBody: {
      content: {
        "application/json": components["schemas"]["WorkerConfig"];
      };
    };
    responses: {
      200: {
        content: {
          "application/json": components["schemas"]["WorkerConfig"];
        };
      };
    };
  };
}

// Environment-aware configuration interface
export interface ApiConfiguration {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  defaultHeaders: Record<string, string>;
}

// Default configuration from environment variables
export const DEFAULT_API_CONFIG: ApiConfiguration = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v2',
  timeout: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000'),
  retryAttempts: parseInt(process.env.NEXT_PUBLIC_API_RETRY_ATTEMPTS || '3'),
  defaultHeaders: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// Utility types for better type safety
export type ApiPaths = paths;
export type ApiComponents = components;
export type ApiOperations = operations;

// Export common response types for convenience
export type ApiResponse<T = unknown> = {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  error?: string;
};

