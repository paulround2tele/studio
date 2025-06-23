/**
 * Backend Models Context Provider
 * 
 * Provides comprehensive context about Go backend models, enums, and data structures
 * that serve as the source of truth for the entire DomainFlow system.
 */

export interface BackendModelsContext {
  // Core Campaign System
  campaignTypes: {
    DOMAIN_GENERATION: "domain_generation";
    DNS_VALIDATION: "dns_validation";
    HTTP_KEYWORD_VALIDATION: "http_keyword_validation";
  };
  
  campaignStatuses: {
    PENDING: "pending";
    QUEUED: "queued";
    RUNNING: "running";
    PAUSING: "pausing";
    PAUSED: "paused";
    COMPLETED: "completed";
    FAILED: "failed";
    ARCHIVED: "archived";
    CANCELLED: "cancelled";
  };

  // Persona System  
  personaTypes: {
    DNS: "dns";
    HTTP: "http";
  };

  // Proxy System
  proxyProtocols: {
    HTTP: "http";
    HTTPS: "https";
    SOCKS5: "socks5";
    SOCKS4: "socks4";
  };

  // Keyword System
  keywordRuleTypes: {
    STRING: "string";
    REGEX: "regex";
  };

  // Job System
  campaignJobStatuses: {
    PENDING: "pending";
    QUEUED: "queued";
    RUNNING: "running";
    PROCESSING: "processing";
    COMPLETED: "completed";
    FAILED: "failed";
    RETRY: "retry";
  };

  // Validation System
  validationStatuses: {
    PENDING: "pending";
    VALID: "valid";
    INVALID: "invalid";
    ERROR: "error";
    SKIPPED: "skipped";
  };

  dnsValidationStatuses: {
    RESOLVED: "resolved";
    UNRESOLVED: "unresolved";
    TIMEOUT: "timeout";
    ERROR: "error";
  };

  httpValidationStatuses: {
    SUCCESS: "success";
    FAILED: "failed";
    TIMEOUT: "timeout";
    ERROR: "error";
  };
}

export const BACKEND_MODELS_CONTEXT: BackendModelsContext = {
  campaignTypes: {
    DOMAIN_GENERATION: "domain_generation",
    DNS_VALIDATION: "dns_validation", 
    HTTP_KEYWORD_VALIDATION: "http_keyword_validation"
  },
  
  campaignStatuses: {
    PENDING: "pending",
    QUEUED: "queued",
    RUNNING: "running",
    PAUSING: "pausing",
    PAUSED: "paused",
    COMPLETED: "completed",
    FAILED: "failed",
    ARCHIVED: "archived",
    CANCELLED: "cancelled"
  },

  personaTypes: {
    DNS: "dns",
    HTTP: "http"
  },

  proxyProtocols: {
    HTTP: "http",
    HTTPS: "https",
    SOCKS5: "socks5",
    SOCKS4: "socks4"
  },

  keywordRuleTypes: {
    STRING: "string",
    REGEX: "regex"
  },

  campaignJobStatuses: {
    PENDING: "pending",
    QUEUED: "queued", 
    RUNNING: "running",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
    RETRY: "retry"
  },

  validationStatuses: {
    PENDING: "pending",
    VALID: "valid",
    INVALID: "invalid",
    ERROR: "error",
    SKIPPED: "skipped"
  },

  dnsValidationStatuses: {
    RESOLVED: "resolved",
    UNRESOLVED: "unresolved",
    TIMEOUT: "timeout",
    ERROR: "error"
  },

  httpValidationStatuses: {
    SUCCESS: "success",
    FAILED: "failed",
    TIMEOUT: "timeout",
    ERROR: "error"
  }
};

/**
 * Backend Model Structures
 */
export interface BackendModelStructures {
  // DNS Configuration Details
  dnsConfigDetails: {
    resolvers: string[];
    useSystemResolvers: boolean;
    queryTimeoutSeconds: number;
    maxDomainsPerRequest: number;
    resolverStrategy: "random_rotation" | "sequential_failover" | "specific_order" | "weighted_rotation";
    resolversWeighted?: Record<string, number>;
    resolversPreferredOrder?: string[];
    concurrentQueriesPerDomain: number;
    queryDelayMinMs: number;
    queryDelayMaxMs: number;
    maxConcurrentGoroutines: number;
    rateLimitDps: number;
    rateLimitBurst: number;
  };

