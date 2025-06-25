package config

import (
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models"
)

// FallbackPolicy defines when to use headless browsing if standard HTTP fetch fails or is insufficient.
type FallbackPolicy string

const (
	FallbackNever        FallbackPolicy = "never"          // Only use standard HTTP.
	FallbackOnFetchError FallbackPolicy = "on_fetch_error" // Use headless if standard HTTP GET fails (e.g., network error, non-2xx/3xx).
	FallbackAlways       FallbackPolicy = "always"         // (Primarily for testing/specific needs) Use headless for all attempts after an initial standard try.
)

// HTTPPersona defines the structure for an HTTP persona.
// It includes settings for standard HTTP requests, TLS, HTTP/2, cookies, rate limiting,
// content validation rules, and headless browser interaction.
type HTTPPersona struct {
	// Core Identification & Existing Fields
	ID             string               `json:"id" yaml:"id"`
	Name           string               `json:"name" yaml:"name"`
	Description    string               `json:"description,omitempty" yaml:"description,omitempty"`
	UserAgent      string               `json:"userAgent" yaml:"userAgent"`
	Headers        map[string]string    `json:"headers" yaml:"headers"`
	HeaderOrder    []string             `json:"headerOrder,omitempty" yaml:"headerOrder,omitempty"`
	TLSClientHello TLSClientHelloConfig `json:"tlsClientHello,omitempty" yaml:"tlsClientHello,omitempty"`
	HTTP2Settings  HTTP2SettingsConfig  `json:"http2Settings,omitempty" yaml:"http2Settings,omitempty"`
	CookieHandling CookieHandlingConfig `json:"cookieHandling,omitempty" yaml:"cookieHandling,omitempty"`
	Notes          string               `json:"notes,omitempty" yaml:"notes,omitempty"`
	RateLimitDPS   float64              `json:"rateLimitDps,omitempty" yaml:"rateLimitDps,omitempty"`
	RateLimitBurst int                  `json:"rateLimitBurst,omitempty" yaml:"rateLimitBurst,omitempty"`

	// Validation Rules
	AllowedStatusCodes []int             `json:"allowedStatusCodes,omitempty" yaml:"allowedStatusCodes,omitempty"`
	RequiredHeaders    map[string]string `json:"requiredHeaders,omitempty" yaml:"requiredHeaders,omitempty"`
	ForbiddenHeaders   []string          `json:"forbiddenHeaders,omitempty" yaml:"forbiddenHeaders,omitempty"`
	RequiredContent    []string          `json:"requiredContent,omitempty" yaml:"requiredContent,omitempty"`
	ForbiddenContent   []string          `json:"forbiddenContent,omitempty" yaml:"forbiddenContent,omitempty"`
	RequestTimeout     time.Duration     `json:"requestTimeoutSeconds,omitempty" yaml:"requestTimeoutSeconds,omitempty"`
	FollowRedirects    bool              `json:"followRedirects" yaml:"followRedirects"`

	// Headless Browser Configuration
	UseHeadless          bool           `json:"useHeadless" yaml:"useHeadless"`
	FallbackPolicy       FallbackPolicy `json:"fallbackPolicy,omitempty" yaml:"fallbackPolicy,omitempty"`
	ViewportWidth        int            `json:"viewportWidth,omitempty" yaml:"viewportWidth,omitempty"`
	ViewportHeight       int            `json:"viewportHeight,omitempty" yaml:"viewportHeight,omitempty"`
	HeadlessUserAgent    string         `json:"headlessUserAgent,omitempty" yaml:"headlessUserAgent,omitempty"`
	ScriptExecution      bool           `json:"scriptExecution" yaml:"scriptExecution"`
	LoadImages           bool           `json:"loadImages" yaml:"loadImages"`
	Screenshot           bool           `json:"screenshot" yaml:"screenshot"`
	DOMSnapshot          bool           `json:"domSnapshot" yaml:"domSnapshot"`
	HeadlessTimeout      time.Duration  `json:"headlessTimeoutSeconds,omitempty" yaml:"headlessTimeoutSeconds,omitempty"`
	WaitDelay            time.Duration  `json:"waitDelaySeconds,omitempty" yaml:"waitDelaySeconds,omitempty"`
	FetchBodyForKeywords *bool          `json:"fetchBodyForKeywords,omitempty" yaml:"fetchBodyForKeywords,omitempty"` // New field for keyword extraction control

	// Common or Overarching Settings
	MaxRetries int `json:"maxRetries,omitempty" yaml:"maxRetries,omitempty"`

	// Metadata
	CreatedAt time.Time `json:"createdAt,omitempty" yaml:"createdAt,omitempty"`
	UpdatedAt time.Time `json:"updatedAt,omitempty" yaml:"updatedAt,omitempty"`
	Tags      []string  `json:"tags,omitempty" yaml:"tags,omitempty"`
}

