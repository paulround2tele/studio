package constants

// Test result constants
const (
	TestResultPass = "pass"
	TestResultFail = "fail"
	TestResultSkip = "skip"
)

// HTTP protocol constants
const (
	ProtocolHTTP  = "http"
	ProtocolHTTPS = "https"
)

// DNS validation status constants
const (
	DNSStatusNotFound = "Not Found"
)

// DNS resolver strategy constants
const (
	ResolverStrategySequentialFailover = "sequential_failover"
	ResolverStrategyWeightedRotation   = "weighted_rotation"
)

// Type constants
const (
	TypeString  = "string"
	TypeInt     = "int"
	TypeInt64   = "int64"
	TypeFloat64 = "float64"
	TypeBool    = "bool"
	TypeTime    = "time.Time"
	TypeUUID    = "uuid.UUID"
)

// HTTP method constants
const (
	HTTPMethodGET     = "GET"
	HTTPMethodOptions = "OPTIONS"
)

// Environment constants
const (
	EnvironmentDevelopment = "development"
)

// SQL query constants
const (
	SQLOrderByCreatedAtDesc = " ORDER BY created_at DESC"
	SQLOrderByNameAsc       = " ORDER BY name ASC"
	SQLLimit                = " LIMIT ?"
	SQLOffset               = " OFFSET ?"
)
