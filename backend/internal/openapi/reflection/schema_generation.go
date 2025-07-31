package reflection

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"strings"

	"github.com/fntelecomllc/studio/backend/internal/openapi/config"
	"github.com/getkin/kin-openapi/openapi3"
)

// SchemaGenerator generates OpenAPI schemas from Go types
type SchemaGenerator struct {
	config           *config.GenerationConfig
	fileSet          *token.FileSet
	packages         map[string]*ast.Package
	generatedTypes   map[string]*openapi3.SchemaRef
	typeRegistry     map[string]*ast.TypeSpec
	businessEntities []BusinessEntity
	entityRegistry   map[string]*BusinessEntity
}

// NewSchemaGenerator creates a new schema generator
func NewSchemaGenerator(cfg *config.GenerationConfig) *SchemaGenerator {
	return &SchemaGenerator{
		config:           cfg,
		fileSet:          token.NewFileSet(),
		packages:         make(map[string]*ast.Package),
		generatedTypes:   make(map[string]*openapi3.SchemaRef),
		typeRegistry:     make(map[string]*ast.TypeSpec),
		businessEntities: []BusinessEntity{},
		entityRegistry:   make(map[string]*BusinessEntity),
	}
}

// GenerateSchemas generates OpenAPI schemas for all discovered types
func (sg *SchemaGenerator) GenerateSchemas(spec *openapi3.T) error {
	// Parse packages to find type definitions
	err := sg.parsePackages()
	if err != nil {
		return fmt.Errorf("failed to parse packages: %w", err)
	}

	// Build type registry
	sg.buildTypeRegistry()

	// Generate common schemas
	sg.addCommonSchemas(spec)

	// Generate schemas for discovered business entities
	if err := sg.generateBusinessEntitySchemas(spec); err != nil {
		return fmt.Errorf("failed to generate business entity schemas: %w", err)
	}

	// Generate schemas for discovered types
	for typeName := range sg.typeRegistry {
		if !sg.shouldGenerateSchema(typeName) {
			continue
		}

		schema, err := sg.generateSchemaForType(typeName)
		if err != nil {
			if sg.config.VerboseLogging {
				fmt.Printf("Warning: Failed to generate schema for type %s: %v\n", typeName, err)
			}
			continue
		}

		if schema != nil {
			// Clean type name of package prefixes before storing schema
			cleanTypeName := sg.cleanTypeName(typeName)
			spec.Components.Schemas[cleanTypeName] = schema
		}
	}

	return nil
}

// SetBusinessEntities sets the business entities discovered by the route discoverer
func (sg *SchemaGenerator) SetBusinessEntities(entities []BusinessEntity) {
	sg.businessEntities = entities
	sg.entityRegistry = make(map[string]*BusinessEntity)

	for i := range entities {
		entity := &entities[i]
		sg.entityRegistry[entity.Name] = entity
	}

	if sg.config.VerboseLogging {
		fmt.Printf("Schema generator received %d business entities\n", len(entities))
	}
}

// generateBusinessEntitySchemas generates schemas for all business entities
func (sg *SchemaGenerator) generateBusinessEntitySchemas(spec *openapi3.T) error {
	for _, entity := range sg.businessEntities {
		if !sg.shouldGenerateEntitySchema(entity) {
			continue
		}

		schema, err := sg.generateSchemaFromBusinessEntity(entity)
		if err != nil {
			if sg.config.VerboseLogging {
				fmt.Printf("Warning: Failed to generate schema for business entity %s: %v\n", entity.Name, err)
			}
			continue
		}

		if schema != nil {
			// Clean entity name of package prefixes before storing schema
			cleanEntityName := sg.cleanTypeName(entity.Name)
			spec.Components.Schemas[cleanEntityName] = schema
			if sg.config.VerboseLogging {
				fmt.Printf("Generated schema for business entity: %s (clean name: %s)\n", entity.Name, cleanEntityName)
			}
		}
	}

	return nil
}

// shouldGenerateEntitySchema determines whether to generate a schema for a business entity
func (sg *SchemaGenerator) shouldGenerateEntitySchema(entity BusinessEntity) bool {
	// Only generate schemas for exported entities
	if !entity.IsExported {
		return false
	}

	// Exclude internal implementation types that shouldn't be in API schema
	excludedTypes := []string{
		"AuthHandler", "ProxyManager", "DNSValidator", "DatabaseConnectionMetrics",
		"EfficientWorkerPool", "HealthCheckHandler", "StatusResponseWriter",
		"WebSocketHandler", "WorkerCoordinationService", "HTTPValidator",
		"ContentFetcher", "MemoryPoolManager", "CPUOptimizationConfig",
		"CampaignOrchestratorAPIHandler", "APIHandler", "ReflectionEngine",
	}

	for _, excludedType := range excludedTypes {
		if entity.Name == excludedType {
			if sg.config.VerboseLogging {
				fmt.Printf("Skipping excluded handler type: %s\n", entity.Name)
			}
			return false // Skip this type
		}
	}

	return true
}

