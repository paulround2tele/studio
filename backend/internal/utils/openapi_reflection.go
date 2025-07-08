package utils

import (
	"database/sql"
	"encoding/json"
	"reflect"
	"strings"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/google/uuid"
)

// GenerateSchemaFromStruct generates an OpenAPI schema from a Go struct using reflection
func GenerateSchemaFromStruct(structType reflect.Type, spec *openapi3.T) *openapi3.Schema {
	schema := &openapi3.Schema{
		Type:       &openapi3.Types{"object"},
		Properties: make(map[string]*openapi3.SchemaRef),
	}

	// Handle pointer types
	if structType.Kind() == reflect.Ptr {
		structType = structType.Elem()
	}

	if structType.Kind() != reflect.Struct {
		return schema
	}

	for i := 0; i < structType.NumField(); i++ {
		field := structType.Field(i)
		
		// Skip unexported fields
		if !field.IsExported() {
			continue
		}

		// Get JSON tag or use field name
		jsonTag := field.Tag.Get("json")
		if jsonTag == "" || jsonTag == "-" {
			continue
		}

		// Parse JSON tag (remove omitempty, etc.)
		fieldName := strings.Split(jsonTag, ",")[0]
		if fieldName == "" {
			fieldName = strings.ToLower(field.Name)
		}

		// Generate schema for field type
		fieldSchema := generateFieldSchema(field.Type, spec)
		
		// Add description from comment if available
		if desc := field.Tag.Get("description"); desc != "" {
			fieldSchema.Value.Description = desc
		}

		schema.Properties[fieldName] = fieldSchema
	}

	return schema
}

// generateFieldSchema generates schema for individual field types
func generateFieldSchema(fieldType reflect.Type, spec *openapi3.T) *openapi3.SchemaRef {
	// Handle pointer types
	if fieldType.Kind() == reflect.Ptr {
		fieldType = fieldType.Elem()
	}

	// FIRST PRIORITY: Handle sql.Null* types with exact type matching
	if isSqlNullType(fieldType) {
		return getSqlNullTypeSchema(fieldType)
	}

	// SECOND PRIORITY: Handle special types before generic processing
	if fieldType == reflect.TypeOf(uuid.UUID{}) {
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type:   &openapi3.Types{"string"},
				Format: "uuid",
			},
		}
	}
	
	if fieldType == reflect.TypeOf(time.Time{}) {
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type:   &openapi3.Types{"string"},
				Format: "date-time",
			},
		}
	}

	// Handle json.RawMessage
	if fieldType == reflect.TypeOf(json.RawMessage{}) {
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{Type: &openapi3.Types{"object"}},
		}
	}

	// Handle custom enum types (string-based enums)
	if fieldType.Kind() == reflect.String && strings.Contains(fieldType.String(), "Enum") {
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{Type: &openapi3.Types{"string"}},
		}
	}

	switch fieldType.Kind() {
	case reflect.String:
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{Type: &openapi3.Types{"string"}},
		}

	case reflect.Int, reflect.Int8, reflect.Int16, reflect.Int32, reflect.Int64:
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{Type: &openapi3.Types{"integer"}},
		}

	case reflect.Float32, reflect.Float64:
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{Type: &openapi3.Types{"number"}},
		}

	case reflect.Bool:
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{Type: &openapi3.Types{"boolean"}},
		}

	case reflect.Slice, reflect.Array:
		elemType := fieldType.Elem()
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type:  &openapi3.Types{"array"},
				Items: generateFieldSchema(elemType, spec),
			},
		}

	case reflect.Map:
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{Type: &openapi3.Types{"object"}},
		}

	case reflect.Struct:
		// For custom structs, generate a reference
		typeName := fieldType.Name()
		if typeName != "" {
			// Final safety check: Never create schema references for sql.Null* types
			if isSqlNullType(fieldType) {
				
				return getSqlNullTypeSchema(fieldType)
			}
			
			
			
			// Add the schema to components if not already present
			if spec.Components.Schemas[typeName] == nil {
				spec.Components.Schemas[typeName] = &openapi3.SchemaRef{
					Value: GenerateSchemaFromStruct(fieldType, spec),
				}
			}
			
			return &openapi3.SchemaRef{
				Ref: "#/components/schemas/" + typeName,
			}
		}

		// Inline struct
		return &openapi3.SchemaRef{
			Value: GenerateSchemaFromStruct(fieldType, spec),
		}

	default:
		// Fallback to generic object
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{Type: &openapi3.Types{"object"}},
		}
	}
}

