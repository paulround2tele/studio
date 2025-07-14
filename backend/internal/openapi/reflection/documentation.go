package reflection

import (
	"go/ast"
	"go/token"
	"regexp"
	"strings"

	"github.com/fntelecomllc/studio/backend/internal/openapi/config"
)

// DocumentationExtractor extracts documentation from Go source code
type DocumentationExtractor struct {
	config   *config.GenerationConfig
	fileSet  *token.FileSet
	packages map[string]*ast.Package
}

// Documentation represents extracted documentation
type Documentation struct {
	Summary     string
	Description string
	Tags        []string
	Parameters  map[string]string
	Returns     string
	Examples    []string
	Deprecated  bool
}

// NewDocumentationExtractor creates a new documentation extractor
func NewDocumentationExtractor(cfg *config.GenerationConfig) *DocumentationExtractor {
	return &DocumentationExtractor{
		config:   cfg,
		fileSet:  token.NewFileSet(),
		packages: make(map[string]*ast.Package),
	}
}

// ExtractDocumentation extracts documentation from function comments
func (de *DocumentationExtractor) ExtractDocumentation(fn *ast.FuncDecl) *Documentation {
	if fn == nil || fn.Doc == nil {
		return &Documentation{}
	}

	doc := &Documentation{
		Parameters: make(map[string]string),
		Examples:   []string{},
	}

	var comments []string
	for _, comment := range fn.Doc.List {
		text := strings.TrimPrefix(comment.Text, "//")
		text = strings.TrimSpace(text)
		if text != "" {
			comments = append(comments, text)
		}
	}

	if len(comments) == 0 {
		return doc
	}

	// First line is typically the summary
	doc.Summary = comments[0]

	// Parse the rest of the comments
	var descriptionLines []string
	for i, line := range comments {
		if i == 0 {
			continue // Skip summary line
		}

		// Check for special documentation patterns
		if de.parseSpecialComment(line, doc) {
			continue
		}

		// Otherwise, it's part of the description
		descriptionLines = append(descriptionLines, line)
	}

	if len(descriptionLines) > 0 {
		doc.Description = strings.Join(descriptionLines, " ")
	}

	return doc
}

// parseSpecialComment parses special documentation patterns like @param, @return, etc.
func (de *DocumentationExtractor) parseSpecialComment(line string, doc *Documentation) bool {
	line = strings.TrimSpace(line)

	// @param pattern
	if strings.HasPrefix(line, "@param") {
		return de.parseParamComment(line, doc)
	}

	// @return pattern
	if strings.HasPrefix(line, "@return") || strings.HasPrefix(line, "@returns") {
		doc.Returns = strings.TrimSpace(strings.TrimPrefix(strings.TrimPrefix(line, "@returns"), "@return"))
		return true
	}

	// @deprecated pattern
	if strings.HasPrefix(line, "@deprecated") {
		doc.Deprecated = true
		return true
	}

	// @example pattern
	if strings.HasPrefix(line, "@example") {
		example := strings.TrimSpace(strings.TrimPrefix(line, "@example"))
		if example != "" {
			doc.Examples = append(doc.Examples, example)
		}
		return true
	}

	// @tag pattern
	if strings.HasPrefix(line, "@tag") {
		tag := strings.TrimSpace(strings.TrimPrefix(line, "@tag"))
		if tag != "" {
			doc.Tags = append(doc.Tags, tag)
		}
		return true
	}

	return false
}

// parseParamComment parses @param comments like "@param name description"
func (de *DocumentationExtractor) parseParamComment(line string, doc *Documentation) bool {
	// Remove @param prefix
	paramLine := strings.TrimSpace(strings.TrimPrefix(line, "@param"))
	
	// Split into name and description
	parts := strings.SplitN(paramLine, " ", 2)
	if len(parts) >= 2 {
		paramName := strings.TrimSpace(parts[0])
		paramDesc := strings.TrimSpace(parts[1])
		doc.Parameters[paramName] = paramDesc
		return true
	}

	return false
}

// ExtractRouteDocumentation extracts documentation specifically for API routes
func (de *DocumentationExtractor) ExtractRouteDocumentation(fn *ast.FuncDecl, route *DiscoveredRoute) {
	doc := de.ExtractDocumentation(fn)

	// Apply extracted documentation to the route
	if doc.Summary != "" {
		route.Summary = doc.Summary
	}

	if doc.Description != "" {
		route.Description = doc.Description
	}

	if len(doc.Tags) > 0 {
		route.Tags = doc.Tags
	}

	// TODO: Apply parameter descriptions to route parameters
	de.applyParameterDocumentation(doc, route)
}

