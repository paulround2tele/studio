# BL-007: INPUT VALIDATION WEAKNESSES - TACTICAL PLAN

**Finding ID**: BL-007  
**Priority**: HIGH  
**Phase**: 2B Security  
**Estimated Effort**: 3-4 days  
**Dependencies**: ✅ Phase 2A Foundation, ✅ BL-005 API Authorization, ✅ BL-006 Audit Context

---

## FINDING OVERVIEW

**Problem Statement**: Insufficient input validation across API endpoints and data processing pipelines, creating security vulnerabilities and potential data corruption risks.

**Root Cause**: Inconsistent validation patterns, missing sanitization for user inputs, insufficient type validation, and lack of comprehensive validation middleware across API endpoints.

**Impact**: 
- Potential injection attacks through malformed inputs
- Data corruption from invalid domain specifications
- API endpoint vulnerabilities from unvalidated parameters
- Business logic bypass through malformed campaign configurations

**Integration Points**: 
- Builds on BL-005 API authorization patterns
- Integrates with existing validation middleware patterns
- Enhances campaign and persona API handlers
- Connects to domain generation and keyword extraction services

---

## POSTGRESQL MIGRATION

**File**: `backend/database/migrations/011_bl007_input_validation_controls.sql`

```sql
BEGIN;

-- Input validation rules configuration
CREATE TABLE IF NOT EXISTS input_validation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint_pattern VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    validation_type VARCHAR(50) NOT NULL,
    validation_config JSONB NOT NULL DEFAULT '{}',
    error_message TEXT,
    is_required BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(endpoint_pattern, http_method, field_name)
);

CREATE INDEX idx_validation_rules_endpoint ON input_validation_rules(endpoint_pattern);
CREATE INDEX idx_validation_rules_method ON input_validation_rules(http_method);
CREATE INDEX idx_validation_rules_field ON input_validation_rules(field_name);

-- Insert comprehensive validation rules
INSERT INTO input_validation_rules 
    (endpoint_pattern, http_method, field_name, validation_type, validation_config, error_message, is_required) 
VALUES
    -- Campaign validation rules
    ('/api/campaigns', 'POST', 'name', 'string_length', '{"min_length": 3, "max_length": 100}', 'Campaign name must be between 3 and 100 characters', true),
    ('/api/campaigns', 'POST', 'type', 'enum', '{"allowed_values": ["dns_validation", "http_keyword", "domain_generation"]}', 'Invalid campaign type', true),
    ('/api/campaigns', 'POST', 'description', 'string_length', '{"min_length": 0, "max_length": 1000}', 'Description cannot exceed 1000 characters', false),
    ('/api/campaigns', 'POST', 'keywords', 'array_validation', '{"min_items": 1, "max_items": 1000, "item_type": "string"}', 'Keywords must be array of 1-1000 strings', false),
    ('/api/campaigns', 'POST', 'domains_to_generate', 'integer_range', '{"min": 1, "max": 100000}', 'Domains to generate must be between 1 and 100,000', false),
    
    -- Campaign update validation
    ('/api/campaigns/:id', 'PUT', 'name', 'string_length', '{"min_length": 3, "max_length": 100}', 'Campaign name must be between 3 and 100 characters', false),
    ('/api/campaigns/:id', 'PUT', 'status', 'enum', '{"allowed_values": ["pending", "running", "paused", "completed", "failed"]}', 'Invalid campaign status', false),
    
    -- Persona validation rules
    ('/api/personas', 'POST', 'name', 'string_length', '{"min_length": 3, "max_length": 50}', 'Persona name must be between 3 and 50 characters', true),
    ('/api/personas', 'POST', 'type', 'enum', '{"allowed_values": ["dns", "http"]}', 'Persona type must be dns or http', true),
    ('/api/personas', 'POST', 'config', 'json_schema', '{"schema": "persona_config"}', 'Invalid persona configuration', true),
    
    -- Domain generation validation
    ('/api/campaigns/:id/domains', 'POST', 'keywords', 'array_validation', '{"min_items": 1, "max_items": 100, "item_type": "string"}', 'Keywords array required with 1-100 items', true),
    ('/api/campaigns/:id/domains', 'POST', 'domain_count', 'integer_range', '{"min": 1, "max": 10000}', 'Domain count must be between 1 and 10,000', true),
    ('/api/campaigns/:id/domains', 'POST', 'tlds', 'array_validation', '{"min_items": 1, "max_items": 20, "item_type": "string"}', 'TLDs array required with 1-20 items', true),
    
    -- Admin endpoints validation
    ('/api/admin/users/:id', 'PUT', 'role', 'enum', '{"allowed_values": ["user", "admin"]}', 'Role must be user or admin', false),
    ('/api/admin/users/:id', 'PUT', 'is_active', 'boolean', '{}', 'is_active must be boolean', false);

-- Input validation violations tracking
CREATE TABLE IF NOT EXISTS input_validation_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    session_id VARCHAR(255),
    endpoint_pattern VARCHAR(255) NOT NULL,
    http_method VARCHAR(10) NOT NULL,
    field_name VARCHAR(100) NOT NULL,
    violation_type VARCHAR(100) NOT NULL,
    provided_value TEXT,
    expected_format TEXT,
    validation_rule JSONB,
    error_message TEXT,
    source_ip INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_validation_violations_user ON input_validation_violations(user_id);
CREATE INDEX idx_validation_violations_endpoint ON input_validation_violations(endpoint_pattern);
CREATE INDEX idx_validation_violations_field ON input_validation_violations(field_name);
CREATE INDEX idx_validation_violations_type ON input_validation_violations(violation_type);
CREATE INDEX idx_validation_violations_created ON input_validation_violations(created_at);

-- Suspicious input patterns detection
CREATE TABLE IF NOT EXISTS suspicious_input_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_name VARCHAR(100) NOT NULL,
    pattern_regex TEXT NOT NULL,
    risk_level VARCHAR(20) DEFAULT 'medium',
    description TEXT,
    detection_action VARCHAR(50) DEFAULT 'log',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(pattern_name)
);

-- Insert common suspicious patterns
INSERT INTO suspicious_input_patterns (pattern_name, pattern_regex, risk_level, description, detection_action) VALUES
    ('sql_injection', '(\''|(union\s+select)|(drop\s+table)|(insert\s+into)|(delete\s+from)|(update\s+set))', 'high', 'Potential SQL injection attempt', 'block'),
    ('xss_script', '(<script[^>]*>|<\/script>|javascript:|on\w+\s*=)', 'high', 'Potential XSS attack', 'block'),
    ('path_traversal', '(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\\)', 'medium', 'Path traversal attempt', 'log'),
    ('command_injection', '(;|\||&|`|\$\(|\${)', 'high', 'Potential command injection', 'block'),
    ('null_byte', '(%00|\\x00|\\0)', 'medium', 'Null byte injection', 'log'),
    ('excessive_length', '.{10000,}', 'low', 'Unusually long input', 'log');

-- Function to validate input against rules
CREATE OR REPLACE FUNCTION validate_input_field(
    p_endpoint_pattern VARCHAR(255),
    p_http_method VARCHAR(10),
    p_field_name VARCHAR(100),
    p_field_value TEXT,
    p_user_id UUID DEFAULT NULL,
    p_session_id VARCHAR(255) DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    validation_rule RECORD;
    config JSONB;
    validation_result JSONB;
    violation_id UUID;
    suspicious_pattern RECORD;
    pattern_matches BOOLEAN;
BEGIN
    -- Get validation rule
    SELECT * INTO validation_rule
    FROM input_validation_rules
    WHERE endpoint_pattern = p_endpoint_pattern 
      AND http_method = p_http_method 
      AND field_name = p_field_name;
    
    IF NOT FOUND THEN
        -- No specific rule, perform basic suspicious pattern check
        FOR suspicious_pattern IN 
            SELECT * FROM suspicious_input_patterns 
            WHERE detection_action IN ('block', 'log')
        LOOP
            SELECT p_field_value ~ suspicious_pattern.pattern_regex INTO pattern_matches;
            IF pattern_matches THEN
                -- Log suspicious pattern
                INSERT INTO input_validation_violations 
                    (user_id, session_id, endpoint_pattern, http_method, field_name, 
                     violation_type, provided_value, validation_rule, error_message)
                VALUES 
                    (p_user_id, p_session_id, p_endpoint_pattern, p_http_method, p_field_name,
                     'suspicious_pattern', p_field_value, 
                     jsonb_build_object('pattern', suspicious_pattern.pattern_name, 'risk_level', suspicious_pattern.risk_level),
                     suspicious_pattern.description);
                
                IF suspicious_pattern.detection_action = 'block' THEN
                    RETURN jsonb_build_object(
                        'valid', false,
                        'error_type', 'suspicious_pattern',
                        'error_message', suspicious_pattern.description,
                        'risk_level', suspicious_pattern.risk_level
                    );
                END IF;
            END IF;
        END LOOP;
        
        RETURN jsonb_build_object('valid', true, 'message', 'no_validation_rule');
    END IF;
    
    config := validation_rule.validation_config;
    
    -- Perform validation based on type
    CASE validation_rule.validation_type
        WHEN 'string_length' THEN
            IF length(p_field_value) < (config->>'min_length')::integer OR 
               length(p_field_value) > (config->>'max_length')::integer THEN
                validation_result := jsonb_build_object(
                    'valid', false,
                    'error_type', 'string_length',
                    'error_message', validation_rule.error_message,
                    'expected', config
                );
            ELSE
                validation_result := jsonb_build_object('valid', true);
            END IF;
            
        WHEN 'integer_range' THEN
            BEGIN
                IF p_field_value::integer < (config->>'min')::integer OR 
                   p_field_value::integer > (config->>'max')::integer THEN
                    validation_result := jsonb_build_object(
                        'valid', false,
                        'error_type', 'integer_range',
                        'error_message', validation_rule.error_message,
                        'expected', config
                    );
                ELSE
                    validation_result := jsonb_build_object('valid', true);
                END IF;
            EXCEPTION
                WHEN invalid_text_representation THEN
                    validation_result := jsonb_build_object(
                        'valid', false,
                        'error_type', 'invalid_integer',
                        'error_message', 'Value must be a valid integer'
                    );
            END;
            
        WHEN 'enum' THEN
            IF NOT (p_field_value = ANY(ARRAY(SELECT jsonb_array_elements_text(config->'allowed_values')))) THEN
                validation_result := jsonb_build_object(
                    'valid', false,
                    'error_type', 'enum_violation',
                    'error_message', validation_rule.error_message,
                    'allowed_values', config->'allowed_values'
                );
            ELSE
                validation_result := jsonb_build_object('valid', true);
            END IF;
            
        ELSE
            validation_result := jsonb_build_object(
                'valid', true,
                'message', 'validation_type_not_implemented'
            );
    END CASE;
    
    -- Log validation violation if invalid
    IF NOT (validation_result->>'valid')::boolean THEN
        INSERT INTO input_validation_violations 
            (user_id, session_id, endpoint_pattern, http_method, field_name, 
             violation_type, provided_value, expected_format, validation_rule, error_message)
        VALUES 
            (p_user_id, p_session_id, p_endpoint_pattern, p_http_method, p_field_name,
             validation_result->>'error_type', p_field_value, config::text, 
             row_to_json(validation_rule)::jsonb, validation_result->>'error_message');
    END IF;
    
    RETURN validation_result;
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

---

## IMPLEMENTATION GUIDANCE

### Step 1: Enhance Validation Middleware

**File**: `backend/internal/middleware/validation.go`

**Add comprehensive input validation middleware**:
```go
package middleware

import (
    "encoding/json"
    "fmt"
    "reflect"
    "strings"
    "time"
    
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
)

// InputValidationMiddleware provides comprehensive input validation
type InputValidationMiddleware struct {
    db                  *sqlx.DB
    suspiciousPatterns  map[string]*SuspiciousPattern
    validationCache     map[string]*ValidationRule
}

type ValidationResult struct {
    Valid        bool                   `json:"valid"`
    ErrorType    string                 `json:"error_type,omitempty"`
    ErrorMessage string                 `json:"error_message,omitempty"`
    FieldName    string                 `json:"field_name,omitempty"`
    ProvidedValue interface{}           `json:"provided_value,omitempty"`
    Expected     map[string]interface{} `json:"expected,omitempty"`
}

func NewInputValidationMiddleware(db *sqlx.DB) *InputValidationMiddleware {
    return &InputValidationMiddleware{
        db:              db,
        validationCache: make(map[string]*ValidationRule),
    }
}

// ValidateInput provides comprehensive input validation
func (ivm *InputValidationMiddleware) ValidateInput() gin.HandlerFunc {
    return func(c *gin.Context) {
        startTime := time.Now()
        
        // Extract user context for logging
        userContext, _ := ivm.getUserContext(c)
        
        // Get endpoint pattern and method
        endpointPattern := ivm.getEndpointPattern(c)
        httpMethod := c.Request.Method
        
        // Validate request body for POST/PUT requests
        if httpMethod == "POST" || httpMethod == "PUT" {
            if err := ivm.validateRequestBody(c, userContext, endpointPattern, httpMethod); err != nil {
                ivm.handleValidationError(c, err)
                return
            }
        }
        
        // Validate query parameters
        if err := ivm.validateQueryParameters(c, userContext, endpointPattern, httpMethod); err != nil {
            ivm.handleValidationError(c, err)
            return
        }
        
        // Validate path parameters
        if err := ivm.validatePathParameters(c, userContext, endpointPattern, httpMethod); err != nil {
            ivm.handleValidationError(c, err)
            return
        }
        
        // Store validation time for monitoring
        c.Set("validation_duration", time.Since(startTime))
        
        c.Next()
    }
}

func (ivm *InputValidationMiddleware) validateRequestBody(
    c *gin.Context,
    userContext *UserContext,
    endpointPattern, httpMethod string,
) error {
    if c.Request.ContentLength == 0 {
        return nil // No body to validate
    }
    
    // Parse JSON body
    var requestBody map[string]interface{}
    if err := c.ShouldBindJSON(&requestBody); err != nil {
        return &ValidationError{
            Field:   "request_body",
            Type:    "invalid_json",
            Message: "Request body must be valid JSON",
            Value:   nil,
        }
    }
    
    // Validate each field in the request body
    for fieldName, fieldValue := range requestBody {
        result, err := ivm.validateField(
            c.Request.Context(),
            endpointPattern, httpMethod, fieldName,
            ivm.convertToString(fieldValue),
            userContext,
        )
        
        if err != nil {
            return fmt.Errorf("validation error for field %s: %w", fieldName, err)
        }
        
        if !result.Valid {
            return &ValidationError{
                Field:   fieldName,
                Type:    result.ErrorType,
                Message: result.ErrorMessage,
                Value:   fieldValue,
            }
        }
    }
    
    return nil
}

func (ivm *InputValidationMiddleware) validateField(
    ctx context.Context,
    endpointPattern, httpMethod, fieldName, fieldValue string,
    userContext *UserContext,
) (*ValidationResult, error) {
    var resultJSON []byte
    query := `SELECT validate_input_field($1, $2, $3, $4, $5, $6)`
    
    var userID *uuid.UUID
    var sessionID *string
    
    if userContext != nil {
        userID = &userContext.UserID
        sessionID = &userContext.SessionID
    }
    
    err := ivm.db.QueryRowContext(
        ctx, query,
        endpointPattern, httpMethod, fieldName, fieldValue,
        userID, sessionID,
    ).Scan(&resultJSON)
    
    if err != nil {
        return nil, fmt.Errorf("validation check failed: %w", err)
    }
    
    var result ValidationResult
    if err := json.Unmarshal(resultJSON, &result); err != nil {
        return nil, fmt.Errorf("failed to parse validation result: %w", err)
    }
    
    return &result, nil
}

func (ivm *InputValidationMiddleware) convertToString(value interface{}) string {
    switch v := value.(type) {
    case string:
        return v
    case int, int64, float64:
        return fmt.Sprintf("%v", v)
    case bool:
        return fmt.Sprintf("%t", v)
    case []interface{}:
        jsonBytes, _ := json.Marshal(v)
        return string(jsonBytes)
    case map[string]interface{}:
        jsonBytes, _ := json.Marshal(v)
        return string(jsonBytes)
    default:
        return fmt.Sprintf("%v", v)
    }
}
```

### Step 2: Implement Domain-Specific Validation

**File**: `backend/internal/services/domain_validation_service.go`

```go
package services

import (
    "context"
    "fmt"
    "net"
    "regexp"
    "strings"
    "unicode"
    
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
)

// DomainValidationService provides domain-specific validation logic
type DomainValidationService struct {
    db                    *sqlx.DB
    validationMiddleware  *InputValidationMiddleware
    domainPatterns        map[string]*regexp.Regexp
    keywordPatterns       map[string]*regexp.Regexp
}

func NewDomainValidationService(db *sqlx.DB) *DomainValidationService {
    return &DomainValidationService{
        db: db,
        domainPatterns: map[string]*regexp.Regexp{
            "domain_name": regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$`),
            "subdomain":   regexp.MustCompile(`^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?$`),
            "tld":         regexp.MustCompile(`^[a-zA-Z]{2,}$`),
        },
        keywordPatterns: map[string]*regexp.Regexp{
            "safe_keyword": regexp.MustCompile(`^[a-zA-Z0-9\-_\s]{1,50}$`),
            "no_special":   regexp.MustCompile(`^[a-zA-Z0-9\-_]+$`),
        },
    }
}

