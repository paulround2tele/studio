package studio

// BackendModels provides simulated backend model information for analysis
// This is a simplified representation of the actual backend models for MCP analysis

// GetBackendModelTypes returns mock model structures for analysis
func GetBackendModelTypes() map[string]ModelInfo {
	return map[string]ModelInfo{
		"Campaign": {
			Name:    "Campaign",
			Package: "models",
			Type:    "struct",
			Fields: []FieldInfo{
				{Name: "ID", Type: "uuid.UUID", DBTag: "id", JSONTag: "id", IsPrimaryKey: true},
				{Name: "Name", Type: "string", DBTag: "name", JSONTag: "name", ValidateTag: "required", IsRequired: true},
				{Name: "Type", Type: "CampaignTypeEnum", DBTag: "type", JSONTag: "type", ValidateTag: "required,oneof=domain_generation dns_validation http_keyword_validation", IsRequired: true},
				{Name: "Status", Type: "CampaignStatusEnum", DBTag: "status", JSONTag: "status", ValidateTag: "required,oneof=pending queued running pausing paused completed failed archived cancelled", IsRequired: true},
				{Name: "Description", Type: "sql.NullString", DBTag: "description", JSONTag: "description,omitempty"},
				{Name: "ConfigDetails", Type: "json.RawMessage", DBTag: "config_details", JSONTag: "configDetails", ValidateTag: "required", IsRequired: true},
				{Name: "CreatedAt", Type: "time.Time", DBTag: "created_at", JSONTag: "createdAt"},
				{Name: "UpdatedAt", Type: "time.Time", DBTag: "updated_at", JSONTag: "updatedAt"},
			},
		},
		"User": {
			Name:    "User",
			Package: "models",
			Type:    "struct",
			Fields: []FieldInfo{
				{Name: "ID", Type: "uuid.UUID", DBTag: "id", JSONTag: "id", IsPrimaryKey: true},
				{Name: "Username", Type: "string", DBTag: "username", JSONTag: "username", ValidateTag: "required", IsRequired: true},
				{Name: "Email", Type: "string", DBTag: "email", JSONTag: "email", ValidateTag: "required,email", IsRequired: true},
				{Name: "PasswordHash", Type: "string", DBTag: "password_hash", JSONTag: "-"},
				{Name: "FirstName", Type: "sql.NullString", DBTag: "first_name", JSONTag: "firstName,omitempty"},
				{Name: "LastName", Type: "sql.NullString", DBTag: "last_name", JSONTag: "lastName,omitempty"},
				{Name: "IsActive", Type: "bool", DBTag: "is_active", JSONTag: "isActive"},
				{Name: "CreatedAt", Type: "time.Time", DBTag: "created_at", JSONTag: "createdAt"},
				{Name: "UpdatedAt", Type: "time.Time", DBTag: "updated_at", JSONTag: "updatedAt"},
			},
		},
		"Persona": {
			Name:    "Persona",
			Package: "models",
			Type:    "struct",
			Fields: []FieldInfo{
				{Name: "ID", Type: "uuid.UUID", DBTag: "id", JSONTag: "id", IsPrimaryKey: true},
				{Name: "Name", Type: "string", DBTag: "name", JSONTag: "name", ValidateTag: "required", IsRequired: true},
				{Name: "PersonaType", Type: "PersonaTypeEnum", DBTag: "persona_type", JSONTag: "personaType", ValidateTag: "required,oneof=dns http", IsRequired: true},
				{Name: "Description", Type: "sql.NullString", DBTag: "description", JSONTag: "description,omitempty"},
				{Name: "ConfigDetails", Type: "json.RawMessage", DBTag: "config_details", JSONTag: "configDetails", ValidateTag: "required", IsRequired: true},
				{Name: "IsEnabled", Type: "bool", DBTag: "is_enabled", JSONTag: "isEnabled"},
				{Name: "CreatedAt", Type: "time.Time", DBTag: "created_at", JSONTag: "createdAt"},
				{Name: "UpdatedAt", Type: "time.Time", DBTag: "updated_at", JSONTag: "updatedAt"},
			},
		},
		"Proxy": {
			Name:    "Proxy",
			Package: "models",
			Type:    "struct",
			Fields: []FieldInfo{
				{Name: "ID", Type: "uuid.UUID", DBTag: "id", JSONTag: "id", IsPrimaryKey: true},
				{Name: "Name", Type: "string", DBTag: "name", JSONTag: "name", ValidateTag: "required", IsRequired: true},
				{Name: "Description", Type: "sql.NullString", DBTag: "description", JSONTag: "description,omitempty"},
				{Name: "Address", Type: "string", DBTag: "address", JSONTag: "address", ValidateTag: "required", IsRequired: true},
				{Name: "Protocol", Type: "*ProxyProtocolEnum", DBTag: "protocol", JSONTag: "protocol,omitempty"},
				{Name: "Username", Type: "sql.NullString", DBTag: "username", JSONTag: "username,omitempty"},
				{Name: "PasswordHash", Type: "sql.NullString", DBTag: "password_hash", JSONTag: "-"},
				{Name: "Host", Type: "sql.NullString", DBTag: "host", JSONTag: "host,omitempty"},
				{Name: "Port", Type: "sql.NullInt32", DBTag: "port", JSONTag: "port,omitempty"},
				{Name: "IsEnabled", Type: "bool", DBTag: "is_enabled", JSONTag: "isEnabled"},
				{Name: "IsHealthy", Type: "bool", DBTag: "is_healthy", JSONTag: "isHealthy"},
				{Name: "LastStatus", Type: "sql.NullString", DBTag: "last_status", JSONTag: "lastStatus,omitempty"},
				{Name: "LastCheckedAt", Type: "sql.NullTime", DBTag: "last_checked_at", JSONTag: "lastCheckedAt,omitempty"},
				{Name: "CreatedAt", Type: "time.Time", DBTag: "created_at", JSONTag: "createdAt"},
				{Name: "UpdatedAt", Type: "time.Time", DBTag: "updated_at", JSONTag: "updatedAt"},
			},
		},
		"GeneratedDomain": {
			Name:    "GeneratedDomain",
			Package: "models",
			Type:    "struct",
			Fields: []FieldInfo{
				{Name: "ID", Type: "uuid.UUID", DBTag: "id", JSONTag: "id", IsPrimaryKey: true},
				{Name: "DomainGenerationCampaignID", Type: "uuid.UUID", DBTag: "domain_generation_campaign_id", JSONTag: "domainGenerationCampaignId", ValidateTag: "required", IsRequired: true, IsReference: true, RefModel: "Campaign"},
				{Name: "DomainName", Type: "string", DBTag: "domain_name", JSONTag: "domainName", ValidateTag: "required", IsRequired: true},
				{Name: "SourceKeyword", Type: "sql.NullString", DBTag: "source_keyword", JSONTag: "sourceKeyword,omitempty"},
				{Name: "SourcePattern", Type: "sql.NullString", DBTag: "source_pattern", JSONTag: "sourcePattern,omitempty"},
				{Name: "TLD", Type: "sql.NullString", DBTag: "tld", JSONTag: "tld,omitempty"},
				{Name: "OffsetIndex", Type: "int64", DBTag: "offset_index", JSONTag: "offsetIndex"},
				{Name: "GeneratedAt", Type: "time.Time", DBTag: "generated_at", JSONTag: "generatedAt"},
				{Name: "CreatedAt", Type: "time.Time", DBTag: "created_at", JSONTag: "createdAt"},
			},
		},
	}
}