// generateSchemaFromBusinessEntity generates an OpenAPI schema from a business entity
func (sg *SchemaGenerator) generateSchemaFromBusinessEntity(entity BusinessEntity) (*openapi3.SchemaRef, error) {
	// Check if already generated
	if schema, exists := sg.generatedTypes[entity.Name]; exists {
		return schema, nil
	}

	schema, err := sg.convertStructToSchemaWithEntity(entity.StructType, entity)
	if err != nil {
		return nil, err
	}

	// Cache the generated schema
	sg.generatedTypes[entity.Name] = schema

	return schema, nil
}

// convertStructToSchemaWithEntity converts a struct type to an OpenAPI schema using business entity info
func (sg *SchemaGenerator) convertStructToSchemaWithEntity(structType *ast.StructType, entity BusinessEntity) (*openapi3.SchemaRef, error) {
	if structType == nil {
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"object"},
			},
		}, nil
	}

	schema := &openapi3.Schema{
		Type:       &openapi3.Types{"object"},
		Properties: make(map[string]*openapi3.SchemaRef),
	}

	required := []string{}

	if structType.Fields != nil && structType.Fields.List != nil {
		for _, field := range structType.Fields.List {
			if field == nil || field.Names == nil {
				continue
			}

			for _, name := range field.Names {
				if name == nil || name.Name == "" {
					continue
				}

				// Skip unexported fields if configured
				if !sg.shouldIncludeField(name.Name) {
					continue
				}

				fieldName, isRequired, enumValues := sg.extractFieldInfoFromEntity(field, name.Name, entity)
				if fieldName == "" {
					continue // Skip fields with no JSON representation
				}

				fieldSchema, err := sg.convertTypeToSchemaAdvanced(field.Type, "")
				if err != nil {
					if sg.config.VerboseLogging {
						fmt.Printf("Warning: Failed to convert field %s.%s: %v\n", entity.Name, name.Name, err)
					}
					// Use a generic object schema as fallback
					fieldSchema = &openapi3.SchemaRef{
						Value: &openapi3.Schema{
							Type: &openapi3.Types{"object"},
						},
					}
				}

				// Add field description from comments
				if field.Doc != nil && len(field.Doc.List) > 0 && field.Doc.List[0] != nil {
					comment := strings.TrimPrefix(field.Doc.List[0].Text, "//")
					if fieldSchema.Value != nil {
						fieldSchema.Value.Description = strings.TrimSpace(comment)
					}
				}

				// Apply enum values if present
				if len(enumValues) > 0 && fieldSchema.Value != nil {
					sg.applyEnumConstraints(fieldSchema, enumValues)
				}

				// Enhance field schema based on field name patterns
				sg.enhanceFieldSchema(fieldSchema, fieldName, name.Name)

				schema.Properties[fieldName] = fieldSchema

				if isRequired {
					required = append(required, fieldName)
				}
			}
		}
	}

	if len(required) > 0 {
		schema.Required = required
	}

	return &openapi3.SchemaRef{Value: schema}, nil
}

// convertTypeToSchemaAdvanced converts an AST type to an OpenAPI schema with enhanced handling
func (sg *SchemaGenerator) convertTypeToSchemaAdvanced(astType ast.Expr, typeName string) (*openapi3.SchemaRef, error) {
	switch t := astType.(type) {
	case *ast.StructType:
		return sg.convertStructToSchema(t, typeName)
	case *ast.Ident:
		return sg.convertIdentToSchemaAdvanced(t)
	case *ast.ArrayType:
		return sg.convertArrayToSchemaAdvanced(t)
	case *ast.MapType:
		return sg.convertMapToSchemaAdvanced(t)
	case *ast.StarExpr:
		// Pointer type - convert the underlying type
		return sg.convertTypeToSchemaAdvanced(t.X, typeName)
	case *ast.SelectorExpr:
		return sg.convertSelectorToSchema(t)
	case *ast.InterfaceType:
		// Interface type - check if it's a known explicit schema type first
		if explicitSchema := sg.getExplicitSchemaForType(typeName); explicitSchema != nil {
			return explicitSchema, nil
		}
		// Otherwise treat as generic object
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type:  &openapi3.Types{"object"},
				Title: typeName, // Add title to prevent auto-naming issues
			},
		}, nil
	default:
		// Unknown type - check if it's a known explicit schema type first
		if explicitSchema := sg.getExplicitSchemaForType(typeName); explicitSchema != nil {
			return explicitSchema, nil
		}
		// Otherwise treat as object
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type:  &openapi3.Types{"object"},
				Title: typeName, // Add title to prevent auto-naming issues
			},
		}, nil
	}
}