// AddStructSchema adds a schema for a struct type to the OpenAPI spec
func AddStructSchema(spec *openapi3.T, structType reflect.Type, schemaName string) {
	// Safety check: Never add sql.Null* types as top-level schemas
	if isSqlNullType(structType) {
		return
	}
	
	schema := GenerateSchemaFromStruct(structType, spec)
	spec.Components.Schemas[schemaName] = &openapi3.SchemaRef{Value: schema}
}

// isSqlNullType checks if a type is a sql.Null* type using exact type comparison
func isSqlNullType(t reflect.Type) bool {
	return t == reflect.TypeOf(sql.NullString{}) ||
		t == reflect.TypeOf(sql.NullInt32{}) ||
		t == reflect.TypeOf(sql.NullInt64{}) ||
		t == reflect.TypeOf(sql.NullFloat64{}) ||
		t == reflect.TypeOf(sql.NullBool{}) ||
		t == reflect.TypeOf(sql.NullTime{}) ||
		t == reflect.TypeOf(uuid.NullUUID{})
}

// getSqlNullTypeSchema returns the appropriate primitive schema for sql.Null* types
func getSqlNullTypeSchema(fieldType reflect.Type) *openapi3.SchemaRef {
	if fieldType == reflect.TypeOf(sql.NullString{}) {
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{Type: &openapi3.Types{"string"}},
		}
	}
	
	if fieldType == reflect.TypeOf(sql.NullInt32{}) || fieldType == reflect.TypeOf(sql.NullInt64{}) {
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{Type: &openapi3.Types{"integer"}},
		}
	}
	
	if fieldType == reflect.TypeOf(sql.NullFloat64{}) {
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{Type: &openapi3.Types{"number"}},
		}
	}
	
	if fieldType == reflect.TypeOf(sql.NullBool{}) {
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{Type: &openapi3.Types{"boolean"}},
		}
	}
	
	if fieldType == reflect.TypeOf(sql.NullTime{}) {
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type:   &openapi3.Types{"string"},
				Format: "date-time",
			},
		}
	}
	
	if fieldType == reflect.TypeOf(uuid.NullUUID{}) {
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type:   &openapi3.Types{"string"},
				Format: "uuid",
			},
		}
	}
	
	// Fallback to string if unknown sql.Null* type
	return &openapi3.SchemaRef{
		Value: &openapi3.Schema{Type: &openapi3.Types{"string"}},
	}

}

// getEnumValues returns the allowed values for known enum types
func getEnumValues(fieldType reflect.Type) []interface{} {
	typeName := fieldType.String()
	
	// Map of known enum types to their allowed values
	enumMappings := map[string][]interface{}{
		"models.CampaignTypeEnum": {
			"domain_generation",
			"dns_validation", 
			"http_keyword_validation",
		},
		"models.CampaignPhaseEnum": {
			"DomainGeneration",
			"DNSValidation", 
			"HTTPValidation",
			"LeadGeneration",
			"Completed",
		},
		"models.CampaignPhaseStatusEnum": {
			"Pending",
			"InProgress",
			"Completed",
			"Failed",
			"Cancelled",
		},
		"models.CampaignStatusEnum": {
			"created",
			"running",
			"completed",
			"failed",
			"cancelled",
		},
		"models.PersonaTypeEnum": {
			"dns",
			"http",
		},
		"models.PersonaStatusEnum": {
			"Active",
			"Disabled",
			"Testing",
		},
		"models.ProxyProtocolEnum": {
			"http",
			"https", 
			"socks4",
			"socks5",
		},
		"models.ProxyStatusEnum": {
			"Active",
			"Disabled",
			"Testing",
			"Failed",
		},
		"models.KeywordRuleTypeEnum": {
			"include",
			"exclude",
		},
		"models.ValidationStatusEnum": {
			"pending",
			"valid",
			"invalid",
			"error",
			"skipped",
		},
		"models.DNSValidationStatusEnum": {
			"resolved",
			"unresolved",
			"timeout",
			"error",
		},
		"models.HTTPValidationStatusEnum": {
			"success",
			"failed",
			"timeout", 
			"error",
		},
		"models.DomainDNSStatusEnum": {
			"resolved",
			"unresolved",
			"timeout",
			"error",
		},
		"models.DomainHTTPStatusEnum": {
			"success",
			"failed",
			"timeout",
			"error",
		},
	}
	
	if values, exists := enumMappings[typeName]; exists {
		return values
	}
	
	return nil
}