// DefaultHTTPConfigDetails provides a default structure for HTTPConfigDetails.
func DefaultHTTPConfigDetails(appDefaults HTTPValidatorConfig) models.HTTPConfigDetails {
	followRedirects := appDefaults.FollowRedirects // Default value
	return models.HTTPConfigDetails{
		UserAgent:             appDefaults.DefaultUserAgent,
		Headers:               appDefaults.DefaultHeaders,
		RequestTimeoutSeconds: appDefaults.RequestTimeoutSeconds,
		FollowRedirects:       &followRedirects, // Use address of the local copy
	}
}

// ToModelHTTPConfigDetails converts HTTPValidatorConfig to models.HTTPConfigDetails.
func (hvc *HTTPValidatorConfig) ToModelHTTPConfigDetails() models.HTTPConfigDetails {
	// Assuming HTTPValidatorConfig is the source struct and models.HTTPConfigDetails is the target
	// This is a hypothetical conversion based on common fields.
	// You'll need to adjust this based on the actual fields in HTTPValidatorConfig and models.HTTPConfigDetails.
	details := models.HTTPConfigDetails{
		UserAgent:             hvc.DefaultUserAgent,              // Example: field mapping
		Headers:               hvc.DefaultHeaders,                // Example: field mapping
		RequestTimeoutSeconds: int(hvc.RequestTimeout.Seconds()), // Convert time.Duration to int seconds
		FollowRedirects:       &hvc.FollowRedirects,              // Assuming FollowRedirects is a bool pointer in target
		// AllowedStatusCodes:    hvc.AllowedStatusCodes, // If such a field exists in hvc
		// CookieHandling:        &models.CookieHandlingConfig{Mode: "none"}, // Example, if hvc implies no cookie handling
		// ... map other relevant fields ...
	}

	// If hvc.FollowRedirects is a bool and target is *bool
	followRedirects := hvc.FollowRedirects
	details.FollowRedirects = &followRedirects

	// If AllowedStatusCodes exists in hvc and needs to be mapped
	// if len(hvc.AllowedStatusCodes) > 0 {
	// 	details.AllowedStatusCodes = hvc.AllowedStatusCodes
	// }

	// Initialize CookieHandling if it's a pointer type in models.HTTPConfigDetails
	// if details.CookieHandling == nil {
	// 	details.CookieHandling = &models.CookieHandlingConfig{Mode: "session"} // Or some default
	// }

	return details
}

// LoadHTTPPersonas loads HTTP persona configurations from the specified file in configDir.
func LoadHTTPPersonas(configDir string) ([]HTTPPersona, error) {
	return loadPersonasFromFile[HTTPPersona](configDir, httpPersonasConfigFilename, "HTTP")
}

// SaveHTTPPersonas saves the HTTP personas to their configuration file.
func SaveHTTPPersonas(personas []HTTPPersona, configDir string) error {
	return savePersonasToFile(personas, configDir, httpPersonasConfigFilename, "HTTP")
}