// convertIdentToSchemaAdvanced converts an identifier type to an OpenAPI schema with enhanced handling
func (sg *SchemaGenerator) convertIdentToSchemaAdvanced(ident *ast.Ident) (*openapi3.SchemaRef, error) {
	switch ident.Name {
	case "string":
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"string"},
			},
		}, nil
	case "int", "int8", "int16", "int32":
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type:   &openapi3.Types{"integer"},
				Format: "int32",
			},
		}, nil
	case "int64":
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type:   &openapi3.Types{"integer"},
				Format: "int64",
			},
		}, nil
	case "uint", "uint8", "uint16", "uint32":
		schema := &openapi3.Schema{
			Type:   &openapi3.Types{"integer"},
			Format: "int32",
		}
		min := float64(0)
		schema.Min = &min
		return &openapi3.SchemaRef{Value: schema}, nil
	case "uint64":
		schema := &openapi3.Schema{
			Type:   &openapi3.Types{"integer"},
			Format: "int64",
		}
		min := float64(0)
		schema.Min = &min
		return &openapi3.SchemaRef{Value: schema}, nil
	case "float32":
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type:   &openapi3.Types{"number"},
				Format: "float",
			},
		}, nil
	case "float64":
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type:   &openapi3.Types{"number"},
				Format: "double",
			},
		}, nil
	case "bool":
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"boolean"},
			},
		}, nil
	case "byte":
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type:   &openapi3.Types{"string"},
				Format: "byte",
			},
		}, nil
	default:
		// Check if this is a reference to a business entity
		if entity, exists := sg.entityRegistry[ident.Name]; exists {
			return &openapi3.SchemaRef{
				Ref: "#/components/schemas/" + entity.Name,
			}, nil
		}
		// Check if this is a reference to another type
		if typeSpec, exists := sg.typeRegistry[ident.Name]; exists {
			// Check if this is a string-based enum
			if sg.isStringEnum(typeSpec, ident.Name) {
				enumValues := sg.extractEnumValues(ident.Name)
				schema := &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"string"},
					},
				}
				if len(enumValues) > 0 {
					sg.applyEnumConstraints(schema, enumValues)
				}
				return schema, nil
			}
			return &openapi3.SchemaRef{
				Ref: "#/components/schemas/" + ident.Name,
			}, nil
		}
		// Unknown type - treat as object
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"object"},
			},
		}, nil
	}
}

// convertArrayToSchemaAdvanced converts an array type to an OpenAPI schema with enhanced handling
func (sg *SchemaGenerator) convertArrayToSchemaAdvanced(arrayType *ast.ArrayType) (*openapi3.SchemaRef, error) {
	itemSchema, err := sg.convertTypeToSchemaAdvanced(arrayType.Elt, "")
	if err != nil {
		return nil, err
	}

	return &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:  &openapi3.Types{"array"},
			Items: itemSchema,
		},
	}, nil
}

// convertMapToSchemaAdvanced converts a map type to an OpenAPI schema with enhanced handling
func (sg *SchemaGenerator) convertMapToSchemaAdvanced(mapType *ast.MapType) (*openapi3.SchemaRef, error) {
	valueSchema, err := sg.convertTypeToSchemaAdvanced(mapType.Value, "")
	if err != nil {
		return nil, err
	}

	return &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:                 &openapi3.Types{"object"},
			AdditionalProperties: openapi3.AdditionalProperties{Schema: valueSchema},
		},
	}, nil
}

// convertSelectorToSchema converts a selector expression (external package type) to schema
func (sg *SchemaGenerator) convertSelectorToSchema(sel *ast.SelectorExpr) (*openapi3.SchemaRef, error) {
	// Handle common external types
	if ident, ok := sel.X.(*ast.Ident); ok {
		pkgName := ident.Name
		typeName := sel.Sel.Name

		// Handle time.Time
		if pkgName == "time" && typeName == "Time" {
			return &openapi3.SchemaRef{
				Value: &openapi3.Schema{
					Type:   &openapi3.Types{"string"},
					Format: "date-time",
				},
			}, nil
		}

		// Handle uuid.UUID
		if pkgName == "uuid" && typeName == "UUID" {
			return &openapi3.SchemaRef{
				Value: &openapi3.Schema{
					Type:   &openapi3.Types{"string"},
					Format: "uuid",
				},
			}, nil
		}

		// Handle json.RawMessage
		if pkgName == "json" && typeName == "RawMessage" {
			return &openapi3.SchemaRef{
				Value: &openapi3.Schema{
					Type: &openapi3.Types{"object"},
				},
			}, nil
		}

		// Check if this is a known business entity from models package
		if pkgName == "models" {
			// Check if this type is a registered business entity
			if entity, exists := sg.entityRegistry[typeName]; exists {
				if sg.config.VerboseLogging {
					fmt.Printf("Found business entity %s for external selector models.%s\n", entity.Name, typeName)
				}
				return &openapi3.SchemaRef{
					Ref: "#/components/schemas/" + typeName,
				}, nil
			}

			// Also check if the type exists in our type registry
			if _, exists := sg.typeRegistry[typeName]; exists {
				if sg.config.VerboseLogging {
					fmt.Printf("Found type registry entry for models.%s\n", typeName)
				}
				return &openapi3.SchemaRef{
					Ref: "#/components/schemas/" + typeName,
				}, nil
			}
		}

		// For other packages, also check if the type name exists as a business entity
		if entity, exists := sg.entityRegistry[typeName]; exists {
			if sg.config.VerboseLogging {
				fmt.Printf("Found business entity %s for external selector %s.%s\n", entity.Name, pkgName, typeName)
			}
			return &openapi3.SchemaRef{
				Ref: "#/components/schemas/" + typeName,
			}, nil
		}
	}

	// Default to string for unknown external types
	return &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type: &openapi3.Types{"string"},
		},
	}, nil
}

