package generators

import (
	"fmt"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
)

// Validator validates OpenAPI specifications
type Validator struct {
	strictMode bool
	errors     []ValidationError
	warnings   []ValidationWarning
}

// ValidationError represents a validation error
type ValidationError struct {
	Field   string
	Message string
	Code    string
}

// ValidationWarning represents a validation warning
type ValidationWarning struct {
	Field   string
	Message string
	Code    string
}

// NewValidator creates a new validator
func NewValidator(strictMode bool) *Validator {
	return &Validator{
		strictMode: strictMode,
		errors:     []ValidationError{},
		warnings:   []ValidationWarning{},
	}
}

// Validate validates an OpenAPI specification
func (v *Validator) Validate(spec *openapi3.T) error {
	// Reset errors and warnings
	v.errors = []ValidationError{}
	v.warnings = []ValidationWarning{}

	if spec == nil {
		return fmt.Errorf("specification cannot be nil")
	}

	// Validate using the built-in loader
	loader := openapi3.NewLoader()
	err := loader.ResolveRefsIn(spec, nil)
	if err != nil {
		return fmt.Errorf("OpenAPI validation failed: %w", err)
	}

	// Perform additional custom validations
	v.validateInfo(spec.Info)
	v.validatePaths(spec.Paths)
	v.validateComponents(spec.Components)
	v.validateSecurity(spec.Security)

	// Check if we have validation errors
	if len(v.errors) > 0 {
		return v.buildValidationError()
	}

	// In strict mode, warnings are treated as errors
	if v.strictMode && len(v.warnings) > 0 {
		return v.buildValidationWarningError()
	}

	return nil
}

// validateInfo validates the info section
func (v *Validator) validateInfo(info *openapi3.Info) {
	if info == nil {
		v.addError("info", "Info section is required", "MISSING_INFO")
		return
	}

	if info.Title == "" {
		v.addError("info.title", "Title is required", "MISSING_TITLE")
	}

	if info.Version == "" {
		v.addError("info.version", "Version is required", "MISSING_VERSION")
	}

	if info.Description == "" {
		v.addWarning("info.description", "Description is recommended", "MISSING_DESCRIPTION")
	}
}

// validatePaths validates the paths section
func (v *Validator) validatePaths(paths *openapi3.Paths) {
	if paths == nil {
		v.addError("paths", "Paths section is required", "MISSING_PATHS")
		return
	}

	if len(paths.Map()) == 0 {
		v.addWarning("paths", "No paths defined", "EMPTY_PATHS")
		return
	}

	for path, pathItem := range paths.Map() {
		v.validatePath(path, pathItem)
	}
}

// validatePath validates a single path
func (v *Validator) validatePath(path string, pathItem *openapi3.PathItem) {
	if pathItem == nil {
		v.addError(fmt.Sprintf("paths.%s", path), "Path item cannot be nil", "NULL_PATH_ITEM")
		return
	}

	// Validate path parameters
	if strings.Contains(path, "{") && strings.Contains(path, "}") {
		v.validatePathParameters(path, pathItem)
	}

	// Validate operations
	operations := map[string]*openapi3.Operation{
		"GET":    pathItem.Get,
		"POST":   pathItem.Post,
		"PUT":    pathItem.Put,
		"DELETE": pathItem.Delete,
		"PATCH":  pathItem.Patch,
	}

	hasOperations := false
	for method, operation := range operations {
		if operation != nil {
			hasOperations = true
			v.validateOperation(fmt.Sprintf("paths.%s.%s", path, strings.ToLower(method)), operation)
		}
	}

	if !hasOperations {
		v.addWarning(fmt.Sprintf("paths.%s", path), "Path has no operations", "NO_OPERATIONS")
	}
}

// validatePathParameters validates path parameters
func (v *Validator) validatePathParameters(path string, pathItem *openapi3.PathItem) {
	// Extract parameter names from path
	pathParams := extractPathParameterNames(path)

	// Check if operations define these parameters
	operations := []*openapi3.Operation{
		pathItem.Get, pathItem.Post, pathItem.Put, pathItem.Delete, pathItem.Patch,
	}

	for _, operation := range operations {
		if operation != nil {
			v.validateOperationPathParameters(path, operation, pathParams)
		}
	}
}

// validateOperationPathParameters validates path parameters for an operation
func (v *Validator) validateOperationPathParameters(path string, operation *openapi3.Operation, requiredParams []string) {
	if len(requiredParams) == 0 {
		return
	}

	definedParams := make(map[string]bool)
	for _, param := range operation.Parameters {
		if param.Value != nil && param.Value.In == "path" {
			definedParams[param.Value.Name] = true
		}
	}

	for _, requiredParam := range requiredParams {
		if !definedParams[requiredParam] {
			v.addError(
				fmt.Sprintf("paths.%s.parameters", path),
				fmt.Sprintf("Path parameter '%s' is not defined", requiredParam),
				"MISSING_PATH_PARAMETER",
			)
		}
	}
}

