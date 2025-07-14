package reflection

import (
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"strings"

	"github.com/fntelecomllc/studio/backend/internal/openapi/config"
)

// TypeInspector provides advanced type analysis capabilities
type TypeInspector struct {
	config     *config.GenerationConfig
	fileSet    *token.FileSet
	packages   map[string]*ast.Package
	typeCache  map[string]*TypeInfo
	circularCheck map[string]bool
}

// TypeInfo contains detailed information about a Go type
type TypeInfo struct {
	Name        string
	Kind        TypeKind
	Package     string
	Fields      []FieldInfo
	Methods     []MethodInfo
	IsExported  bool
	IsPointer   bool
	IsSlice     bool
	IsMap       bool
	IsEnum      bool
	BaseType    string
	EnumValues  []string
	ElementType *TypeInfo
	KeyType     *TypeInfo
	ValueType   *TypeInfo
}

// FieldInfo contains information about a struct field
type FieldInfo struct {
	Name        string
	Type        *TypeInfo
	JSONName    string
	Tags        map[string]string
	IsRequired  bool
	IsOmitEmpty bool
	IsExported  bool
	Description string
	EnumValues  []string // Extracted from validate:"oneof=..." tags
}

// MethodInfo contains information about a method
type MethodInfo struct {
	Name       string
	IsExported bool
	Parameters []ParameterInfo
	Returns    []ParameterInfo
}

// ParameterInfo contains information about method parameters
type ParameterInfo struct {
	Name string
	Type *TypeInfo
}

// TypeKind represents the kind of a Go type
type TypeKind int

const (
	TypeKindUnknown TypeKind = iota
	TypeKindBasic
	TypeKindStruct
	TypeKindInterface
	TypeKindArray
	TypeKindSlice
	TypeKindMap
	TypeKindPointer
	TypeKindFunc
	TypeKindChan
	TypeKindEnum
)

// NewTypeInspector creates a new type inspector
func NewTypeInspector(cfg *config.GenerationConfig) *TypeInspector {
	return &TypeInspector{
		config:        cfg,
		fileSet:       token.NewFileSet(),
		packages:      make(map[string]*ast.Package),
		typeCache:     make(map[string]*TypeInfo),
		circularCheck: make(map[string]bool),
	}
}

// InspectType performs deep inspection of a Go type
func (ti *TypeInspector) InspectType(typeName string) (*TypeInfo, error) {
	// Check cache first
	if typeInfo, exists := ti.typeCache[typeName]; exists {
		return typeInfo, nil
	}

	// Check for circular reference
	if ti.circularCheck[typeName] {
		return &TypeInfo{
			Name: typeName,
			Kind: TypeKindUnknown,
		}, nil
	}

	// Mark as being processed
	ti.circularCheck[typeName] = true
	defer delete(ti.circularCheck, typeName)

	// Parse packages if not already done
	if len(ti.packages) == 0 {
		err := ti.parsePackages()
		if err != nil {
			return nil, err
		}
	}

	// Find the type definition
	typeSpec := ti.findTypeSpec(typeName)
	if typeSpec == nil {
		// Try to handle built-in types
		return ti.inspectBuiltinType(typeName), nil
	}

	// Inspect the type
	typeInfo, err := ti.inspectTypeSpec(typeSpec)
	if err != nil {
		return nil, err
	}

	// Cache the result
	ti.typeCache[typeName] = typeInfo

	return typeInfo, nil
}

// parsePackages parses all configured packages
func (ti *TypeInspector) parsePackages() error {
	for _, pkgPath := range ti.config.PackagePaths {
		packages, err := parser.ParseDir(ti.fileSet, pkgPath, nil, parser.ParseComments)
		if err != nil {
			if ti.config.VerboseLogging {
				fmt.Printf("Warning: Failed to parse package %s: %v\n", pkgPath, err)
			}
			continue
		}

		for name, pkg := range packages {
			ti.packages[name] = pkg
		}
	}
	return nil
}