  // HTTP TLS Client Hello Configuration
  httpTLSClientHello: {
    minVersion?: "TLS10" | "TLS11" | "TLS12" | "TLS13";
    maxVersion?: "TLS10" | "TLS11" | "TLS12" | "TLS13";
    cipherSuites?: string[];
    curvePreferences?: string[];
  };

  // HTTP/2 Settings
  http2Settings: {
    enabled: boolean;
  };

  // HTTP Cookie Handling
  httpCookieHandling: {
    mode?: "session" | "none" | "ignore";
  };

  // HTTP Configuration Details
  httpConfigDetails: {
    userAgent: string;
    headers?: Record<string, string>;
    headerOrder?: string[];
    tlsClientHello?: BackendModelStructures['httpTLSClientHello'];
    http2Settings?: BackendModelStructures['http2Settings'];
    cookieHandling?: BackendModelStructures['httpCookieHandling'];
    requestTimeoutSeconds?: number;
    followRedirects?: boolean;
    maxConcurrentRequests?: number;
    concurrentRequestDelayMinMs?: number;
    concurrentRequestDelayMaxMs?: number;
    rateLimitRps?: number;
    rateLimitBurst?: number;
    acceptLanguage?: string;
    acceptEncoding?: string;
    acceptCharset?: string;
  };
}

/**
 * Backend Data Flow Patterns
 */
export interface BackendDataFlowPatterns {
  // Campaign Orchestration Flow
  campaignOrchestration: {
    phases: {
      domainGeneration: {
        input: "campaign_config";
        output: "generated_domains[]";
        dependencies: ["campaign_settings", "keyword_rules"];
        triggers: ["manual_start", "scheduled_start"];
      };
      dnsValidation: {
        input: "generated_domains[]";
        output: "validated_domains[]";
        dependencies: ["dns_personas", "resolvers_config"];
        triggers: ["domain_generation_complete", "manual_trigger"];
      };
      httpKeywordValidation: {
        input: "validated_domains[]";
        output: "qualified_leads[]";
        dependencies: ["http_personas", "keyword_sets", "proxy_config"];
        triggers: ["dns_validation_complete", "manual_trigger"];
      };
    };
    stateTransitions: {
      pending_to_queued: "campaign_validation_passed";
      queued_to_running: "worker_available";
      running_to_paused: "user_request | error_threshold_exceeded";
      running_to_completed: "all_phases_complete";
      running_to_failed: "critical_error | max_retries_exceeded";
    };
  };

  // Domain Status Evolution
  domainStatusFlow: {
    lifecycle: {
      initial: "pending";
      afterGeneration: "fetched";
      afterDNS: "resolved | unresolved";
      afterHTTP: "validated | failed";
      afterScoring: "qualified | unqualified";
    };
    crossCampaignInheritance: {
      domainReuse: "qualified_domains_available_for_new_campaigns";
      dataInheritance: "dns_results + http_results + keyword_scores";
      statusValidation: "ensure_domain_ready_for_phase";
    };
  };

  // Service Layer Dependencies
  serviceDependencies: {
    campaignOrchestratorService: {
      depends_on: [
        "domainGenerationService",
        "dnsService", 
        "httpKeywordService",
        "campaignStateMachine"
      ];
      stores: [
        "campaignStore",
        "personaStore", 
        "keywordStore",
        "auditLogStore",
        "campaignJobStore"
      ];
    };
    domainGenerationService: {
      depends_on: ["keywordExtractor", "configService"];
      generates: "domain_variants_based_on_keyword_rules";
    };
    dnsService: {
      depends_on: ["dnsValidator", "personaManager", "proxyManager"];
      validates: "domain_resolution_with_persona_rotation";
    };
    httpKeywordService: {
      depends_on: ["httpValidator", "keywordScanner", "contentFetcher"];
      validates: "keyword_presence_with_stealth_techniques";
    };
  };
}

