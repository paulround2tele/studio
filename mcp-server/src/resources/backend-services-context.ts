/**
 * Backend Services Context Provider
 * 
 * Provides comprehensive context about Go backend services, their interfaces,
 * and the service layer architecture that powers DomainFlow.
 */

export interface BackendServicesContext {
  // Service Layer Architecture
  serviceArchitecture: {
    campaignOrchestratorService: {
      purpose: "Orchestrates multi-phase campaign execution";
      dependencies: [
        "CampaignStore", "PersonaStore", "KeywordStore", 
        "AuditLogStore", "CampaignJobStore"
      ];
      subServices: [
        "DomainGenerationService", "DNSCampaignService", 
        "HTTPKeywordCampaignService"
      ];
      stateManagement: "CampaignStateMachine";
      keyMethods: [
        "CreateCampaign", "StartCampaign", "PauseCampaign",
        "ResumeCampaign", "GetCampaignStatus", "ValidatePhaseTransition"
      ];
    };

    domainGenerationService: {
      purpose: "Generates domain variations based on keyword rules";
      dependencies: ["KeywordExtractor", "ConfigService"];
      keyMethods: [
        "GenerateDomains", "ValidateKeywordRules", 
        "ApplyDomainFilters", "EstimateGenerationCount"
      ];
      algorithms: [
        "keyword_substitution", "tld_variation", 
        "prefix_suffix_combination", "domain_extension_expansion"
      ];
    };

    dnsService: {
      purpose: "Validates domain resolution with persona rotation";
      dependencies: ["DNSValidator", "PersonaManager", "ProxyManager"];
      keyMethods: [
        "ValidateDomains", "RotatePersonas", "HandleTimeouts",
        "ProcessResolutionResults", "ManageRateLimit"
      ];
      features: [
        "concurrent_queries", "resolver_failover", 
        "response_caching", "stealth_rotation"
      ];
    };

    httpKeywordService: {
      purpose: "Validates keyword presence with stealth techniques";
      dependencies: ["HTTPValidator", "KeywordScanner", "ContentFetcher"];
      keyMethods: [
        "FetchContent", "ScanKeywords", "CalculateScores",
        "RotatePersonas", "HandleErrors", "ProcessResults"
      ];
      features: [
        "anti_detection", "content_analysis", "keyword_scoring",
        "behavioral_simulation", "fingerprint_randomization"
      ];
    };

    campaignStateMachine: {
      purpose: "Manages campaign state transitions and validation";
      states: [
        "pending", "queued", "running", "pausing", 
        "paused", "completed", "failed", "cancelled", "archived"
      ];
      transitions: {
        "pending -> queued": "campaign_validation_passed";
        "queued -> running": "worker_available";
        "running -> paused": "user_request | error_threshold";
        "running -> completed": "all_phases_complete";
        "running -> failed": "critical_error | max_retries";
      };
      validationRules: [
        "check_prerequisites", "validate_resources", 
        "verify_permissions", "assess_dependencies"
      ];
    };
  };

  // Service Interface Definitions
  serviceInterfaces: {
    campaignOrchestratorService: {
      CreateCampaign: {
        input: "CreateCampaignRequest";
        output: "CampaignResponse | error";
        validation: ["user_permissions", "resource_limits", "config_validity"];
      };
      StartCampaign: {
        input: "campaignId UUID";
        output: "CampaignJobResponse | error";
        preconditions: ["campaign_exists", "not_already_running", "resources_available"];
      };
      GetCampaignStatus: {
        input: "campaignId UUID";
        output: "CampaignStatusResponse | error";
        includes: ["phase_progress", "performance_metrics", "error_summary"];
      };
      PauseCampaign: {
        input: "campaignId UUID";
        output: "CampaignResponse | error";
        behavior: "graceful_shutdown_with_state_preservation";
      };
      ResumeCampaign: {
        input: "campaignId UUID";
        output: "CampaignResponse | error";
        behavior: "resume_from_last_checkpoint";
      };
    };

    domainGenerationService: {
      GenerateDomains: {
        input: "GenerateDomainsRequest";
        output: "[]GeneratedDomain | error";
        features: ["keyword_expansion", "tld_variation", "filtering"];
      };
      ValidateKeywordRules: {
        input: "[]KeywordRule";
        output: "ValidationResult | error";
        checks: ["regex_validity", "rule_conflicts", "performance_impact"];
      };
      EstimateGenerationCount: {
        input: "GenerationConfig";
        output: "EstimationResult | error";
        purpose: "predict_domain_count_before_generation";
      };
    };

    dnsService: {
      ValidateDomains: {
        input: "DNSValidationRequest";
        output: "DNSValidationResponse | error";
        features: ["batch_processing", "persona_rotation", "error_handling"];
      };
      RotatePersonas: {
        input: "currentPersonaId UUID";
        output: "nextPersonaId UUID | error";
        strategy: "round_robin_with_failure_tracking";
      };
      ProcessResolutionResults: {
        input: "[]DNSResult";
        output: "ProcessedResults | error";
        processing: ["status_classification", "metadata_extraction", "caching"];
      };
    };

    httpKeywordService: {
      FetchContent: {
        input: "HTTPFetchRequest";
        output: "FetchedContent | error";
        features: ["stealth_headers", "proxy_rotation", "timeout_handling"];
      };
      ScanKeywords: {
        input: "content string, keywordSets []KeywordSet";
        output: "KeywordScanResult | error";
        algorithms: ["exact_match", "fuzzy_match", "context_analysis"];
      };
      CalculateScores: {
        input: "scanResults []KeywordScanResult";
        output: "ScoringResult | error";
        methods: ["weighted_sum", "tfidf", "context_aware"];
      };
    };
  };