// findTypeSpec finds a type specification by name
func (ti *TypeInspector) findTypeSpec(typeName string) *ast.TypeSpec {
	for _, pkg := range ti.packages {
		for _, file := range pkg.Files {
			for _, decl := range file.Decls {
				if genDecl, ok := decl.(*ast.GenDecl); ok && genDecl.Tok == token.TYPE {
					for _, spec := range genDecl.Specs {
						if typeSpec, ok := spec.(*ast.TypeSpec); ok {
							if typeSpec.Name.Name == typeName {
								return typeSpec
							}
						}
					}
				}
			}
		}
	}
	return nil
}

// inspectBuiltinType handles built-in Go types
func (ti *TypeInspector) inspectBuiltinType(typeName string) *TypeInfo {
	kind := TypeKindBasic
	
	switch typeName {
	case "string", "int", "int8", "int16", "int32", "int64",
		 "uint", "uint8", "uint16", "uint32", "uint64",
		 "float32", "float64", "bool", "byte", "rune":
		kind = TypeKindBasic
	default:
		kind = TypeKindUnknown
	}

	return &TypeInfo{
		Name:       typeName,
		Kind:       kind,
		IsExported: true,
	}
}

// inspectTypeSpec inspects an AST type specification
func (ti *TypeInspector) inspectTypeSpec(typeSpec *ast.TypeSpec) (*TypeInfo, error) {
	typeInfo := &TypeInfo{
		Name:       typeSpec.Name.Name,
		IsExported: typeSpec.Name.IsExported(),
	}

	switch t := typeSpec.Type.(type) {
	case *ast.StructType:
		return ti.inspectStructType(t, typeInfo)
	case *ast.InterfaceType:
		typeInfo.Kind = TypeKindInterface
		return typeInfo, nil
	case *ast.ArrayType:
		return ti.inspectArrayType(t, typeInfo)
	case *ast.MapType:
		return ti.inspectMapType(t, typeInfo)
	case *ast.StarExpr:
		return ti.inspectPointerType(t, typeInfo)
	case *ast.Ident:
		// Type alias - check if this is an enum type
		if t.Name == "string" {
			// Check if this is an enum type by looking for constants with the type name
			enumValues := ti.findEnumConstants(typeInfo.Name)
			if len(enumValues) > 0 {
				typeInfo.Kind = TypeKindEnum
				typeInfo.IsEnum = true
				typeInfo.EnumValues = enumValues
				typeInfo.BaseType = "string"
				return typeInfo, nil
			}
		}
		
		// Regular type alias
		aliasedType, err := ti.InspectType(t.Name)
		if err != nil {
			return typeInfo, nil
		}
		return aliasedType, nil
	default:
		typeInfo.Kind = TypeKindUnknown
		return typeInfo, nil
	}
}

// inspectStructType inspects a struct type
func (ti *TypeInspector) inspectStructType(structType *ast.StructType, typeInfo *TypeInfo) (*TypeInfo, error) {
	typeInfo.Kind = TypeKindStruct
	
	for _, field := range structType.Fields.List {
		for _, name := range field.Names {
			fieldInfo, err := ti.inspectField(field, name.Name)
			if err != nil {
				if ti.config.VerboseLogging {
					fmt.Printf("Warning: Failed to inspect field %s: %v\n", name.Name, err)
				}
				continue
			}
			typeInfo.Fields = append(typeInfo.Fields, *fieldInfo)
		}
	}
	
	return typeInfo, nil
}

// inspectField inspects a struct field
func (ti *TypeInspector) inspectField(field *ast.Field, fieldName string) (*FieldInfo, error) {
	fieldInfo := &FieldInfo{
		Name:       fieldName,
		IsExported: ast.IsExported(fieldName),
		Tags:       make(map[string]string),
	}

	// Extract field type
	fieldType, err := ti.inspectFieldType(field.Type)
	if err != nil {
		return nil, err
	}
	fieldInfo.Type = fieldType

	// Extract tags
	if field.Tag != nil {
		ti.parseFieldTags(field.Tag.Value, fieldInfo)
	}

	// Extract documentation
	if field.Doc != nil && len(field.Doc.List) > 0 {
		comment := strings.TrimPrefix(field.Doc.List[0].Text, "//")
		fieldInfo.Description = strings.TrimSpace(comment)
	}

	return fieldInfo, nil
}