// ValidateCampaignCreationRequest validates campaign creation with domain-specific rules
func (dvs *DomainValidationService) ValidateCampaignCreationRequest(
    ctx context.Context,
    request *models.CreateCampaignRequest,
    userID uuid.UUID,
) error {
    // Validate campaign name
    if err := dvs.validateCampaignName(request.Name); err != nil {
        return fmt.Errorf("invalid campaign name: %w", err)
    }
    
    // Validate campaign type
    if err := dvs.validateCampaignType(request.Type); err != nil {
        return fmt.Errorf("invalid campaign type: %w", err)
    }
    
    // Type-specific validation
    switch request.Type {
    case models.CampaignTypeDNSValidation:
        return dvs.validateDNSCampaignRequest(request)
    case models.CampaignTypeHTTPKeyword:
        return dvs.validateHTTPKeywordCampaignRequest(request)
    case models.CampaignTypeDomainGeneration:
        return dvs.validateDomainGenerationCampaignRequest(request)
    default:
        return fmt.Errorf("unsupported campaign type: %s", request.Type)
    }
}

func (dvs *DomainValidationService) validateCampaignName(name string) error {
    // Length validation
    if len(name) < 3 || len(name) > 100 {
        return fmt.Errorf("campaign name must be between 3 and 100 characters")
    }
    
    // Character validation
    for _, r := range name {
        if !unicode.IsLetter(r) && !unicode.IsNumber(r) && !unicode.IsSpace(r) && r != '-' && r != '_' {
            return fmt.Errorf("campaign name contains invalid character: %c", r)
        }
    }
    
    // Check for suspicious patterns
    suspiciousPatterns := []string{
        "<script", "javascript:", "data:", "vbscript:",
        "SELECT", "UNION", "DROP", "INSERT", "DELETE", "UPDATE",
        "../", "..\\", "%2e%2e",
    }
    
    lowerName := strings.ToLower(name)
    for _, pattern := range suspiciousPatterns {
        if strings.Contains(lowerName, strings.ToLower(pattern)) {
            return fmt.Errorf("campaign name contains potentially malicious content")
        }
    }
    
    return nil
}

