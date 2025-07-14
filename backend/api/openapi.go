package api

import (
	"encoding/json"
	"fmt"

	"github.com/gin-gonic/gin"
	"github.com/getkin/kin-openapi/openapi3"
	"github.com/fntelecomllc/studio/backend/internal/openapi/config"
	"github.com/fntelecomllc/studio/backend/internal/openapi/reflection"
)

// GenerateOpenAPISpecWithEngine creates OpenAPI 3.0.3 specification using COMPREHENSIVE reflection engine
func GenerateOpenAPISpecWithEngine(engine *gin.Engine) *openapi3.T {
	// Create configuration for comprehensive business entity scanning
	cfg := config.DefaultConfig()
	cfg.VerboseLogging = true // Enable detailed logging for debugging
	
	// Create the new comprehensive reflection engine
	reflectionEngine := reflection.NewReflectionEngine(cfg)
	
	// Generate the complete specification with business entities AND runtime routes
	spec, err := reflectionEngine.GenerateSpecWithGinEngine(engine)
	if err != nil {
		panic(fmt.Sprintf("COMPREHENSIVE REFLECTION ENGINE FAILED: %v", err))
	}

	return spec
}

// GenerateYAMLWithEngine generates the OpenAPI specification as YAML using engine reflection
func GenerateYAMLWithEngine(engine *gin.Engine) ([]byte, error) {
	spec := GenerateOpenAPISpecWithEngine(engine)
	return spec.MarshalJSON()
}

// GenerateJSONWithEngine generates the OpenAPI specification as JSON using engine reflection
func GenerateJSONWithEngine(engine *gin.Engine) (string, error) {
	spec := GenerateOpenAPISpecWithEngine(engine)
	data, err := json.MarshalIndent(spec, "", "  ")
	if err != nil {
		return "", fmt.Errorf("failed to marshal OpenAPI spec to JSON: %w", err)
	}
	return string(data), nil
}

// ValidateSpecWithEngine validates the OpenAPI specification using engine reflection
func ValidateSpecWithEngine(engine *gin.Engine) error {
	spec := GenerateOpenAPISpecWithEngine(engine)
	loader := openapi3.NewLoader()
	return loader.ResolveRefsIn(spec, nil)
}
