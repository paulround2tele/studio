package constants

// Test result constants
const (
	TestResultPass = "pass"
	TestResultFail = "fail"
	TestResultSkip = "skip"
)

// DNS resolver strategy constants
const (
	DNSStrategySequentialFailover = "sequential_failover"
	DNSStrategyWeightedRotation   = "weighted_rotation"
	DNSStrategyRandomRotation     = "random_rotation"
)

// DNS validation status constants
const (
	DNSStatusNotFound = "Not Found"
	DNSStatusResolved = "Resolved"
)

// Go type constants
const (
	GoTypeString   = "string"
	GoTypeInt      = "int"
	GoTypeInt64    = "int64"
	GoTypeFloat64  = "float64"
	GoTypeTimeTime = "time.Time"
	GoTypeUUID     = "uuid.UUID"
)

// HTTP protocol constants
const (
	ProtocolHTTP  = "http"
	ProtocolHTTPS = "https"
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