  // Service Configuration Patterns
  serviceConfigPatterns: {
    concurrencyControl: {
      domainGeneration: {
        max_workers: 10;
        batch_size: 1000;
        memory_limit: "512MB";
        timeout: "5m";
      };
      dnsValidation: {
        max_concurrent_queries: 100;
        query_timeout: "10s";
        resolver_rotation_interval: "1m";
        rate_limit: "50qps";
      };
      httpValidation: {
        max_concurrent_requests: 50;
        request_timeout: "30s";
        persona_rotation_interval: "5m";
        rate_limit: "10rps";
      };
    };

    errorHandling: {
      retryStrategies: {
        dns_timeout: "exponential_backoff_3_attempts";
        http_5xx: "linear_backoff_5_attempts";
        network_error: "circuit_breaker_pattern";
        rate_limit: "adaptive_delay_with_jitter";
      };
      circuitBreaker: {
        failure_threshold: 5;
        recovery_timeout: "30s";
        half_open_max_requests: 3;
      };
      gracefulDegradation: {
        dns_fallback: "use_cached_results";
        http_fallback: "skip_content_analysis";
        proxy_fallback: "direct_connection";
      };
    };

    resourceManagement: {
      memoryManagement: {
        domain_cache_size: "100MB";
        result_cache_ttl: "1h";
        gc_interval: "10m";
        max_heap_size: "2GB";
      };
      connectionPooling: {
        db_max_open: 25;
        db_max_idle: 5;
        db_conn_lifetime: "1h";
        http_client_pool_size: 100;
      };
      rateLimiting: {
        per_user_limits: "1000req/h";
        per_ip_limits: "100req/m";
        global_limits: "10000req/m";
        burst_allowance: 10;
      };
    };
  };

  // Service Performance Characteristics
  servicePerformance: {
    benchmarks: {
      domainGeneration: {
        throughput: "1000 domains/second";
        memory_usage: "~0.5KB per domain";
        cpu_utilization: "moderate (keyword processing)";
        bottlenecks: ["regex_complexity", "database_writes"];
      };
      dnsValidation: {
        throughput: "50 queries/second per resolver";
        response_time: "p95 < 2s";
        success_rate: "> 98%";
        bottlenecks: ["resolver_capacity", "network_latency"];
      };
      httpValidation: {
        throughput: "10 requests/second per persona";
        response_time: "p95 < 10s";
        success_rate: "> 90%";
        bottlenecks: ["content_size", "anti_bot_detection"];
      };
    };

    scalingPatterns: {
      horizontal: {
        campaign_workers: "auto_scale_based_on_queue_depth";
        dns_validators: "scale_per_resolver_capacity";
        http_validators: "scale_per_persona_pool_size";
      };
      vertical: {
        memory_scaling: "increase_cache_sizes";
        cpu_scaling: "parallel_processing_threads";
        io_scaling: "connection_pool_expansion";
      };
    };

    monitoringMetrics: {
      throughput: ["domains_processed_per_second", "queries_per_second", "requests_per_second"];
      latency: ["p50_response_time", "p95_response_time", "p99_response_time"];
      errors: ["error_rate", "timeout_rate", "retry_rate"];
      resources: ["memory_usage", "cpu_usage", "connection_count"];
      business: ["campaign_completion_rate", "lead_qualification_rate", "cost_per_lead"];
    };
  };
}