// extractFieldInfoFromEntity extracts field name, required status, and enum values using business entity information
func (sg *SchemaGenerator) extractFieldInfoFromEntity(field *ast.Field, defaultName string, entity BusinessEntity) (string, bool, []string) {
	fieldName := defaultName
	isRequired := false
	var enumValues []string

	// Use JSON tag from business entity if available
	if jsonTag, exists := entity.JSONTags[defaultName]; exists {
		fieldName = jsonTag
	} else {
		// Extract JSON tag if present
		if field.Tag != nil {
			tag := strings.Trim(field.Tag.Value, "`")
			if strings.Contains(tag, "json:") {
				jsonTag := extractJSONTag(tag)
				if jsonTag == "-" {
					return "", false, nil // Skip this field
				}
				if jsonTag != "" {
					fieldName = jsonTag
				}
			}
		}
	}

	// Check if field type is a string enum type
	if field.Type != nil {
		if ident, ok := field.Type.(*ast.Ident); ok && ident.Name != "" {
			if sg.config.VerboseLogging && entity.Name == "Campaign" {
				fmt.Printf("Checking field %s.%s with type %s\n", entity.Name, fieldName, ident.Name)
			}
			if sg.isStringEnumByName(ident.Name) {
				enumValues = sg.extractEnumValues(ident.Name)
				if sg.config.VerboseLogging && len(enumValues) > 0 {
					fmt.Printf("Applied enum constraints to field %s.%s: %v\n", entity.Name, fieldName, enumValues)
				}
			} else if sg.config.VerboseLogging && entity.Name == "Campaign" {
				fmt.Printf("Type %s is not detected as string enum for field %s.%s\n", ident.Name, entity.Name, fieldName)
			}
		}
	}

	// Check for validation tags that might indicate required fields and enum values
	if field.Tag != nil {
		tag := strings.Trim(field.Tag.Value, "`")

		// Extract validation tag content
		if strings.Contains(tag, "validate:") {
			validateTag := sg.extractValidateTag(tag)
			if strings.Contains(validateTag, "required") {
				isRequired = true
			}
			if strings.Contains(validateTag, "oneof=") {
				validationEnumValues := sg.extractOneOfValues(validateTag)
				// Prefer field type enum values over validation tag enum values
				if len(enumValues) == 0 && len(validationEnumValues) > 0 {
					enumValues = validationEnumValues
				}
			}
		}

		if strings.Contains(tag, "binding:") && strings.Contains(tag, "required") {
			isRequired = true
		}
	}

	return fieldName, isRequired, enumValues
}

// extractValidateTag extracts the validate tag value from a struct tag
func (sg *SchemaGenerator) extractValidateTag(tag string) string {
	// Look for validate: followed by a quoted value
	validateIndex := strings.Index(tag, "validate:")
	if validateIndex == -1 {
		return ""
	}

	// Find the start of the quoted value
	afterValidate := tag[validateIndex+9:] // 9 = len("validate:")
	quoteStart := strings.Index(afterValidate, `"`)
	if quoteStart == -1 {
		return ""
	}

	// Find the matching closing quote
	valueStart := quoteStart + 1
	quoteEnd := strings.Index(afterValidate[valueStart:], `"`)
	if quoteEnd == -1 {
		return ""
	}

	// Extract the complete quoted value
	return afterValidate[valueStart : valueStart+quoteEnd]
}

// extractOneOfValues extracts enum values from validate:"oneof=value1 value2 value3" tags
func (sg *SchemaGenerator) extractOneOfValues(validateTag string) []string {
	// Find the oneof= part
	oneofIndex := strings.Index(validateTag, "oneof=")
	if oneofIndex == -1 {
		return nil
	}

	// Extract everything after "oneof="
	oneofPart := validateTag[oneofIndex+6:] // 6 = len("oneof=")

	// Handle cases where there might be other validation rules after oneof
	// Split by comma or space to find the end of oneof values
	var enumValues []string

	// Split by spaces first to get individual values
	parts := strings.Fields(oneofPart)

	for _, part := range parts {
		// Stop if we hit another validation rule (contains =)
		if strings.Contains(part, "=") {
			break
		}
		// Remove any trailing commas or semicolons
		part = strings.TrimRight(part, ",;")
		if part != "" {
			enumValues = append(enumValues, part)
		}
	}

	return enumValues
}