// GetEnumTypes provides access to backend enum types
func GetEnumTypes() map[string]map[string]string {
	return map[string]map[string]string{
		"CampaignTypeEnum": {
			"CampaignTypeDomainGeneration":      "domain_generation",
			"CampaignTypeDNSValidation":         "dns_validation",
			"CampaignTypeHTTPKeywordValidation": "http_keyword_validation",
		},
		"CampaignStatusEnum": {
			"CampaignStatusPending":   "pending",
			"CampaignStatusQueued":    "queued",
			"CampaignStatusRunning":   "running",
			"CampaignStatusPausing":   "pausing",
			"CampaignStatusPaused":    "paused",
			"CampaignStatusCompleted": "completed",
			"CampaignStatusFailed":    "failed",
			"CampaignStatusArchived":  "archived",
			"CampaignStatusCancelled": "cancelled",
		},
		"PersonaTypeEnum": {
			"PersonaTypeDNS":  "dns",
			"PersonaTypeHTTP": "http",
		},
		"ProxyProtocolEnum": {
			"ProxyProtocolHTTP":   "http",
			"ProxyProtocolHTTPS":  "https",
			"ProxyProtocolSOCKS5": "socks5",
		},
	}
}

// GetInterfaceTypes provides access to backend interface definitions
func GetInterfaceTypes() map[string][]MethodInfo {
	return map[string][]MethodInfo{
		"CampaignStore": {
			{Name: "CreateCampaign", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}, {Name: "campaign", Type: "*models.Campaign"}}, Returns: []ParamInfo{{Name: "error", Type: "error"}}},
			{Name: "GetCampaign", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}, {Name: "id", Type: "uuid.UUID"}}, Returns: []ParamInfo{{Name: "*models.Campaign", Type: "*models.Campaign"}, {Name: "error", Type: "error"}}},
			{Name: "UpdateCampaign", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}, {Name: "campaign", Type: "*models.Campaign"}}, Returns: []ParamInfo{{Name: "error", Type: "error"}}},
			{Name: "DeleteCampaign", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}, {Name: "id", Type: "uuid.UUID"}}, Returns: []ParamInfo{{Name: "error", Type: "error"}}},
			{Name: "ListCampaigns", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}}, Returns: []ParamInfo{{Name: "[]models.Campaign", Type: "[]models.Campaign"}, {Name: "error", Type: "error"}}},
		},
		"UserStore": {
			{Name: "CreateUser", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}, {Name: "user", Type: "*models.User"}}, Returns: []ParamInfo{{Name: "error", Type: "error"}}},
			{Name: "GetUser", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}, {Name: "id", Type: "uuid.UUID"}}, Returns: []ParamInfo{{Name: "*models.User", Type: "*models.User"}, {Name: "error", Type: "error"}}},
			{Name: "GetUserByUsername", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}, {Name: "username", Type: "string"}}, Returns: []ParamInfo{{Name: "*models.User", Type: "*models.User"}, {Name: "error", Type: "error"}}},
			{Name: "UpdateUser", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}, {Name: "user", Type: "*models.User"}}, Returns: []ParamInfo{{Name: "error", Type: "error"}}},
			{Name: "DeleteUser", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}, {Name: "id", Type: "uuid.UUID"}}, Returns: []ParamInfo{{Name: "error", Type: "error"}}},
		},
		"PersonaStore": {
			{Name: "CreatePersona", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}, {Name: "persona", Type: "*models.Persona"}}, Returns: []ParamInfo{{Name: "error", Type: "error"}}},
			{Name: "GetPersona", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}, {Name: "id", Type: "uuid.UUID"}}, Returns: []ParamInfo{{Name: "*models.Persona", Type: "*models.Persona"}, {Name: "error", Type: "error"}}},
			{Name: "ListPersonas", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}}, Returns: []ParamInfo{{Name: "[]models.Persona", Type: "[]models.Persona"}, {Name: "error", Type: "error"}}},
			{Name: "UpdatePersona", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}, {Name: "persona", Type: "*models.Persona"}}, Returns: []ParamInfo{{Name: "error", Type: "error"}}},
			{Name: "DeletePersona", Parameters: []ParamInfo{{Name: "ctx", Type: "context.Context"}, {Name: "id", Type: "uuid.UUID"}}, Returns: []ParamInfo{{Name: "error", Type: "error"}}},
		},
	}
}

// MethodInfo represents method information
type MethodInfo struct {
	Name        string
	Description string
	Parameters  []ParamInfo
	Returns     []ParamInfo
}

// ParamInfo represents parameter information
type ParamInfo struct {
	Name string
	Type string
}

// ExtractModelInfo extracts reflection information from a model
func ExtractModelInfo(name string, model ModelInfo) (*ModelInfo, error) {
	return &model, nil
}

// ModelInfo represents model information
type ModelInfo struct {
	Name        string
	Package     string
	Type        string
	Description string
	Fields      []FieldInfo
	Methods     []MethodInfo
	Tags        []string
}

// FieldInfo represents field information
type FieldInfo struct {
	Name         string
	Type         string
	JSONTag      string
	DBTag        string
	ValidateTag  string
	Description  string
	IsRequired   bool
	IsPrimaryKey bool
	IsReference  bool
	RefModel     string
	ExtraTags    map[string]string
}

// Helper functions - removed unused reflection helpers since we're using static data