export const BACKEND_SERVICES_CONTEXT: BackendServicesContext = {
  serviceArchitecture: {
    campaignOrchestratorService: {
      purpose: "Orchestrates multi-phase campaign execution",
      dependencies: [
        "CampaignStore", "PersonaStore", "KeywordStore",
        "AuditLogStore", "CampaignJobStore"
      ],
      subServices: [
        "DomainGenerationService", "DNSCampaignService",
        "HTTPKeywordCampaignService"
      ],
      stateManagement: "CampaignStateMachine",
      keyMethods: [
        "CreateCampaign", "StartCampaign", "PauseCampaign",
        "ResumeCampaign", "GetCampaignStatus", "ValidatePhaseTransition"
      ]
    },

    domainGenerationService: {
      purpose: "Generates domain variations based on keyword rules",
      dependencies: ["KeywordExtractor", "ConfigService"],
      keyMethods: [
        "GenerateDomains", "ValidateKeywordRules",
        "ApplyDomainFilters", "EstimateGenerationCount"
      ],
      algorithms: [
        "keyword_substitution", "tld_variation",
        "prefix_suffix_combination", "domain_extension_expansion"
      ]
    },

    dnsService: {
      purpose: "Validates domain resolution with persona rotation",
      dependencies: ["DNSValidator", "PersonaManager", "ProxyManager"],
      keyMethods: [
        "ValidateDomains", "RotatePersonas", "HandleTimeouts",
        "ProcessResolutionResults", "ManageRateLimit"
      ],
      features: [
        "concurrent_queries", "resolver_failover",
        "response_caching", "stealth_rotation"
      ]
    },

    httpKeywordService: {
      purpose: "Validates keyword presence with stealth techniques",
      dependencies: ["HTTPValidator", "KeywordScanner", "ContentFetcher"],
      keyMethods: [
        "FetchContent", "ScanKeywords", "CalculateScores",
        "RotatePersonas", "HandleErrors", "ProcessResults"
      ],
      features: [
        "anti_detection", "content_analysis", "keyword_scoring",
        "behavioral_simulation", "fingerprint_randomization"
      ]
    },

    campaignStateMachine: {
      purpose: "Manages campaign state transitions and validation",
      states: [
        "pending", "queued", "running", "pausing",
        "paused", "completed", "failed", "cancelled", "archived"
      ],
      transitions: {
        "pending -> queued": "campaign_validation_passed",
        "queued -> running": "worker_available",
        "running -> paused": "user_request | error_threshold",
        "running -> completed": "all_phases_complete",
        "running -> failed": "critical_error | max_retries"
      },
      validationRules: [
        "check_prerequisites", "validate_resources",
        "verify_permissions", "assess_dependencies"
      ]
    }
  },

  serviceInterfaces: {
    campaignOrchestratorService: {
      CreateCampaign: {
        input: "CreateCampaignRequest",
        output: "CampaignResponse | error",
        validation: ["user_permissions", "resource_limits", "config_validity"]
      },
      StartCampaign: {
        input: "campaignId UUID",
        output: "CampaignJobResponse | error",
        preconditions: ["campaign_exists", "not_already_running", "resources_available"]
      },
      GetCampaignStatus: {
        input: "campaignId UUID",
        output: "CampaignStatusResponse | error",
        includes: ["phase_progress", "performance_metrics", "error_summary"]
      },
      PauseCampaign: {
        input: "campaignId UUID",
        output: "CampaignResponse | error",
        behavior: "graceful_shutdown_with_state_preservation"
      },
      ResumeCampaign: {
        input: "campaignId UUID",
        output: "CampaignResponse | error",
        behavior: "resume_from_last_checkpoint"
      }
    },

    domainGenerationService: {
      GenerateDomains: {
        input: "GenerateDomainsRequest",
        output: "[]GeneratedDomain | error",
        features: ["keyword_expansion", "tld_variation", "filtering"]
      },
      ValidateKeywordRules: {
        input: "[]KeywordRule",
        output: "ValidationResult | error",
        checks: ["regex_validity", "rule_conflicts", "performance_impact"]
      },
      EstimateGenerationCount: {
        input: "GenerationConfig",
        output: "EstimationResult | error",
        purpose: "predict_domain_count_before_generation"
      }
    },

    dnsService: {
      ValidateDomains: {
        input: "DNSValidationRequest",
        output: "DNSValidationResponse | error",
        features: ["batch_processing", "persona_rotation", "error_handling"]
      },
      RotatePersonas: {
        input: "currentPersonaId UUID",
        output: "nextPersonaId UUID | error",
        strategy: "round_robin_with_failure_tracking"
      },
      ProcessResolutionResults: {
        input: "[]DNSResult",
        output: "ProcessedResults | error",
        processing: ["status_classification", "metadata_extraction", "caching"]
      }
    },

    httpKeywordService: {
      FetchContent: {
        input: "HTTPFetchRequest",
        output: "FetchedContent | error",
        features: ["stealth_headers", "proxy_rotation", "timeout_handling"]
      },
      ScanKeywords: {
        input: "content string, keywordSets []KeywordSet",
        output: "KeywordScanResult | error",
        algorithms: ["exact_match", "fuzzy_match", "context_analysis"]
      },
      CalculateScores: {
        input: "scanResults []KeywordScanResult",
        output: "ScoringResult | error",
        methods: ["weighted_sum", "tfidf", "context_aware"]
      }
    }
  },

  serviceConfigPatterns: {
    concurrencyControl: {
      domainGeneration: {
        max_workers: 10,
        batch_size: 1000,
        memory_limit: "512MB",
        timeout: "5m"
      },
      dnsValidation: {
        max_concurrent_queries: 100,
        query_timeout: "10s",
        resolver_rotation_interval: "1m",
        rate_limit: "50qps"
      },
      httpValidation: {
        max_concurrent_requests: 50,
        request_timeout: "30s",
        persona_rotation_interval: "5m",
        rate_limit: "10rps"
      }
    },

    errorHandling: {
      retryStrategies: {
        dns_timeout: "exponential_backoff_3_attempts",
        http_5xx: "linear_backoff_5_attempts",
        network_error: "circuit_breaker_pattern",
        rate_limit: "adaptive_delay_with_jitter"
      },
      circuitBreaker: {
        failure_threshold: 5,
        recovery_timeout: "30s",
        half_open_max_requests: 3
      },
      gracefulDegradation: {
        dns_fallback: "use_cached_results",
        http_fallback: "skip_content_analysis",
        proxy_fallback: "direct_connection"
      }
    },

    resourceManagement: {
      memoryManagement: {
        domain_cache_size: "100MB",
        result_cache_ttl: "1h",
        gc_interval: "10m",
        max_heap_size: "2GB"
      },
      connectionPooling: {
        db_max_open: 25,
        db_max_idle: 5,
        db_conn_lifetime: "1h",
        http_client_pool_size: 100
      },
      rateLimiting: {
        per_user_limits: "1000req/h",
        per_ip_limits: "100req/m",
        global_limits: "10000req/m",
        burst_allowance: 10
      }
    }
  },

  servicePerformance: {
    benchmarks: {
      domainGeneration: {
        throughput: "1000 domains/second",
        memory_usage: "~0.5KB per domain",
        cpu_utilization: "moderate (keyword processing)",
        bottlenecks: ["regex_complexity", "database_writes"]
      },
      dnsValidation: {
        throughput: "50 queries/second per resolver",
        response_time: "p95 < 2s",
        success_rate: "> 98%",
        bottlenecks: ["resolver_capacity", "network_latency"]
      },
      httpValidation: {
        throughput: "10 requests/second per persona",
        response_time: "p95 < 10s",
        success_rate: "> 90%",
        bottlenecks: ["content_size", "anti_bot_detection"]
      }
    },

    scalingPatterns: {
      horizontal: {
        campaign_workers: "auto_scale_based_on_queue_depth",
        dns_validators: "scale_per_resolver_capacity",
        http_validators: "scale_per_persona_pool_size"
      },
      vertical: {
        memory_scaling: "increase_cache_sizes",
        cpu_scaling: "parallel_processing_threads",
        io_scaling: "connection_pool_expansion"
      }
    },

    monitoringMetrics: {
      throughput: ["domains_processed_per_second", "queries_per_second", "requests_per_second"],
      latency: ["p50_response_time", "p95_response_time", "p99_response_time"],
      errors: ["error_rate", "timeout_rate", "retry_rate"],
      resources: ["memory_usage", "cpu_usage", "connection_count"],
      business: ["campaign_completion_rate", "lead_qualification_rate", "cost_per_lead"]
    }
  }
};