// enhanceFieldSchema enhances field schema based on field name patterns
func (sg *SchemaGenerator) enhanceFieldSchema(schema *openapi3.SchemaRef, fieldName, originalName string) {
	if schema == nil || schema.Value == nil || fieldName == "" || originalName == "" {
		return
	}

	// Skip format enhancement for fields with enum constraints
	// Enum fields should not have format constraints like "date-time"
	if len(schema.Value.Enum) > 0 {
		return
	}

	lowerFieldName := strings.ToLower(fieldName)
	lowerOriginalName := strings.ToLower(originalName)

	// Enhance based on field name patterns
	if strings.Contains(lowerFieldName, "id") || strings.Contains(lowerOriginalName, "id") {
		if schema.Value.Type != nil && len(*schema.Value.Type) > 0 && (*schema.Value.Type)[0] == "string" {
			// Use the UUID schema reference for better type safety
			*schema = openapi3.SchemaRef{
				Ref: "#/components/schemas/UUID",
			}
			if schema.Value == nil {
				schema.Value = &openapi3.Schema{}
			}
			if schema.Value.Description == "" {
				schema.Value.Description = "Unique identifier"
			}
		}
	}

	if strings.Contains(lowerFieldName, "email") {
		if schema.Value.Type != nil && len(*schema.Value.Type) > 0 && (*schema.Value.Type)[0] == "string" {
			schema.Value.Format = "email"
		}
	}

	if strings.Contains(lowerFieldName, "url") || strings.Contains(lowerFieldName, "uri") {
		if schema.Value.Type != nil && len(*schema.Value.Type) > 0 && (*schema.Value.Type)[0] == "string" {
			schema.Value.Format = "uri"
		}
	}

	if strings.Contains(lowerFieldName, "date") || strings.Contains(lowerFieldName, "time") ||
		strings.HasSuffix(lowerOriginalName, "at") {
		if schema.Value.Type != nil && len(*schema.Value.Type) > 0 && (*schema.Value.Type)[0] == "string" {
			schema.Value.Format = "date-time"
		}
	}

	if strings.Contains(lowerFieldName, "password") || strings.Contains(lowerFieldName, "secret") {
		if schema.Value.Type != nil && len(*schema.Value.Type) > 0 && (*schema.Value.Type)[0] == "string" {
			schema.Value.Format = "password"
		}
	}
}

// parsePackages parses all configured packages
func (sg *SchemaGenerator) parsePackages() error {
	for _, pkgPath := range sg.config.PackagePaths {
		packages, err := parser.ParseDir(sg.fileSet, pkgPath, nil, parser.ParseComments)
		if err != nil {
			if sg.config.VerboseLogging {
				fmt.Printf("Warning: Failed to parse package %s: %v\n", pkgPath, err)
			}
			continue
		}

		for name, pkg := range packages {
			sg.packages[name] = pkg
		}
	}
	return nil
}

// buildTypeRegistry builds a registry of all type definitions
func (sg *SchemaGenerator) buildTypeRegistry() {
	// Exclude internal implementation types that shouldn't be in API schema
	excludedTypes := map[string]bool{
		"AuthHandler": true, "ProxyManager": true, "DNSValidator": true, "DatabaseConnectionMetrics": true,
		"EfficientWorkerPool": true, "HealthCheckHandler": true, "StatusResponseWriter": true,
		"WebSocketHandler": true, "WorkerCoordinationService": true, "HTTPValidator": true,
		"ContentFetcher": true, "MemoryPoolManager": true, "CPUOptimizationConfig": true,
		"CampaignOrchestratorAPIHandler": true, "APIHandler": true, "ReflectionEngine": true,
	}

	for _, pkg := range sg.packages {
		for _, file := range pkg.Files {
			for _, decl := range file.Decls {
				if genDecl, ok := decl.(*ast.GenDecl); ok && genDecl.Tok == token.TYPE {
					for _, spec := range genDecl.Specs {
						if typeSpec, ok := spec.(*ast.TypeSpec); ok {
							typeName := typeSpec.Name.Name

							// Skip excluded handler types
							if excludedTypes[typeName] {
								if sg.config.VerboseLogging {
									fmt.Printf("Skipping registration of excluded type: %s\n", typeName)
								}
								continue
							}

							sg.typeRegistry[typeName] = typeSpec
						}
					}
				}
			}
		}
	}
}

// shouldGenerateSchema determines whether to generate a schema for a type
func (sg *SchemaGenerator) shouldGenerateSchema(typeName string) bool {
	// Skip unexported types if configured
	if sg.config.VerboseLogging {
		// For now, generate schemas for all types we can find
		return true
	}

	// Only generate schemas for exported types
	return strings.ToUpper(typeName[:1]) == typeName[:1]
}

// generateSchemaForType generates an OpenAPI schema for a specific type
func (sg *SchemaGenerator) generateSchemaForType(typeName string) (*openapi3.SchemaRef, error) {
	// Check if already generated
	if schema, exists := sg.generatedTypes[typeName]; exists {
		return schema, nil
	}

	typeSpec, exists := sg.typeRegistry[typeName]
	if !exists {
		return nil, fmt.Errorf("type %s not found in registry", typeName)
	}

	schema, err := sg.convertTypeToSchema(typeSpec.Type, typeName)
	if err != nil {
		return nil, err
	}

	// Cache the generated schema
	sg.generatedTypes[typeName] = schema

	return schema, nil
}