// applyParameterDocumentation applies parameter documentation to route parameters
func (de *DocumentationExtractor) applyParameterDocumentation(doc *Documentation, route *DiscoveredRoute) {
	for i, param := range route.Parameters {
		if param.Value != nil {
			paramName := param.Value.Name
			if description, exists := doc.Parameters[paramName]; exists {
				param.Value.Description = description
				route.Parameters[i] = param
			}
		}
	}
}

// ExtractTypeDocumentation extracts documentation from type declarations
func (de *DocumentationExtractor) ExtractTypeDocumentation(typeSpec *ast.TypeSpec) *Documentation {
	if typeSpec.Doc == nil {
		return &Documentation{}
	}

	doc := &Documentation{
		Parameters: make(map[string]string),
		Examples:   []string{},
	}

	var comments []string
	for _, comment := range typeSpec.Doc.List {
		text := strings.TrimPrefix(comment.Text, "//")
		text = strings.TrimSpace(text)
		if text != "" {
			comments = append(comments, text)
		}
	}

	if len(comments) > 0 {
		doc.Summary = comments[0]
		if len(comments) > 1 {
			doc.Description = strings.Join(comments[1:], " ")
		}
	}

	return doc
}

// ExtractFieldDocumentation extracts documentation from struct field comments
func (de *DocumentationExtractor) ExtractFieldDocumentation(field *ast.Field) string {
	if field.Doc != nil && len(field.Doc.List) > 0 {
		comment := strings.TrimPrefix(field.Doc.List[0].Text, "//")
		return strings.TrimSpace(comment)
	}

	if field.Comment != nil && len(field.Comment.List) > 0 {
		comment := strings.TrimPrefix(field.Comment.List[0].Text, "//")
		return strings.TrimSpace(comment)
	}

	return ""
}

// ParseAPIAnnotations parses special API annotations from comments
func (de *DocumentationExtractor) ParseAPIAnnotations(comments []string) map[string]string {
	annotations := make(map[string]string)
	
	for _, comment := range comments {
		comment = strings.TrimSpace(comment)
		
		// Look for @api annotations
		if strings.HasPrefix(comment, "@api") {
			de.parseAPIAnnotation(comment, annotations)
		}
	}
	
	return annotations
}

// parseAPIAnnotation parses individual API annotations
func (de *DocumentationExtractor) parseAPIAnnotation(comment string, annotations map[string]string) {
	// Patterns like:
	// @api {GET} /path Description
	// @api version 1.0
	// @api deprecated true

	re := regexp.MustCompile(`@api\s+(\w+)\s+(.+)`)
	matches := re.FindStringSubmatch(comment)
	
	if len(matches) == 3 {
		key := strings.TrimSpace(matches[1])
		value := strings.TrimSpace(matches[2])
		annotations[key] = value
	}
}

// CleanDescription cleans and formats a description string
func (de *DocumentationExtractor) CleanDescription(description string) string {
	// Remove extra whitespace
	description = regexp.MustCompile(`\s+`).ReplaceAllString(description, " ")
	
	// Trim whitespace
	description = strings.TrimSpace(description)
	
	// Ensure it ends with a period if it's a sentence
	if description != "" && !strings.HasSuffix(description, ".") && 
	   !strings.HasSuffix(description, "!") && !strings.HasSuffix(description, "?") {
		description += "."
	}
	
	return description
}

// GenerateDefaultDocumentation generates default documentation for handlers without comments
func (de *DocumentationExtractor) GenerateDefaultDocumentation(handlerName, method, path string) *Documentation {
	doc := &Documentation{
		Parameters: make(map[string]string),
		Examples:   []string{},
	}

	// Generate default summary based on handler name
	if strings.HasSuffix(handlerName, "Gin") {
		handlerName = strings.TrimSuffix(handlerName, "Gin")
	}

	doc.Summary = de.generateDefaultSummary(handlerName, method)
	doc.Description = de.generateDefaultDescription(method, path)

	return doc
}

// generateDefaultSummary generates a default summary from handler name and method
func (de *DocumentationExtractor) generateDefaultSummary(handlerName, method string) string {
	// Convert camelCase to sentence case
	summary := camelToSentence(handlerName)
	if summary == "" {
		summary = strings.Title(strings.ToLower(method)) + " operation"
	}
	return summary
}

// generateDefaultDescription generates a default description from method and path
func (de *DocumentationExtractor) generateDefaultDescription(method, path string) string {
	resource := extractResourceFromPath(path)
	return strings.Title(strings.ToLower(method)) + " " + resource + " endpoint"
}