func (dvs *DomainValidationService) validateDomainGenerationCampaignRequest(request *models.CreateCampaignRequest) error {
    config := request.DomainGenerationConfig
    if config == nil {
        return fmt.Errorf("domain generation configuration is required")
    }
    
    // Validate keywords
    if err := dvs.validateKeywords(config.Keywords); err != nil {
        return fmt.Errorf("invalid keywords: %w", err)
    }
    
    // Validate TLDs
    if err := dvs.validateTLDs(config.TLDs); err != nil {
        return fmt.Errorf("invalid TLDs: %w", err)
    }
    
    // Validate domain count
    if config.DomainsToGenerate < 1 || config.DomainsToGenerate > 100000 {
        return fmt.Errorf("domains to generate must be between 1 and 100,000")
    }
    
    // Validate generation patterns
    if len(config.GenerationPatterns) == 0 {
        return fmt.Errorf("at least one generation pattern is required")
    }
    
    for _, pattern := range config.GenerationPatterns {
        if err := dvs.validateGenerationPattern(pattern); err != nil {
            return fmt.Errorf("invalid generation pattern %s: %w", pattern, err)
        }
    }
    
    return nil
}

func (dvs *DomainValidationService) validateKeywords(keywords []string) error {
    if len(keywords) == 0 {
        return fmt.Errorf("at least one keyword is required")
    }
    
    if len(keywords) > 1000 {
        return fmt.Errorf("maximum 1000 keywords allowed")
    }
    
    for i, keyword := range keywords {
        if len(keyword) == 0 {
            return fmt.Errorf("keyword %d is empty", i+1)
        }
        
        if len(keyword) > 50 {
            return fmt.Errorf("keyword %d exceeds 50 characters", i+1)
        }
        
        if !dvs.keywordPatterns["safe_keyword"].MatchString(keyword) {
            return fmt.Errorf("keyword %d contains invalid characters: %s", i+1, keyword)
        }
        
        // Check for malicious content
        if dvs.containsSuspiciousContent(keyword) {
            return fmt.Errorf("keyword %d contains potentially malicious content: %s", i+1, keyword)
        }
    }
    
    return nil
}