// inspectFieldType inspects the type of a field
func (ti *TypeInspector) inspectFieldType(fieldType ast.Expr) (*TypeInfo, error) {
	switch t := fieldType.(type) {
	case *ast.Ident:
		return ti.InspectType(t.Name)
	case *ast.StarExpr:
		underlyingType, err := ti.inspectFieldType(t.X)
		if err != nil {
			return nil, err
		}
		return &TypeInfo{
			Name:      "*" + underlyingType.Name,
			Kind:      TypeKindPointer,
			IsPointer: true,
			ElementType: underlyingType,
		}, nil
	case *ast.ArrayType:
		elementType, err := ti.inspectFieldType(t.Elt)
		if err != nil {
			return nil, err
		}
		if t.Len == nil {
			// Slice
			return &TypeInfo{
				Name:        "[]" + elementType.Name,
				Kind:        TypeKindSlice,
				IsSlice:     true,
				ElementType: elementType,
			}, nil
		} else {
			// Array
			return &TypeInfo{
				Name:        "[]" + elementType.Name,
				Kind:        TypeKindArray,
				ElementType: elementType,
			}, nil
		}
	case *ast.MapType:
		keyType, err := ti.inspectFieldType(t.Key)
		if err != nil {
			return nil, err
		}
		valueType, err := ti.inspectFieldType(t.Value)
		if err != nil {
			return nil, err
		}
		return &TypeInfo{
			Name:      fmt.Sprintf("map[%s]%s", keyType.Name, valueType.Name),
			Kind:      TypeKindMap,
			IsMap:     true,
			KeyType:   keyType,
			ValueType: valueType,
		}, nil
	case *ast.SelectorExpr:
		// External package type
		if ident, ok := t.X.(*ast.Ident); ok {
			return &TypeInfo{
				Name:    ident.Name + "." + t.Sel.Name,
				Package: ident.Name,
				Kind:    TypeKindUnknown,
			}, nil
		}
	}

	return &TypeInfo{
		Name: "unknown",
		Kind: TypeKindUnknown,
	}, nil
}

// parseFieldTags parses struct field tags
func (ti *TypeInspector) parseFieldTags(tagValue string, fieldInfo *FieldInfo) {
	// Remove backticks
	tagValue = strings.Trim(tagValue, "`")
	
	// Split by spaces (simple parsing)
	parts := strings.Fields(tagValue)
	
	for _, part := range parts {
		if strings.Contains(part, ":") {
			tagParts := strings.SplitN(part, ":", 2)
			if len(tagParts) == 2 {
				key := tagParts[0]
				value := strings.Trim(tagParts[1], `"`)
				fieldInfo.Tags[key] = value
				
				// Handle special tags
				if key == "json" {
					ti.parseJSONTag(value, fieldInfo)
				} else if key == "validate" {
					ti.parseValidateTag(value, fieldInfo)
				}
			}
		}
	}
}

// parseJSONTag parses JSON tags
func (ti *TypeInspector) parseJSONTag(value string, fieldInfo *FieldInfo) {
	parts := strings.Split(value, ",")
	if len(parts) > 0 && parts[0] != "" {
		fieldInfo.JSONName = parts[0]
	}
	
	// Check for omitempty
	for _, part := range parts[1:] {
		if part == "omitempty" {
			fieldInfo.IsOmitEmpty = true
		}
	}
}

// parseValidateTag parses validation tags
func (ti *TypeInspector) parseValidateTag(value string, fieldInfo *FieldInfo) {
	if strings.Contains(value, "required") {
		fieldInfo.IsRequired = true
	}
	
	// Extract enum values from oneof validation
	if strings.Contains(value, "oneof=") {
		fieldInfo.EnumValues = ti.extractOneOfValues(value)
	}
}

