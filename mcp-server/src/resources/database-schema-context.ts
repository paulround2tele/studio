/**
 * Database Schema Context Provider
 * 
 * Provides comprehensive context about PostgreSQL database schema,
 * relationships, and data architecture that serves as the source of truth.
 */

export interface DatabaseSchemaContext {
  // Database Architecture Overview
  databaseArchitecture: {
    engine: "PostgreSQL 15+";
    extensions: ["uuid-ossp", "pgcrypto"];
    schemas: ["public", "auth"];
    connectionPool: {
      maxConnections: 25;
      maxIdleConnections: 5;
      connectionLifetime: "1h";
    };
    backupStrategy: "Daily automated backups with point-in-time recovery";
    indexStrategy: "Optimized for read-heavy workloads with selective indexing";
  };

  // Core Table Structures
  coreTableStructures: {
    // Authentication Schema Tables
    "auth.users": {
      purpose: "User account management with security features";
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()";
        email: "VARCHAR(255) UNIQUE NOT NULL";
        email_verified: "BOOLEAN DEFAULT FALSE";
        email_verification_token: "VARCHAR(255)";
        email_verification_expires_at: "TIMESTAMP";
        password_hash: "VARCHAR(255) NOT NULL";
        password_pepper_version: "INTEGER DEFAULT 1";
        first_name: "VARCHAR(100) NOT NULL";
        last_name: "VARCHAR(100) NOT NULL";
        avatar_url: "TEXT";
        is_active: "BOOLEAN DEFAULT TRUE";
        is_locked: "BOOLEAN DEFAULT FALSE";
        failed_login_attempts: "INTEGER DEFAULT 0";
        locked_until: "TIMESTAMP";
        last_login_at: "TIMESTAMP";
        last_login_ip: "INET";
        password_changed_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
        must_change_password: "BOOLEAN DEFAULT FALSE";
        mfa_enabled: "BOOLEAN NOT NULL DEFAULT FALSE";
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
      };
      indexes: [
        "idx_users_email", "idx_users_active", "idx_users_locked",
        "idx_users_email_verification", "idx_users_last_login"
      ];
      constraints: ["email_format_check", "password_complexity_check"];
    };

    "auth.sessions": {
      purpose: "Session-based authentication with fingerprinting";
      columns: {
        id: "VARCHAR(128) PRIMARY KEY";
        user_id: "UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE";
        ip_address: "INET";
        user_agent: "TEXT";
        user_agent_hash: "VARCHAR(64)";
        session_fingerprint: "VARCHAR(255)";
        browser_fingerprint: "TEXT";
        screen_resolution: "VARCHAR(20)";
        is_active: "BOOLEAN DEFAULT TRUE";
        expires_at: "TIMESTAMP NOT NULL";
        last_activity_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
      };
      indexes: [
        "idx_sessions_user_id", "idx_sessions_expires_at", "idx_sessions_active",
        "idx_sessions_last_activity", "idx_sessions_fingerprint", "idx_sessions_validation"
      ];
      features: ["automatic_cleanup", "fingerprint_validation", "activity_tracking"];
    };