// convertTypeToSchema converts an AST type to an OpenAPI schema
func (sg *SchemaGenerator) convertTypeToSchema(astType ast.Expr, typeName string) (*openapi3.SchemaRef, error) {
	switch t := astType.(type) {
	case *ast.StructType:
		return sg.convertStructToSchema(t, typeName)
	case *ast.Ident:
		return sg.convertIdentToSchema(t)
	case *ast.ArrayType:
		return sg.convertArrayToSchema(t)
	case *ast.MapType:
		return sg.convertMapToSchema(t)
	case *ast.StarExpr:
		// Pointer type - convert the underlying type
		return sg.convertTypeToSchema(t.X, typeName)
	case *ast.SelectorExpr:
		// External package type - use the enhanced selector handling
		return sg.convertSelectorToSchema(t)
	default:
		// Unknown type - treat as object
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"object"},
			},
		}, nil
	}
}

// convertStructToSchema converts a struct type to an OpenAPI schema
func (sg *SchemaGenerator) convertStructToSchema(structType *ast.StructType, typeName string) (*openapi3.SchemaRef, error) {
	schema := &openapi3.Schema{
		Type:       &openapi3.Types{"object"},
		Properties: make(map[string]*openapi3.SchemaRef),
	}

	required := []string{}

	for _, field := range structType.Fields.List {
		for _, name := range field.Names {
			// Skip unexported fields if configured
			if !sg.shouldIncludeField(name.Name) {
				continue
			}

			fieldName, isRequired := sg.extractFieldInfo(field, name.Name)
			if fieldName == "" {
				continue // Skip fields with no JSON representation
			}

			fieldSchema, err := sg.convertTypeToSchema(field.Type, "")
			if err != nil {
				if sg.config.VerboseLogging {
					fmt.Printf("Warning: Failed to convert field %s.%s: %v\n", typeName, name.Name, err)
				}
				// Use a generic object schema as fallback
				fieldSchema = &openapi3.SchemaRef{
					Value: &openapi3.Schema{
						Type: &openapi3.Types{"object"},
					},
				}
			}

			// Add field description from comments
			if field.Doc != nil && len(field.Doc.List) > 0 {
				comment := strings.TrimPrefix(field.Doc.List[0].Text, "//")
				fieldSchema.Value.Description = strings.TrimSpace(comment)
			}

			schema.Properties[fieldName] = fieldSchema

			if isRequired {
				required = append(required, fieldName)
			}
		}
	}

	if len(required) > 0 {
		schema.Required = required
	}

	return &openapi3.SchemaRef{Value: schema}, nil
}

// convertIdentToSchema converts an identifier type to an OpenAPI schema
func (sg *SchemaGenerator) convertIdentToSchema(ident *ast.Ident) (*openapi3.SchemaRef, error) {
	switch ident.Name {
	case "string":
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"string"},
			},
		}, nil
	case "int", "int8", "int16", "int32", "int64":
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"integer"},
			},
		}, nil
	case "uint", "uint8", "uint16", "uint32", "uint64":
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"integer"},
			},
		}, nil
	case "float32", "float64":
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"number"},
			},
		}, nil
	case "bool":
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"boolean"},
			},
		}, nil
	default:
		// Check if this is a reference to another type
		if _, exists := sg.typeRegistry[ident.Name]; exists {
			return &openapi3.SchemaRef{
				Ref: "#/components/schemas/" + ident.Name,
			}, nil
		}
		// Unknown type - treat as object
		return &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type: &openapi3.Types{"object"},
			},
		}, nil
	}
}

// convertArrayToSchema converts an array type to an OpenAPI schema
func (sg *SchemaGenerator) convertArrayToSchema(arrayType *ast.ArrayType) (*openapi3.SchemaRef, error) {
	itemSchema, err := sg.convertTypeToSchema(arrayType.Elt, "")
	if err != nil {
		return nil, err
	}

	return &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:  &openapi3.Types{"array"},
			Items: itemSchema,
		},
	}, nil
}

// convertMapToSchema converts a map type to an OpenAPI schema
func (sg *SchemaGenerator) convertMapToSchema(mapType *ast.MapType) (*openapi3.SchemaRef, error) {
	valueSchema, err := sg.convertTypeToSchema(mapType.Value, "")
	if err != nil {
		return nil, err
	}

	return &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:                 &openapi3.Types{"object"},
			AdditionalProperties: openapi3.AdditionalProperties{Schema: valueSchema},
		},
	}, nil
}

// shouldIncludeField determines whether to include a field in the schema
func (sg *SchemaGenerator) shouldIncludeField(fieldName string) bool {
	// Skip unexported fields if configured
	schemaConfig := config.DefaultSchemaGenerationConfig()
	if schemaConfig.IgnoreUnexportedFields {
		return strings.ToUpper(fieldName[:1]) == fieldName[:1]
	}
	return true
}