// validateOperation validates a single operation
func (v *Validator) validateOperation(location string, operation *openapi3.Operation) {
	if operation.OperationID == "" {
		v.addWarning(location+".operationId", "OperationID is recommended", "MISSING_OPERATION_ID")
	}

	if operation.Summary == "" {
		v.addWarning(location+".summary", "Summary is recommended", "MISSING_SUMMARY")
	}

	if operation.Responses == nil || len(operation.Responses.Map()) == 0 {
		v.addError(location+".responses", "At least one response is required", "MISSING_RESPONSES")
	} else {
		v.validateResponses(location+".responses", operation.Responses)
	}

	// Validate parameters
	v.validateParameters(location+".parameters", operation.Parameters)

	// Validate request body
	if operation.RequestBody != nil {
		v.validateRequestBody(location+".requestBody", operation.RequestBody)
	}
}

// validateResponses validates operation responses
func (v *Validator) validateResponses(location string, responses *openapi3.Responses) {
	hasSuccessResponse := false
	
	for status, response := range responses.Map() {
		if response.Value != nil {
			// Check for success responses (2xx)
			if strings.HasPrefix(status, "2") {
				hasSuccessResponse = true
			}

			if response.Value.Description == nil || *response.Value.Description == "" {
				v.addWarning(
					fmt.Sprintf("%s.%s.description", location, status),
					"Response description is recommended",
					"MISSING_RESPONSE_DESCRIPTION",
				)
			}
		}
	}

	if !hasSuccessResponse {
		v.addWarning(location, "No success response (2xx) defined", "NO_SUCCESS_RESPONSE")
	}
}

// validateParameters validates operation parameters
func (v *Validator) validateParameters(location string, parameters openapi3.Parameters) {
	for i, param := range parameters {
		if param.Value != nil {
			paramLocation := fmt.Sprintf("%s[%d]", location, i)
			
			if param.Value.Name == "" {
				v.addError(paramLocation+".name", "Parameter name is required", "MISSING_PARAMETER_NAME")
			}

			if param.Value.In == "" {
				v.addError(paramLocation+".in", "Parameter location (in) is required", "MISSING_PARAMETER_IN")
			}

			if param.Value.Schema == nil {
				v.addError(paramLocation+".schema", "Parameter schema is required", "MISSING_PARAMETER_SCHEMA")
			}
		}
	}
}

// validateRequestBody validates request body
func (v *Validator) validateRequestBody(location string, requestBody *openapi3.RequestBodyRef) {
	if requestBody.Value != nil {
		if requestBody.Value.Content == nil || len(requestBody.Value.Content) == 0 {
			v.addError(location+".content", "Request body content is required", "MISSING_REQUEST_BODY_CONTENT")
		}
	}
}

// validateComponents validates the components section
func (v *Validator) validateComponents(components *openapi3.Components) {
	if components == nil {
		return
	}

	// Validate schemas
	for name, schema := range components.Schemas {
		if schema.Value != nil {
			v.validateSchema(fmt.Sprintf("components.schemas.%s", name), schema.Value)
		}
	}
}

// validateSchema validates a schema
func (v *Validator) validateSchema(location string, schema *openapi3.Schema) {
	if schema.Type == nil || len(*schema.Type) == 0 {
		v.addWarning(location+".type", "Schema type is recommended", "MISSING_SCHEMA_TYPE")
	}
}

// validateSecurity validates security requirements
func (v *Validator) validateSecurity(security openapi3.SecurityRequirements) {
	// Basic validation - could be expanded
	for i, requirement := range security {
		if len(requirement) == 0 {
			v.addWarning(
				fmt.Sprintf("security[%d]", i),
				"Empty security requirement",
				"EMPTY_SECURITY_REQUIREMENT",
			)
		}
	}
}

// Helper methods

func (v *Validator) addError(field, message, code string) {
	v.errors = append(v.errors, ValidationError{
		Field:   field,
		Message: message,
		Code:    code,
	})
}

func (v *Validator) addWarning(field, message, code string) {
	v.warnings = append(v.warnings, ValidationWarning{
		Field:   field,
		Message: message,
		Code:    code,
	})
}

func (v *Validator) buildValidationError() error {
	var errorMessages []string
	for _, err := range v.errors {
		errorMessages = append(errorMessages, fmt.Sprintf("%s: %s (%s)", err.Field, err.Message, err.Code))
	}
	return fmt.Errorf("validation failed with %d errors:\n%s", len(v.errors), strings.Join(errorMessages, "\n"))
}

func (v *Validator) buildValidationWarningError() error {
	var warningMessages []string
	for _, warning := range v.warnings {
		warningMessages = append(warningMessages, fmt.Sprintf("%s: %s (%s)", warning.Field, warning.Message, warning.Code))
	}
	return fmt.Errorf("validation failed in strict mode with %d warnings:\n%s", len(v.warnings), strings.Join(warningMessages, "\n"))
}

// GetErrors returns validation errors
func (v *Validator) GetErrors() []ValidationError {
	return v.errors
}

// GetWarnings returns validation warnings
func (v *Validator) GetWarnings() []ValidationWarning {
	return v.warnings
}

// extractPathParameterNames extracts parameter names from a path like "/users/{id}/posts/{postId}"
func extractPathParameterNames(path string) []string {
	var params []string
	parts := strings.Split(path, "/")

	for _, part := range parts {
		if strings.HasPrefix(part, "{") && strings.HasSuffix(part, "}") {
			paramName := strings.Trim(part, "{}")
			if paramName != "" {
				params = append(params, paramName)
			}
		}
	}

	return params
}