    "auth.roles": {
      purpose: "Role definitions for RBAC system";
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()";
        name: "VARCHAR(50) UNIQUE NOT NULL";
        display_name: "VARCHAR(100) NOT NULL";
        description: "TEXT";
        is_system_role: "BOOLEAN DEFAULT FALSE";
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
      };
      predefinedRoles: ["admin", "user", "campaign_manager", "analyst"];
    };

    "auth.permissions": {
      purpose: "Permission definitions for granular access control";
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()";
        name: "VARCHAR(100) UNIQUE NOT NULL";
        display_name: "VARCHAR(150) NOT NULL";
        description: "TEXT";
        resource: "VARCHAR(50) NOT NULL";
        action: "VARCHAR(20) NOT NULL";
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
      };
      uniqueConstraints: ["UNIQUE(resource, action)"];
      resourceActions: {
        campaigns: ["create", "read", "update", "delete", "execute"];
        personas: ["create", "read", "update", "delete", "test"];
        proxies: ["create", "read", "update", "delete", "test"];
        users: ["create", "read", "update", "delete", "manage_roles"];
      };
    };

    // Campaign System Tables
    campaigns: {
      purpose: "Campaign definitions and metadata";
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()";
        name: "VARCHAR(255) NOT NULL";
        description: "TEXT";
        type: "campaign_type_enum NOT NULL";
        status: "campaign_status_enum DEFAULT 'pending'";
        config: "JSONB NOT NULL";
        created_by: "UUID NOT NULL REFERENCES auth.users(id)";
        parent_campaign_id: "UUID REFERENCES campaigns(id)";
        start_time: "TIMESTAMP";
        end_time: "TIMESTAMP";
        estimated_completion: "TIMESTAMP";
        progress_percentage: "DECIMAL(5,2) DEFAULT 0.00";
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
      };
      indexes: [
        "idx_campaigns_type", "idx_campaigns_status", "idx_campaigns_created_by",
        "idx_campaigns_parent", "idx_campaigns_created_at"
      ];
      jsonbColumns: {
        config: "Campaign-type specific configuration (DNS settings, HTTP settings, etc.)";
      };
    };

    campaign_jobs: {
      purpose: "Background job tracking for campaign execution";
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()";
        campaign_id: "UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE";
        job_type: "VARCHAR(50) NOT NULL";
        status: "campaign_job_status_enum DEFAULT 'pending'";
        priority: "INTEGER DEFAULT 0";
        payload: "JSONB";
        result: "JSONB";
        error_message: "TEXT";
        retry_count: "INTEGER DEFAULT 0";
        max_retries: "INTEGER DEFAULT 3";
        started_at: "TIMESTAMP";
        completed_at: "TIMESTAMP";
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
      };
      indexes: [
        "idx_campaign_jobs_campaign_id", "idx_campaign_jobs_status",
        "idx_campaign_jobs_priority", "idx_campaign_jobs_created_at"
      ];
    };

    // Domain and Validation Tables
    domains: {
      purpose: "Domain records with status tracking across campaigns";
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()";
        domain_name: "VARCHAR(255) NOT NULL";
        original_campaign_id: "UUID REFERENCES campaigns(id)";
        current_status: "validation_status_enum DEFAULT 'pending'";
        dns_status: "dns_validation_status_enum";
        http_status: "http_validation_status_enum";
        qualification_score: "DECIMAL(5,2)";
        metadata: "JSONB";
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
      };
      indexes: [
        "idx_domains_name", "idx_domains_status", "idx_domains_campaign",
        "idx_domains_score", "idx_domains_created_at"
      ];
      uniqueConstraints: ["UNIQUE(domain_name, original_campaign_id)"];
    };

    domain_validations: {
      purpose: "Detailed validation results for each domain";
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()";
        domain_id: "UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE";
        campaign_id: "UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE";
        validation_type: "VARCHAR(20) NOT NULL";
        status: "validation_status_enum NOT NULL";
        persona_id: "UUID REFERENCES personas(id)";
        proxy_id: "UUID REFERENCES proxies(id)";
        result_data: "JSONB";
        error_message: "TEXT";
        response_time_ms: "INTEGER";
        validated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
      };
      indexes: [
        "idx_domain_validations_domain_id", "idx_domain_validations_campaign_id",
        "idx_domain_validations_type_status", "idx_domain_validations_validated_at"
      ];
    };

    // Persona System Tables
    personas: {
      purpose: "DNS and HTTP persona configurations";
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()";
        name: "VARCHAR(255) NOT NULL";
        type: "persona_type_enum NOT NULL";
        config: "JSONB NOT NULL";
        is_active: "BOOLEAN DEFAULT TRUE";
        description: "TEXT";
        success_rate: "DECIMAL(5,2)";
        last_used_at: "TIMESTAMP";
        usage_count: "INTEGER DEFAULT 0";
        created_by: "UUID NOT NULL REFERENCES auth.users(id)";
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
      };
      indexes: [
        "idx_personas_type", "idx_personas_active", "idx_personas_created_by",
        "idx_personas_success_rate", "idx_personas_last_used"
      ];
      jsonbColumns: {
        config: "Type-specific configuration (DNS resolvers, HTTP headers, etc.)";
      };
    };

    // Keyword System Tables
    keyword_sets: {
      purpose: "Keyword collections with scoring rules";
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()";
        name: "VARCHAR(255) NOT NULL";
        description: "TEXT";
        category: "VARCHAR(50)";
        scoring_config: "JSONB";
        is_active: "BOOLEAN DEFAULT TRUE";
        created_by: "UUID NOT NULL REFERENCES auth.users(id)";
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
      };
      indexes: [
        "idx_keyword_sets_category", "idx_keyword_sets_active", 
        "idx_keyword_sets_created_by"
      ];
    };

    keyword_rules: {
      purpose: "Individual keyword rules within sets";
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()";
        keyword_set_id: "UUID NOT NULL REFERENCES keyword_sets(id) ON DELETE CASCADE";
        keyword: "VARCHAR(500) NOT NULL";
        rule_type: "keyword_rule_type_enum DEFAULT 'string'";
        weight: "DECIMAL(5,2) DEFAULT 1.00";
        is_active: "BOOLEAN DEFAULT TRUE";
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
      };
      indexes: [
        "idx_keyword_rules_set_id", "idx_keyword_rules_keyword",
        "idx_keyword_rules_type", "idx_keyword_rules_weight"
      ];
    };

    // Proxy System Tables
    proxies: {
      purpose: "Proxy server configurations for stealth operations";
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()";
        name: "VARCHAR(255) NOT NULL";
        host: "VARCHAR(255) NOT NULL";
        port: "INTEGER NOT NULL";
        protocol: "proxy_protocol_enum NOT NULL";
        username: "VARCHAR(255)";
        password: "VARCHAR(255)";
        is_active: "BOOLEAN DEFAULT TRUE";
        health_status: "VARCHAR(20) DEFAULT 'unknown'";
        response_time_ms: "INTEGER";
        last_health_check: "TIMESTAMP";
        success_rate: "DECIMAL(5,2)";
        usage_count: "INTEGER DEFAULT 0";
        created_by: "UUID NOT NULL REFERENCES auth.users(id)";
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP";
      };
      indexes: [
        "idx_proxies_protocol", "idx_proxies_active", "idx_proxies_health",
        "idx_proxies_success_rate", "idx_proxies_created_by"
      ];
      uniqueConstraints: ["UNIQUE(host, port, protocol)"];
    };
  };

  // Database Relationships
  relationshipPatterns: {
    oneToMany: {
      "auth.users -> campaigns": "User can own multiple campaigns";
      "campaigns -> campaign_jobs": "Campaign can have multiple background jobs";
      "campaigns -> domains": "Campaign can generate multiple domains";
      "domains -> domain_validations": "Domain can have multiple validation attempts";
      "keyword_sets -> keyword_rules": "Keyword set contains multiple rules";
      "auth.users -> personas": "User can create multiple personas";
      "auth.users -> proxies": "User can configure multiple proxies";
    };

    manyToMany: {
      "auth.users <-> auth.roles": "Users can have multiple roles, roles can be assigned to multiple users";
      "auth.roles <-> auth.permissions": "Roles can have multiple permissions, permissions can belong to multiple roles";
      "campaigns <-> personas": "Campaigns can use multiple personas, personas can be used by multiple campaigns";
      "campaigns <-> keyword_sets": "Campaigns can use multiple keyword sets, keyword sets can be used by multiple campaigns";
      "campaigns <-> proxies": "Campaigns can use multiple proxies, proxies can be used by multiple campaigns";
    };

    hierarchical: {
      "campaigns -> campaigns": "Parent-child campaign relationships for phased execution";
      "domains": "Cross-campaign domain inheritance and reuse";
    };

    referential: {
      "campaign_jobs.campaign_id -> campaigns.id": "CASCADE DELETE - Jobs are deleted with campaigns";
      "domain_validations.domain_id -> domains.id": "CASCADE DELETE - Validations are deleted with domains";
      "auth.sessions.user_id -> auth.users.id": "CASCADE DELETE - Sessions are deleted with users";
      "keyword_rules.keyword_set_id -> keyword_sets.id": "CASCADE DELETE - Rules are deleted with keyword sets";
    };
  };

  // Database Constraints and Business Rules
  constraintsAndBusinessRules: {
    uniqueConstraints: {
      "auth.users.email": "Email addresses must be unique across all users";
      "campaigns.name": "Campaign names must be unique per user";
      "personas.name": "Persona names must be unique per user";
      "keyword_sets.name": "Keyword set names must be unique per user";
      "proxies(host, port, protocol)": "Proxy configurations must be unique";
      "domains(domain_name, original_campaign_id)": "Domains must be unique per campaign";
    };

    checkConstraints: {
      "users.email": "Email format validation with regex";
      "proxies.port": "Port must be between 1 and 65535";
      "campaigns.progress_percentage": "Progress must be between 0.00 and 100.00";
      "personas.success_rate": "Success rate must be between 0.00 and 100.00";
      "keyword_rules.weight": "Weight must be positive";
    };

    foreignKeyConstraints: {
      cascadeDelete: [
        "auth.sessions -> auth.users",
        "campaign_jobs -> campaigns", 
        "domain_validations -> domains",
        "keyword_rules -> keyword_sets"
      ];
      restrictDelete: [
        "campaigns -> auth.users (created_by)",
        "personas -> auth.users (created_by)",
        "proxies -> auth.users (created_by)"
      ];
    };

    businessRules: {
      campaignExecution: [
        "Only one campaign of each type can run simultaneously per user",
        "DNS validation campaigns require at least one active DNS persona",
        "HTTP validation campaigns require at least one active HTTP persona and keyword set",
        "Paused campaigns can only be resumed by the owner or admin"
      ];
      domainManagement: [
        "Domains can be inherited across campaigns if qualification score > 7.0",
        "Domain validation attempts are limited to 5 per domain per campaign",
        "Qualified domains (score > 8.0) are automatically marked for lead generation"
      ];
      resourceUsage: [
        "Users are limited to 10 active personas per type",
        "Maximum 50 proxies per user account",
        "Campaign results are retained for 90 days after completion"
      ];
    };
  };

  // Database Performance Optimization
  performanceOptimization: {
    indexingStrategy: {
      primaryIndexes: "All tables have UUID primary keys with B-tree indexes";
      foreignKeyIndexes: "All foreign key columns are indexed for join performance";
      queryOptimizedIndexes: [
        "campaigns(type, status) - Campaign filtering",
        "domains(domain_name) - Domain lookups",
        "domain_validations(domain_id, validation_type) - Validation queries",
        "auth.sessions(expires_at, is_active) - Session cleanup",
        "campaign_jobs(status, priority) - Job queue processing"
      ];
      jsonbIndexes: [
        "campaigns.config using GIN - Configuration searches",
        "personas.config using GIN - Persona configuration queries",
        "domain_validations.result_data using GIN - Result analysis"
      ];
    };

    partitioningStrategy: {
      timeBasedPartitioning: [
        "domain_validations partitioned by validated_at (monthly)",
        "campaign_jobs partitioned by created_at (weekly)",
        "auth.sessions partitioned by created_at (daily)"
      ];
      hashPartitioning: [
        "domains partitioned by hash(domain_name) for large datasets"
      ];
    };

    archivalStrategy: {
      campaignData: "Archive completed campaigns older than 1 year to cold storage";
      sessionData: "Purge expired sessions daily with automated cleanup";
      validationResults: "Compress validation results older than 6 months";
      auditLogs: "Retain audit logs for 7 years with yearly archival";
    };

    connectionPooling: {
      application: "25 max connections, 5 idle connections";
      readReplicas: "Separate read-only connections for analytics";
      connectionLifetime: "1 hour maximum connection lifetime";
      healthChecks: "Connection validation on borrow";
    };
  };

  // Data Migration and Versioning
  migrationStrategy: {
    versionControl: "Sequential migration files with rollback support";
    migrationProcess: [
      "Backup before migration",
      "Run migration in transaction",
      "Validate data integrity",
      "Update schema version",
      "Clean up old structures"
    ];
    rollbackStrategy: "Each migration includes rollback SQL";
    testingApproach: "All migrations tested on staging before production";
    
    currentMigrations: [
      "001_phase1_critical_fixes.sql - Initial schema fixes",
      "002_phase2_database_field_mapping_fixes.sql - Field mapping corrections"
    ];
  };
}