// extractFieldInfo extracts field name and required status from field tags
func (sg *SchemaGenerator) extractFieldInfo(field *ast.Field, defaultName string) (string, bool) {
	fieldName := defaultName
	isRequired := false

	// Extract JSON tag if present
	if field.Tag != nil {
		tag := strings.Trim(field.Tag.Value, "`")
		if strings.Contains(tag, "json:") {
			jsonTag := extractJSONTag(tag)
			if jsonTag == "-" {
				return "", false // Skip this field
			}
			if jsonTag != "" {
				fieldName = jsonTag
			}
		}

		// Check for validation tags that might indicate required fields
		if strings.Contains(tag, "validate:") && strings.Contains(tag, "required") {
			isRequired = true
		}
	}

	return fieldName, isRequired
}

// extractJSONTag extracts the JSON field name from a struct tag
func extractJSONTag(tag string) string {
	parts := strings.Split(tag, " ")
	for _, part := range parts {
		if strings.HasPrefix(part, "json:") {
			jsonPart := strings.TrimPrefix(part, "json:")
			jsonPart = strings.Trim(jsonPart, `"`)
			// Handle cases like "fieldname,omitempty"
			if strings.Contains(jsonPart, ",") {
				return strings.Split(jsonPart, ",")[0]
			}
			return jsonPart
		}
	}
	return ""
}

// addCommonSchemas adds common schemas used across the API
func (sg *SchemaGenerator) addCommonSchemas(spec *openapi3.T) {
	// Standard UUID schema with validation
	uuidSchema := &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type:        &openapi3.Types{"string"},
			Format:      "uuid",
			Pattern:     "^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
			Description: "Unique identifier (UUID v4)",
			Example:     "550e8400-e29b-41d4-a716-446655440000",
		},
	}
	spec.Components.Schemas["UUID"] = uuidSchema

	// Add all enum schemas for better type safety
	sg.addEnumSchemas(spec)

	// Error response schema
	errorSchema := &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type: &openapi3.Types{"object"},
			Properties: map[string]*openapi3.SchemaRef{
				"error": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Error message",
					},
				},
				"code": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Error code",
					},
				},
			},
			Required: []string{"error"},
		},
	}
	spec.Components.Schemas["ErrorResponse"] = errorSchema

	// Success response schema
	successSchema := &openapi3.SchemaRef{
		Value: &openapi3.Schema{
			Type: &openapi3.Types{"object"},
			Properties: map[string]*openapi3.SchemaRef{
				"message": {
					Value: &openapi3.Schema{
						Type:        &openapi3.Types{"string"},
						Description: "Success message",
					},
				},
				"data": {
					Value: &openapi3.Schema{
						Description: "Response data",
					},
				},
			},
		},
	}
	spec.Components.Schemas["SuccessResponse"] = successSchema

}

// addEnumSchemas adds dedicated enum schemas for all enum types
func (sg *SchemaGenerator) addEnumSchemas(spec *openapi3.T) {
	// Define all enum types with their values
	enumDefinitions := map[string][]string{
		"PersonaTypeEnum":          {"dns", "http"},
		"ProxyProtocolEnum":        {"http", "https", "socks5", "socks4"},
		"ProxyStatusEnum":          {"Active", "Disabled", "Testing", "Failed"},
		"PersonaStatusEnum":        {"Active", "Disabled", "Testing", "Failed"},
		"KeywordRuleTypeEnum":      {"string", "regex"},
		"JobTypeEnum":              {"generation", "dns_validation", "http_keyword_validation", "analysis"},
		"CampaignJobStatusEnum":    {"pending", "queued", "running", "completed", "failed", "cancelled"},
		"JobBusinessStatusEnum":    {"processing", "retry", "priority_queued", "batch_optimized"},
		"ValidationStatusEnum":     {"pending", "valid", "invalid", "error", "skipped"},
		"DNSValidationStatusEnum":  {"resolved", "unresolved", "timeout", "error"},
		"HTTPValidationStatusEnum": {"success", "failed", "timeout", "error"},
		"PhaseTypeEnum":            {"domain_generation", "dns_validation", "http_keyword_validation", "analysis"},
		"PhaseStatusEnum":          {"not_started", "ready", "configured", "in_progress", "paused", "completed", "failed"},
		"DomainDNSStatusEnum":      {"pending", "ok", "error", "timeout"},
		"DomainHTTPStatusEnum":     {"pending", "ok", "error", "timeout"},
		"DomainLeadStatusEnum":     {"pending", "match", "no_match", "error", "timeout"},
	}

	for enumName, enumValues := range enumDefinitions {
		enumInterfaces := make([]interface{}, len(enumValues))
		for i, val := range enumValues {
			enumInterfaces[i] = val
		}

		enumSchema := &openapi3.SchemaRef{
			Value: &openapi3.Schema{
				Type:        &openapi3.Types{"string"},
				Enum:        enumInterfaces,
				Description: fmt.Sprintf("Enumeration for %s", enumName),
			},
		}
		spec.Components.Schemas[enumName] = enumSchema

		if sg.config.VerboseLogging {
			fmt.Printf("Added enum schema for %s with values: %v\n", enumName, enumValues)
		}
	}
}