func (dvs *DomainValidationService) validateTLDs(tlds []string) error {
    if len(tlds) == 0 {
        return fmt.Errorf("at least one TLD is required")
    }
    
    if len(tlds) > 20 {
        return fmt.Errorf("maximum 20 TLDs allowed")
    }
    
    validTLDs := map[string]bool{
        "com": true, "org": true, "net": true, "edu": true, "gov": true,
        "mil": true, "int": true, "info": true, "biz": true, "name": true,
        "pro": true, "aero": true, "coop": true, "museum": true,
        // Add more valid TLDs as needed
    }
    
    for i, tld := range tlds {
        tld = strings.ToLower(strings.TrimSpace(tld))
        
        if !dvs.domainPatterns["tld"].MatchString(tld) {
            return fmt.Errorf("TLD %d has invalid format: %s", i+1, tld)
        }
        
        if !validTLDs[tld] {
            return fmt.Errorf("TLD %d is not supported: %s", i+1, tld)
        }
    }
    
    return nil
}

func (dvs *DomainValidationService) containsSuspiciousContent(input string) bool {
    suspiciousPatterns := []string{
        "<script", "javascript:", "data:", "vbscript:", "onload=", "onerror=",
        "SELECT", "UNION", "DROP", "INSERT", "DELETE", "UPDATE", "FROM", "WHERE",
        "../", "..\\", "%2e%2e", "%00", "\\x00", "\\0",
        ";", "|", "&", "`", "$(", "${",
    }
    
    lowerInput := strings.ToLower(input)
    for _, pattern := range suspiciousPatterns {
        if strings.Contains(lowerInput, strings.ToLower(pattern)) {
            return true
        }
    }
    
    return false
}
```

### Step 3: Add Campaign Handler Validation

**File**: `backend/internal/api/campaign_orchestrator_handlers.go`

**Add comprehensive validation to campaign handlers**:
```go
func (h *CampaignOrchestratorHandlers) CreateCampaign(c *gin.Context) {
    // Parse request with validation
    var request models.CreateCampaignRequest
    if err := c.ShouldBindJSON(&request); err != nil {
        c.JSON(400, gin.H{
            "error":   "invalid_request_format",
            "message": "Request body must be valid JSON",
            "details": err.Error(),
        })
        return
    }
    
    // Get user context
    userContext, _ := c.Get("user_context")
    user := userContext.(*UserContext)
    
    // Perform domain-specific validation
    if err := h.domainValidationService.ValidateCampaignCreationRequest(
        c.Request.Context(),
        &request,
        user.UserID,
    ); err != nil {
        // Log validation violation
        h.logValidationViolation(c, user, "campaign_creation", err)
        
        c.JSON(400, gin.H{
            "error":   "validation_failed",
            "message": err.Error(),
        })
        return
    }
    
    // Additional business logic validation
    if err := h.validateBusinessRules(c.Request.Context(), &request, user); err != nil {
        c.JSON(422, gin.H{
            "error":   "business_rule_violation",
            "message": err.Error(),
        })
        return
    }
    
    // Proceed with creation
    campaign, err := h.campaignService.CreateCampaignWithAuthorizationContext(
        c.Request.Context(),
        &request,
        user.UserID,
        map[string]interface{}{
            "endpoint":     c.FullPath(),
            "method":       c.Request.Method,
            "source_ip":    c.ClientIP(),
            "user_agent":   c.Request.UserAgent(),
            "validated_at": time.Now(),
        },
    )
    
    if err != nil {
        h.handleCampaignError(c, err)
        return
    }
    
    c.JSON(201, campaign)
}