export const DATABASE_SCHEMA_CONTEXT: DatabaseSchemaContext = {
  databaseArchitecture: {
    engine: "PostgreSQL 15+",
    extensions: ["uuid-ossp", "pgcrypto"],
    schemas: ["public", "auth"],
    connectionPool: {
      maxConnections: 25,
      maxIdleConnections: 5,
      connectionLifetime: "1h"
    },
    backupStrategy: "Daily automated backups with point-in-time recovery",
    indexStrategy: "Optimized for read-heavy workloads with selective indexing"
  },

  coreTableStructures: {
    "auth.users": {
      purpose: "User account management with security features",
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        email: "VARCHAR(255) UNIQUE NOT NULL",
        email_verified: "BOOLEAN DEFAULT FALSE",
        email_verification_token: "VARCHAR(255)",
        email_verification_expires_at: "TIMESTAMP",
        password_hash: "VARCHAR(255) NOT NULL",
        password_pepper_version: "INTEGER DEFAULT 1",
        first_name: "VARCHAR(100) NOT NULL",
        last_name: "VARCHAR(100) NOT NULL",
        avatar_url: "TEXT",
        is_active: "BOOLEAN DEFAULT TRUE",
        is_locked: "BOOLEAN DEFAULT FALSE",
        failed_login_attempts: "INTEGER DEFAULT 0",
        locked_until: "TIMESTAMP",
        last_login_at: "TIMESTAMP",
        last_login_ip: "INET",
        password_changed_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        must_change_password: "BOOLEAN DEFAULT FALSE",
        mfa_enabled: "BOOLEAN NOT NULL DEFAULT FALSE",
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      },
      indexes: [
        "idx_users_email", "idx_users_active", "idx_users_locked",
        "idx_users_email_verification", "idx_users_last_login"
      ],
      constraints: ["email_format_check", "password_complexity_check"]
    },

    "auth.sessions": {
      purpose: "Session-based authentication with fingerprinting",
      columns: {
        id: "VARCHAR(128) PRIMARY KEY",
        user_id: "UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE",
        ip_address: "INET",
        user_agent: "TEXT",
        user_agent_hash: "VARCHAR(64)",
        session_fingerprint: "VARCHAR(255)",
        browser_fingerprint: "TEXT",
        screen_resolution: "VARCHAR(20)",
        is_active: "BOOLEAN DEFAULT TRUE",
        expires_at: "TIMESTAMP NOT NULL",
        last_activity_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      },
      indexes: [
        "idx_sessions_user_id", "idx_sessions_expires_at", "idx_sessions_active",
        "idx_sessions_last_activity", "idx_sessions_fingerprint", "idx_sessions_validation"
      ],
      features: ["automatic_cleanup", "fingerprint_validation", "activity_tracking"]
    },

    "auth.roles": {
      purpose: "Role definitions for RBAC system",
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        name: "VARCHAR(50) UNIQUE NOT NULL",
        display_name: "VARCHAR(100) NOT NULL",
        description: "TEXT",
        is_system_role: "BOOLEAN DEFAULT FALSE",
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      },
      predefinedRoles: ["admin", "user", "campaign_manager", "analyst"]
    },

    "auth.permissions": {
      purpose: "Permission definitions for granular access control",
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        name: "VARCHAR(100) UNIQUE NOT NULL",
        display_name: "VARCHAR(150) NOT NULL",
        description: "TEXT",
        resource: "VARCHAR(50) NOT NULL",
        action: "VARCHAR(20) NOT NULL",
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      },
      uniqueConstraints: ["UNIQUE(resource, action)"],
      resourceActions: {
        campaigns: ["create", "read", "update", "delete", "execute"],
        personas: ["create", "read", "update", "delete", "test"],
        proxies: ["create", "read", "update", "delete", "test"],
        users: ["create", "read", "update", "delete", "manage_roles"]
      }
    },

    campaigns: {
      purpose: "Campaign definitions and metadata",
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        name: "VARCHAR(255) NOT NULL",
        description: "TEXT",
        type: "campaign_type_enum NOT NULL",
        status: "campaign_status_enum DEFAULT 'pending'",
        config: "JSONB NOT NULL",
        created_by: "UUID NOT NULL REFERENCES auth.users(id)",
        parent_campaign_id: "UUID REFERENCES campaigns(id)",
        start_time: "TIMESTAMP",
        end_time: "TIMESTAMP",
        estimated_completion: "TIMESTAMP",
        progress_percentage: "DECIMAL(5,2) DEFAULT 0.00",
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      },
      indexes: [
        "idx_campaigns_type", "idx_campaigns_status", "idx_campaigns_created_by",
        "idx_campaigns_parent", "idx_campaigns_created_at"
      ],
      jsonbColumns: {
        config: "Campaign-type specific configuration (DNS settings, HTTP settings, etc.)"
      }
    },

    campaign_jobs: {
      purpose: "Background job tracking for campaign execution",
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        campaign_id: "UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE",
        job_type: "VARCHAR(50) NOT NULL",
        status: "campaign_job_status_enum DEFAULT 'pending'",
        priority: "INTEGER DEFAULT 0",
        payload: "JSONB",
        result: "JSONB",
        error_message: "TEXT",
        retry_count: "INTEGER DEFAULT 0",
        max_retries: "INTEGER DEFAULT 3",
        started_at: "TIMESTAMP",
        completed_at: "TIMESTAMP",
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      },
      indexes: [
        "idx_campaign_jobs_campaign_id", "idx_campaign_jobs_status",
        "idx_campaign_jobs_priority", "idx_campaign_jobs_created_at"
      ]
    },

    domains: {
      purpose: "Domain records with status tracking across campaigns",
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        domain_name: "VARCHAR(255) NOT NULL",
        original_campaign_id: "UUID REFERENCES campaigns(id)",
        current_status: "validation_status_enum DEFAULT 'pending'",
        dns_status: "dns_validation_status_enum",
        http_status: "http_validation_status_enum",
        qualification_score: "DECIMAL(5,2)",
        metadata: "JSONB",
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      },
      indexes: [
        "idx_domains_name", "idx_domains_status", "idx_domains_campaign",
        "idx_domains_score", "idx_domains_created_at"
      ],
      uniqueConstraints: ["UNIQUE(domain_name, original_campaign_id)"]
    },

    domain_validations: {
      purpose: "Detailed validation results for each domain",
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        domain_id: "UUID NOT NULL REFERENCES domains(id) ON DELETE CASCADE",
        campaign_id: "UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE",
        validation_type: "VARCHAR(20) NOT NULL",
        status: "validation_status_enum NOT NULL",
        persona_id: "UUID REFERENCES personas(id)",
        proxy_id: "UUID REFERENCES proxies(id)",
        result_data: "JSONB",
        error_message: "TEXT",
        response_time_ms: "INTEGER",
        validated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      },
      indexes: [
        "idx_domain_validations_domain_id", "idx_domain_validations_campaign_id",
        "idx_domain_validations_type_status", "idx_domain_validations_validated_at"
      ]
    },

    personas: {
      purpose: "DNS and HTTP persona configurations",
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        name: "VARCHAR(255) NOT NULL",
        type: "persona_type_enum NOT NULL",
        config: "JSONB NOT NULL",
        is_active: "BOOLEAN DEFAULT TRUE",
        description: "TEXT",
        success_rate: "DECIMAL(5,2)",
        last_used_at: "TIMESTAMP",
        usage_count: "INTEGER DEFAULT 0",
        created_by: "UUID NOT NULL REFERENCES auth.users(id)",
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      },
      indexes: [
        "idx_personas_type", "idx_personas_active", "idx_personas_created_by",
        "idx_personas_success_rate", "idx_personas_last_used"
      ],
      jsonbColumns: {
        config: "Type-specific configuration (DNS resolvers, HTTP headers, etc.)"
      }
    },

    keyword_sets: {
      purpose: "Keyword collections with scoring rules",
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        name: "VARCHAR(255) NOT NULL",
        description: "TEXT",
        category: "VARCHAR(50)",
        scoring_config: "JSONB",
        is_active: "BOOLEAN DEFAULT TRUE",
        created_by: "UUID NOT NULL REFERENCES auth.users(id)",
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      },
      indexes: [
        "idx_keyword_sets_category", "idx_keyword_sets_active",
        "idx_keyword_sets_created_by"
      ]
    },

    keyword_rules: {
      purpose: "Individual keyword rules within sets",
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        keyword_set_id: "UUID NOT NULL REFERENCES keyword_sets(id) ON DELETE CASCADE",
        keyword: "VARCHAR(500) NOT NULL",
        rule_type: "keyword_rule_type_enum DEFAULT 'string'",
        weight: "DECIMAL(5,2) DEFAULT 1.00",
        is_active: "BOOLEAN DEFAULT TRUE",
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      },
      indexes: [
        "idx_keyword_rules_set_id", "idx_keyword_rules_keyword",
        "idx_keyword_rules_type", "idx_keyword_rules_weight"
      ]
    },

    proxies: {
      purpose: "Proxy server configurations for stealth operations",
      columns: {
        id: "UUID PRIMARY KEY DEFAULT gen_random_uuid()",
        name: "VARCHAR(255) NOT NULL",
        host: "VARCHAR(255) NOT NULL",
        port: "INTEGER NOT NULL",
        protocol: "proxy_protocol_enum NOT NULL",
        username: "VARCHAR(255)",
        password: "VARCHAR(255)",
        is_active: "BOOLEAN DEFAULT TRUE",
        health_status: "VARCHAR(20) DEFAULT 'unknown'",
        response_time_ms: "INTEGER",
        last_health_check: "TIMESTAMP",
        success_rate: "DECIMAL(5,2)",
        usage_count: "INTEGER DEFAULT 0",
        created_by: "UUID NOT NULL REFERENCES auth.users(id)",
        created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP"
      },
      indexes: [
        "idx_proxies_protocol", "idx_proxies_active", "idx_proxies_health",
        "idx_proxies_success_rate", "idx_proxies_created_by"
      ],
      uniqueConstraints: ["UNIQUE(host, port, protocol)"]
    }
  },

  relationshipPatterns: {
    oneToMany: {
      "auth.users -> campaigns": "User can own multiple campaigns",
      "campaigns -> campaign_jobs": "Campaign can have multiple background jobs",
      "campaigns -> domains": "Campaign can generate multiple domains",
      "domains -> domain_validations": "Domain can have multiple validation attempts",
      "keyword_sets -> keyword_rules": "Keyword set contains multiple rules",
      "auth.users -> personas": "User can create multiple personas",
      "auth.users -> proxies": "User can configure multiple proxies"
    },

    manyToMany: {
      "auth.users <-> auth.roles": "Users can have multiple roles, roles can be assigned to multiple users",
      "auth.roles <-> auth.permissions": "Roles can have multiple permissions, permissions can belong to multiple roles",
      "campaigns <-> personas": "Campaigns can use multiple personas, personas can be used by multiple campaigns",
      "campaigns <-> keyword_sets": "Campaigns can use multiple keyword sets, keyword sets can be used by multiple campaigns",
      "campaigns <-> proxies": "Campaigns can use multiple proxies, proxies can be used by multiple campaigns"
    },

    hierarchical: {
      "campaigns -> campaigns": "Parent-child campaign relationships for phased execution",
      "domains": "Cross-campaign domain inheritance and reuse"
    },

    referential: {
      "campaign_jobs.campaign_id -> campaigns.id": "CASCADE DELETE - Jobs are deleted with campaigns",
      "domain_validations.domain_id -> domains.id": "CASCADE DELETE - Validations are deleted with domains",
      "auth.sessions.user_id -> auth.users.id": "CASCADE DELETE - Sessions are deleted with users",
      "keyword_rules.keyword_set_id -> keyword_sets.id": "CASCADE DELETE - Rules are deleted with keyword sets"
    }
  },

  constraintsAndBusinessRules: {
    uniqueConstraints: {
      "auth.users.email": "Email addresses must be unique across all users",
      "campaigns.name": "Campaign names must be unique per user",
      "personas.name": "Persona names must be unique per user",
      "keyword_sets.name": "Keyword set names must be unique per user",
      "proxies(host, port, protocol)": "Proxy configurations must be unique",
      "domains(domain_name, original_campaign_id)": "Domains must be unique per campaign"
    },

    checkConstraints: {
      "users.email": "Email format validation with regex",
      "proxies.port": "Port must be between 1 and 65535",
      "campaigns.progress_percentage": "Progress must be between 0.00 and 100.00",
      "personas.success_rate": "Success rate must be between 0.00 and 100.00",
      "keyword_rules.weight": "Weight must be positive"
    },

    foreignKeyConstraints: {
      cascadeDelete: [
        "auth.sessions -> auth.users",
        "campaign_jobs -> campaigns",
        "domain_validations -> domains",
        "keyword_rules -> keyword_sets"
      ],
      restrictDelete: [
        "campaigns -> auth.users (created_by)",
        "personas -> auth.users (created_by)",
        "proxies -> auth.users (created_by)"
      ]
    },

    businessRules: {
      campaignExecution: [
        "Only one campaign of each type can run simultaneously per user",
        "DNS validation campaigns require at least one active DNS persona",
        "HTTP validation campaigns require at least one active HTTP persona and keyword set",
        "Paused campaigns can only be resumed by the owner or admin"
      ],
      domainManagement: [
        "Domains can be inherited across campaigns if qualification score > 7.0",
        "Domain validation attempts are limited to 5 per domain per campaign",
        "Qualified domains (score > 8.0) are automatically marked for lead generation"
      ],
      resourceUsage: [
        "Users are limited to 10 active personas per type",
        "Maximum 50 proxies per user account",
        "Campaign results are retained for 90 days after completion"
      ]
    }
  },

  performanceOptimization: {
    indexingStrategy: {
      primaryIndexes: "All tables have UUID primary keys with B-tree indexes",
      foreignKeyIndexes: "All foreign key columns are indexed for join performance",
      queryOptimizedIndexes: [
        "campaigns(type, status) - Campaign filtering",
        "domains(domain_name) - Domain lookups",
        "domain_validations(domain_id, validation_type) - Validation queries",
        "auth.sessions(expires_at, is_active) - Session cleanup",
        "campaign_jobs(status, priority) - Job queue processing"
      ],
      jsonbIndexes: [
        "campaigns.config using GIN - Configuration searches",
        "personas.config using GIN - Persona configuration queries",
        "domain_validations.result_data using GIN - Result analysis"
      ]
    },

    partitioningStrategy: {
      timeBasedPartitioning: [
        "domain_validations partitioned by validated_at (monthly)",
        "campaign_jobs partitioned by created_at (weekly)",
        "auth.sessions partitioned by created_at (daily)"
      ],
      hashPartitioning: [
        "domains partitioned by hash(domain_name) for large datasets"
      ]
    },

    archivalStrategy: {
      campaignData: "Archive completed campaigns older than 1 year to cold storage",
      sessionData: "Purge expired sessions daily with automated cleanup",
      validationResults: "Compress validation results older than 6 months",
      auditLogs: "Retain audit logs for 7 years with yearly archival"
    },

    connectionPooling: {
      application: "25 max connections, 5 idle connections",
      readReplicas: "Separate read-only connections for analytics",
      connectionLifetime: "1 hour maximum connection lifetime",
      healthChecks: "Connection validation on borrow"
    }
  },

  migrationStrategy: {
    versionControl: "Sequential migration files with rollback support",
    migrationProcess: [
      "Backup before migration",
      "Run migration in transaction",
      "Validate data integrity",
      "Update schema version",
      "Clean up old structures"
    ],
    rollbackStrategy: "Each migration includes rollback SQL",
    testingApproach: "All migrations tested on staging before production",

    currentMigrations: [
      "001_phase1_critical_fixes.sql - Initial schema fixes",
      "002_phase2_database_field_mapping_fixes.sql - Field mapping corrections"
    ]
  }
};