export const BACKEND_DATA_FLOW_PATTERNS: BackendDataFlowPatterns = {
  campaignOrchestration: {
    phases: {
      domainGeneration: {
        input: "campaign_config",
        output: "generated_domains[]",
        dependencies: ["campaign_settings", "keyword_rules"],
        triggers: ["manual_start", "scheduled_start"]
      },
      dnsValidation: {
        input: "generated_domains[]",
        output: "validated_domains[]", 
        dependencies: ["dns_personas", "resolvers_config"],
        triggers: ["domain_generation_complete", "manual_trigger"]
      },
      httpKeywordValidation: {
        input: "validated_domains[]",
        output: "qualified_leads[]",
        dependencies: ["http_personas", "keyword_sets", "proxy_config"],
        triggers: ["dns_validation_complete", "manual_trigger"]
      }
    },
    stateTransitions: {
      pending_to_queued: "campaign_validation_passed",
      queued_to_running: "worker_available",
      running_to_paused: "user_request | error_threshold_exceeded",
      running_to_completed: "all_phases_complete",
      running_to_failed: "critical_error | max_retries_exceeded"
    }
  },

  domainStatusFlow: {
    lifecycle: {
      initial: "pending",
      afterGeneration: "fetched", 
      afterDNS: "resolved | unresolved",
      afterHTTP: "validated | failed",
      afterScoring: "qualified | unqualified"
    },
    crossCampaignInheritance: {
      domainReuse: "qualified_domains_available_for_new_campaigns",
      dataInheritance: "dns_results + http_results + keyword_scores",
      statusValidation: "ensure_domain_ready_for_phase"
    }
  },

  serviceDependencies: {
    campaignOrchestratorService: {
      depends_on: [
        "domainGenerationService",
        "dnsService",
        "httpKeywordService", 
        "campaignStateMachine"
      ],
      stores: [
        "campaignStore",
        "personaStore",
        "keywordStore",
        "auditLogStore",
        "campaignJobStore"
      ]
    },
    domainGenerationService: {
      depends_on: ["keywordExtractor", "configService"],
      generates: "domain_variants_based_on_keyword_rules"
    },
    dnsService: {
      depends_on: ["dnsValidator", "personaManager", "proxyManager"],
      validates: "domain_resolution_with_persona_rotation"
    },
    httpKeywordService: {
      depends_on: ["httpValidator", "keywordScanner", "contentFetcher"],
      validates: "keyword_presence_with_stealth_techniques"
    }
  }
};

/**
 * Backend Validation Rules
 */
export interface BackendValidationRules {
  campaignValidation: {
    domainGeneration: {
      required_fields: ["name", "keyword_sets", "domain_config"];
      max_domains_per_campaign: 10000;
      min_keyword_sets: 1;
      max_keyword_sets: 10;
    };
    dnsValidation: {
      required_fields: ["personas", "resolver_config"];
      max_concurrent_queries: 1000;
      timeout_range: [1, 300]; // seconds
      max_retries: 5;
    };
    httpValidation: {
      required_fields: ["personas", "keyword_sets"];
      max_concurrent_requests: 100;
      timeout_range: [5, 120]; // seconds
      required_user_agent: true;
    };
  };

  personaValidation: {
    dns: {
      required_fields: ["name", "resolvers"];
      max_resolvers: 50;
      min_query_timeout: 1;
      max_query_timeout: 300;
    };
    http: {
      required_fields: ["name", "user_agent"];
      required_headers: ["User-Agent", "Accept"];
      max_headers: 50;
      max_user_agent_length: 500;
    };
  };

  proxyValidation: {
    required_fields: ["host", "port", "protocol"];
    supported_protocols: ["http", "https", "socks5", "socks4"];
    port_range: [1, 65535];
    max_proxies_per_persona: 100;
  };
}

export const BACKEND_VALIDATION_RULES: BackendValidationRules = {
  campaignValidation: {
    domainGeneration: {
      required_fields: ["name", "keyword_sets", "domain_config"],
      max_domains_per_campaign: 10000,
      min_keyword_sets: 1,
      max_keyword_sets: 10
    },
    dnsValidation: {
      required_fields: ["personas", "resolver_config"],
      max_concurrent_queries: 1000,
      timeout_range: [1, 300],
      max_retries: 5
    },
    httpValidation: {
      required_fields: ["personas", "keyword_sets"],
      max_concurrent_requests: 100,
      timeout_range: [5, 120],
      required_user_agent: true
    }
  },

  personaValidation: {
    dns: {
      required_fields: ["name", "resolvers"],
      max_resolvers: 50,
      min_query_timeout: 1,
      max_query_timeout: 300
    },
    http: {
      required_fields: ["name", "user_agent"],
      required_headers: ["User-Agent", "Accept"],
      max_headers: 50,
      max_user_agent_length: 500
    }
  },

  proxyValidation: {
    required_fields: ["host", "port", "protocol"],
    supported_protocols: ["http", "https", "socks5", "socks4"],
    port_range: [1, 65535],
    max_proxies_per_persona: 100
  }
};