func (h *CampaignOrchestratorHandlers) validateBusinessRules(
    ctx context.Context,
    request *models.CreateCampaignRequest,
    user *UserContext,
) error {
    // Check user's campaign quota
    campaignCount, err := h.campaignService.GetUserCampaignCount(ctx, user.UserID)
    if err != nil {
        return fmt.Errorf("failed to check campaign quota: %w", err)
    }
    
    maxCampaigns := h.getUserMaxCampaigns(user.Role)
    if campaignCount >= maxCampaigns {
        return fmt.Errorf("campaign quota exceeded: %d/%d campaigns", campaignCount, maxCampaigns)
    }
    
    // Validate domain generation limits for non-admin users
    if request.Type == models.CampaignTypeDomainGeneration && user.Role != "admin" {
        if request.DomainGenerationConfig.DomainsToGenerate > 10000 {
            return fmt.Errorf("non-admin users limited to 10,000 domains per campaign")
        }
    }
    
    return nil
}

func (h *CampaignOrchestratorHandlers) logValidationViolation(
    c *gin.Context,
    user *UserContext,
    operation string,
    validationError error,
) {
    violation := &ValidationViolation{
        UserID:          user.UserID,
        SessionID:       user.SessionID,
        EndpointPattern: c.FullPath(),
        HTTPMethod:      c.Request.Method,
        Operation:       operation,
        ErrorMessage:    validationError.Error(),
        SourceIP:        c.ClientIP(),
        UserAgent:       c.Request.UserAgent(),
        RequestID:       c.GetString("request_id"),
        Timestamp:       time.Now(),
    }
    
    if err := h.validationViolationService.LogViolation(c.Request.Context(), violation); err != nil {
        log.Printf("WARNING: Failed to log validation violation: %v", err)
    }
}
```

### Step 4: Create Validation Testing Framework

**File**: `backend/internal/middleware/bl007_input_validation_test.go`

```go
package middleware

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    
    "github.com/gin-gonic/gin"
    "github.com/stretchr/testify/suite"
    "github.com/google/uuid"
    "your-project/internal/testutil"
)