// getExplicitSchemaForType returns predefined schemas for known free-form object types
// NOTE: Removed all hardcoded handler schemas to allow proper reflection-based generation
func (sg *SchemaGenerator) getExplicitSchemaForType(_ string) *openapi3.SchemaRef {
	// No explicit schemas - let reflection system handle all types properly
	return nil
}

// applyEnumConstraints applies enum constraints to a field schema based on validation tag values
func (sg *SchemaGenerator) applyEnumConstraints(fieldSchema *openapi3.SchemaRef, enumValues []string) {
	if fieldSchema.Value == nil || len(enumValues) == 0 {
		return
	}

	// Convert string enum values to interface{} array for OpenAPI
	enumInterfaces := make([]interface{}, len(enumValues))
	for i, val := range enumValues {
		enumInterfaces[i] = val
	}

	// Apply enum constraint to the schema
	fieldSchema.Value.Enum = enumInterfaces

	// Ensure the type is set to string for enum fields (since Go enums are typically strings)
	if fieldSchema.Value.Type == nil || len(*fieldSchema.Value.Type) == 0 {
		fieldSchema.Value.Type = &openapi3.Types{"string"}
	} else if (*fieldSchema.Value.Type)[0] != "string" {
		// Only override if it's not already string type
		fieldSchema.Value.Type = &openapi3.Types{"string"}
	}

	// Clear any conflicting format constraints when applying enum values
	// Enum fields shouldn't have format constraints like "date-time"
	fieldSchema.Value.Format = ""

	if sg.config.VerboseLogging {
		fmt.Printf("Applied enum constraints to field: %v\n", enumValues)
	}
}

// cleanTypeName removes package prefixes from type names to create clean schema names
func (sg *SchemaGenerator) cleanTypeName(typeName string) string {
	// Strip package prefixes if present to match schema naming
	cleanName := strings.TrimPrefix(typeName, "models.")
	cleanName = strings.TrimPrefix(cleanName, "config.")
	cleanName = strings.TrimPrefix(cleanName, "services.")
	cleanName = strings.TrimPrefix(cleanName, "api.")
	return cleanName
}

// isStringEnum checks if a type is a string-based enum
func (sg *SchemaGenerator) isStringEnum(typeSpec *ast.TypeSpec, _ string) bool {
	// Check if the underlying type is a string
	if ident, ok := typeSpec.Type.(*ast.Ident); ok {
		return ident.Name == "string"
	}
	return false
}

// isStringEnumByName checks if a type name is a string-based enum by looking up its TypeSpec
func (sg *SchemaGenerator) isStringEnumByName(typeName string) bool {
	if sg.config.VerboseLogging && (typeName == "CampaignTypeEnum" || typeName == "CampaignStatusEnum") {
		fmt.Printf("Looking for enum type %s in %d packages\n", typeName, len(sg.packages))
	}

	// Look up the type spec in our parsed files
	for pkgName, pkg := range sg.packages {
		for fileName, file := range pkg.Files {
			for _, decl := range file.Decls {
				if genDecl, ok := decl.(*ast.GenDecl); ok && genDecl.Tok == token.TYPE {
					for _, spec := range genDecl.Specs {
						if typeSpec, ok := spec.(*ast.TypeSpec); ok && typeSpec.Name.Name == typeName {
							if sg.config.VerboseLogging && (typeName == "CampaignTypeEnum" || typeName == "CampaignStatusEnum") {
								fmt.Printf("Found enum type %s in package %s, file %s\n", typeName, pkgName, fileName)
							}
							return sg.isStringEnum(typeSpec, typeName)
						}
					}
				}
			}
		}
	}

	if sg.config.VerboseLogging && (typeName == "CampaignTypeEnum" || typeName == "CampaignStatusEnum") {
		fmt.Printf("Enum type %s not found in any package\n", typeName)
	}
	return false
}

// extractEnumValues extracts enum values from Go const declarations
func (sg *SchemaGenerator) extractEnumValues(typeName string) []string {
	var enumValues []string

	// Look through all packages for const declarations of this type
	for _, pkg := range sg.packages {
		for _, file := range pkg.Files {
			for _, decl := range file.Decls {
				if genDecl, ok := decl.(*ast.GenDecl); ok && genDecl.Tok == token.CONST {
					for _, spec := range genDecl.Specs {
						if valueSpec, ok := spec.(*ast.ValueSpec); ok {
							// Check if this const is of our enum type
							if valueSpec.Type != nil {
								if ident, ok := valueSpec.Type.(*ast.Ident); ok && ident.Name == typeName {
									// Extract the string value
									for _, value := range valueSpec.Values {
										if basicLit, ok := value.(*ast.BasicLit); ok && basicLit.Kind == token.STRING {
											// Remove quotes from string literal
											enumValue := strings.Trim(basicLit.Value, `"`)
											enumValues = append(enumValues, enumValue)
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}

	return enumValues
}