// extractOneOfValues extracts enum values from validate:"oneof=value1 value2 value3" tags
func (ti *TypeInspector) extractOneOfValues(validateTag string) []string {
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

// inspectArrayType inspects an array type
func (ti *TypeInspector) inspectArrayType(arrayType *ast.ArrayType, typeInfo *TypeInfo) (*TypeInfo, error) {
	elementType, err := ti.inspectFieldType(arrayType.Elt)
	if err != nil {
		return nil, err
	}
	
	if arrayType.Len == nil {
		typeInfo.Kind = TypeKindSlice
		typeInfo.IsSlice = true
	} else {
		typeInfo.Kind = TypeKindArray
	}
	
	typeInfo.ElementType = elementType
	return typeInfo, nil
}

// inspectMapType inspects a map type
func (ti *TypeInspector) inspectMapType(mapType *ast.MapType, typeInfo *TypeInfo) (*TypeInfo, error) {
	keyType, err := ti.inspectFieldType(mapType.Key)
	if err != nil {
		return nil, err
	}
	
	valueType, err := ti.inspectFieldType(mapType.Value)
	if err != nil {
		return nil, err
	}
	
	typeInfo.Kind = TypeKindMap
	typeInfo.IsMap = true
	typeInfo.KeyType = keyType
	typeInfo.ValueType = valueType
	
	return typeInfo, nil
}

// inspectPointerType inspects a pointer type
func (ti *TypeInspector) inspectPointerType(starExpr *ast.StarExpr, typeInfo *TypeInfo) (*TypeInfo, error) {
	underlyingType, err := ti.inspectFieldType(starExpr.X)
	if err != nil {
		return nil, err
	}
	
	typeInfo.Kind = TypeKindPointer
	typeInfo.IsPointer = true
	typeInfo.ElementType = underlyingType
	
	return typeInfo, nil
}

// IsBasicType checks if a type is a basic Go type
func (ti *TypeInspector) IsBasicType(typeName string) bool {
	basicTypes := []string{
		"string", "int", "int8", "int16", "int32", "int64",
		"uint", "uint8", "uint16", "uint32", "uint64",
		"float32", "float64", "bool", "byte", "rune",
	}
	
	for _, basicType := range basicTypes {
		if typeName == basicType {
			return true
		}
	}
	
	return false
}

// GetExportedFields returns only exported fields from a struct type
func (ti *TypeInspector) GetExportedFields(typeInfo *TypeInfo) []FieldInfo {
	var exportedFields []FieldInfo
	
	for _, field := range typeInfo.Fields {
		if field.IsExported {
			exportedFields = append(exportedFields, field)
		}
	}
	
	return exportedFields
}

// findEnumConstants searches for constants that match the given enum type name
func (ti *TypeInspector) findEnumConstants(enumTypeName string) []string {
	var enumValues []string
	
	// Parse packages if not already done
	if len(ti.packages) == 0 {
		err := ti.parsePackages()
		if err != nil {
			return nil
		}
	}
	
	// Search through all packages for constants of the enum type
	for _, pkg := range ti.packages {
		for _, file := range pkg.Files {
			for _, decl := range file.Decls {
				genDecl, ok := decl.(*ast.GenDecl)
				if !ok || genDecl.Tok != token.CONST {
					continue
				}
				
				// Check each constant declaration
				for _, spec := range genDecl.Specs {
					valueSpec, ok := spec.(*ast.ValueSpec)
					if !ok {
						continue
					}
					
					// Check if this constant is of our enum type
					if valueSpec.Type != nil {
						if ident, ok := valueSpec.Type.(*ast.Ident); ok && ident.Name == enumTypeName {
							// Extract the constant values
							for i := range valueSpec.Names {
								if i < len(valueSpec.Values) {
									if basicLit, ok := valueSpec.Values[i].(*ast.BasicLit); ok && basicLit.Kind == token.STRING {
										// Remove quotes from string literal
										value := strings.Trim(basicLit.Value, `"`)
										enumValues = append(enumValues, value)
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