type BL007InputValidationTestSuite struct {
    testutil.ServiceTestSuite
    validationMiddleware *InputValidationMiddleware
    router               *gin.Engine
}

func TestBL007InputValidation(t *testing.T) {
    suite.Run(t, &BL007InputValidationTestSuite{
        ServiceTestSuite: testutil.ServiceTestSuite{
            UseDatabaseFromEnv: true, // MANDATORY: Use domainflow_production database
        },
    })
}

func (suite *BL007InputValidationTestSuite) SetupTest() {
    suite.ServiceTestSuite.SetupTest()
    
    gin.SetMode(gin.TestMode)
    suite.router = gin.New()
    suite.validationMiddleware = NewInputValidationMiddleware(suite.db)
    
    // Setup test routes with validation middleware
    api := suite.router.Group("/api")
    api.Use(suite.validationMiddleware.ValidateInput())
    
    api.POST("/campaigns", suite.mockHandler)
    api.PUT("/campaigns/:id", suite.mockHandler)
    api.POST("/personas", suite.mockHandler)
}

func (suite *BL007InputValidationTestSuite) TestCampaignNameValidation() {
    // Test valid campaign name
    validCampaign := map[string]interface{}{
        "name": "Valid Campaign Name",
        "type": "dns_validation",
        "description": "A valid campaign description",
    }
    
    jsonData, _ := json.Marshal(validCampaign)
    req := httptest.NewRequest("POST", "/api/campaigns", bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    
    recorder := httptest.NewRecorder()
    suite.router.ServeHTTP(recorder, req)
    
    suite.Equal(200, recorder.Code, "Valid campaign should pass validation")
}

func (suite *BL007InputValidationTestSuite) TestCampaignNameTooShort() {
    invalidCampaign := map[string]interface{}{
        "name": "AB", // Too short
        "type": "dns_validation",
    }
    
    jsonData, _ := json.Marshal(invalidCampaign)
    req := httptest.NewRequest("POST", "/api/campaigns", bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    
    recorder := httptest.NewRecorder()
    suite.router.ServeHTTP(recorder, req)
    
    suite.Equal(400, recorder.Code, "Campaign name too short should be rejected")
    
    // Verify validation violation was logged
    suite.ValidateValidationViolationLogged("name", "string_length")
}

func (suite *BL007InputValidationTestSuite) TestSQLInjectionDetection() {
    maliciousCampaign := map[string]interface{}{
        "name": "Campaign'; DROP TABLE campaigns; --",
        "type": "dns_validation",
    }
    
    jsonData, _ := json.Marshal(maliciousCampaign)
    req := httptest.NewRequest("POST", "/api/campaigns", bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    
    recorder := httptest.NewRecorder()
    suite.router.ServeHTTP(recorder, req)
    
    suite.Equal(400, recorder.Code, "SQL injection attempt should be blocked")
    
    // Verify suspicious pattern was detected
    suite.ValidateSuspiciousPatternDetected("sql_injection")
}

func (suite *BL007InputValidationTestSuite) TestXSSDetection() {
    maliciousCampaign := map[string]interface{}{
        "name": "Campaign<script>alert('xss')</script>",
        "type": "dns_validation",
    }
    
    jsonData, _ := json.Marshal(maliciousCampaign)
    req := httptest.NewRequest("POST", "/api/campaigns", bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    
    recorder := httptest.NewRecorder()
    suite.router.ServeHTTP(recorder, req)
    
    suite.Equal(400, recorder.Code, "XSS attempt should be blocked")
    
    // Verify suspicious pattern was detected
    suite.ValidateSuspiciousPatternDetected("xss_script")
}

func (suite *BL007InputValidationTestSuite) TestDomainGenerationValidation() {
    // Test valid domain generation request
    validRequest := map[string]interface{}{
        "name": "Domain Generation Campaign",
        "type": "domain_generation",
        "domains_to_generate": 1000,
        "keywords": []string{"test", "example", "demo"},
        "tlds": []string{"com", "org", "net"},
    }
    
    jsonData, _ := json.Marshal(validRequest)
    req := httptest.NewRequest("POST", "/api/campaigns", bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    
    recorder := httptest.NewRecorder()
    suite.router.ServeHTTP(recorder, req)
    
    suite.Equal(200, recorder.Code, "Valid domain generation request should pass")
}

func (suite *BL007InputValidationTestSuite) TestExcessiveDomainCount() {
    invalidRequest := map[string]interface{}{
        "name": "Excessive Domain Generation",
        "type": "domain_generation",
        "domains_to_generate": 200000, // Exceeds limit
        "keywords": []string{"test"},
        "tlds": []string{"com"},
    }
    
    jsonData, _ := json.Marshal(invalidRequest)
    req := httptest.NewRequest("POST", "/api/campaigns", bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")
    
    recorder := httptest.NewRecorder()
    suite.router.ServeHTTP(recorder, req)
    
    suite.Equal(400, recorder.Code, "Excessive domain count should be rejected")
    
    // Verify validation violation was logged
    suite.ValidateValidationViolationLogged("domains_to_generate", "integer_range")
}

func (suite *BL007InputValidationTestSuite) mockHandler(c *gin.Context) {
    c.JSON(200, gin.H{"status": "validated"})
}

func (suite *BL007InputValidationTestSuite) ValidateValidationViolationLogged(fieldName, violationType string) {
    var count int
    query := `
        SELECT COUNT(*) 
        FROM input_validation_violations 
        WHERE field_name = $1 AND violation_type = $2`
    
    err := suite.db.Get(&count, query, fieldName, violationType)
    suite.NoError(err)
    suite.True(count > 0, "Validation violation should be logged")
}

func (suite *BL007InputValidationTestSuite) ValidateSuspiciousPatternDetected(patternName string) {
    var count int
    query := `
        SELECT COUNT(*) 
        FROM input_validation_violations 
        WHERE violation_type = 'suspicious_pattern' 
          AND validation_rule->>'pattern' = $1`
    
    err := suite.db.Get(&count, query, patternName)
    suite.NoError(err)
    suite.True(count > 0, "Suspicious pattern should be detected and logged")
}
```

---

## TESTING REQUIREMENTS

### Environment Setup
```bash
export TEST_POSTGRES_DSN="postgresql://username:password@localhost/domainflow_production"
export USE_REAL_DATABASE=true
export TEST_TIMEOUT=30s
export POSTGRES_DATABASE=domainflow_production
```

### Test Execution
```bash
# Run BL-007 specific tests against domainflow_production
go test ./internal/middleware -run TestBL007 -race -v -tags=integration

# Test domain validation service against domainflow_production
go test ./internal/services -run TestDomainValidation -race -v -tags=integration
```

---

## CI/CD VALIDATION CHECKLIST

### Mandatory Checks
- [ ] `go test ./... -race` passes with zero data races
- [ ] `golangci-lint run` clean with zero critical issues
- [ ] BL-007 input validation tests pass
- [ ] Suspicious pattern detection works correctly
- [ ] Domain-specific validation enforced
- [ ] Validation violations logged properly

### Database Validation
- [ ] Migration applies cleanly to `domainflow_production`
- [ ] Validation rules table populated correctly
- [ ] Suspicious pattern detection performs well
- [ ] Validation violation tracking scales properly

### Security Validation
- [ ] SQL injection attempts blocked
- [ ] XSS attacks detected and prevented
- [ ] Path traversal attempts logged
- [ ] Command injection patterns blocked
- [ ] Excessive input length handled properly

---

## SUCCESS CRITERIA

### Functional Requirements
1. **Comprehensive Validation**: All input fields validated according to defined rules
2. **Suspicious Pattern Detection**: Malicious input patterns detected and blocked
3. **Domain-Specific Rules**: Campaign and persona validation enforced
4. **Violation Tracking**: All validation failures logged with context

### Security Requirements
1. **Injection Prevention**: SQL injection, XSS, and command injection blocked
2. **Data Sanitization**: All user inputs sanitized and validated
3. **Business Rule Enforcement**: Domain generation limits and quotas enforced
4. **Real-time Detection**: Suspicious patterns detected in real-time

### Performance Requirements
1. **Validation Overhead**: < 5ms additional latency for input validation
2. **Pattern Matching**: Suspicious pattern detection < 1ms per field
3. **Database Performance**: Validation queries execute < 50ms

---

## ROLLBACK PROCEDURES

### Database Rollback
```sql
-- File: backend/database/migrations/011_rollback_bl007.sql
BEGIN;
DROP FUNCTION IF EXISTS validate_input_field(VARCHAR, VARCHAR, VARCHAR, TEXT, UUID, VARCHAR);
DROP TABLE IF EXISTS suspicious_input_patterns;
DROP TABLE IF EXISTS input_validation_violations;
DROP TABLE IF EXISTS input_validation_rules;
COMMIT;
```

---

**Implementation Priority**: HIGH - Essential for API security  
**Next Step**: Begin with PostgreSQL migration, then implement validation middleware  
**Security Completion**: Completes Phase 2B Security foundation for system protection