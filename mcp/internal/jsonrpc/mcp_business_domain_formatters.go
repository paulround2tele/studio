package jsonrpc

import (
	"encoding/json"
	"fmt"
	"mcp/internal/models"
	"strings"
)

// formatAPIClientAnalysis formats the frontend API client analysis results
func formatAPIClientAnalysis(analysis map[string]interface{}) string {
	var result strings.Builder
	result.WriteString("🔍 Frontend API Client Analysis\n")
	result.WriteString("=" + strings.Repeat("=", 40) + "\n\n")

	if status, ok := analysis["status"].(string); ok {
		result.WriteString(fmt.Sprintf("Status: %s\n", status))
	}

	if clientType, ok := analysis["client_type"].(string); ok {
		result.WriteString(fmt.Sprintf("Client Type: %s\n", clientType))
	}

	if apiClasses, ok := analysis["api_classes"].([]string); ok {
		result.WriteString(fmt.Sprintf("\n📚 API Classes (%d):\n", len(apiClasses)))
		for _, class := range apiClasses {
			result.WriteString(fmt.Sprintf("  • %s\n", class))
		}
	}

	if modelTypes, ok := analysis["model_types"].([]string); ok {
		result.WriteString(fmt.Sprintf("\n🏗️ Model Types (%d):\n", len(modelTypes)))
		for _, model := range modelTypes {
			result.WriteString(fmt.Sprintf("  • %s\n", model))
		}
	}

	if features, ok := analysis["client_features"].([]string); ok {
		result.WriteString(fmt.Sprintf("\n✨ Features (%d):\n", len(features)))
		for _, feature := range features {
			result.WriteString(fmt.Sprintf("  • %s\n", feature))
		}
	}

	if docs, ok := analysis["documentation"].([]string); ok {
		result.WriteString(fmt.Sprintf("\n📖 Documentation (%d):\n", len(docs)))
		for _, doc := range docs {
			result.WriteString(fmt.Sprintf("  • %s\n", doc))
		}
	}

	if businessDomains, ok := analysis["business_domains"].([]string); ok {
		result.WriteString(fmt.Sprintf("\n🏢 Business Domains (%d):\n", len(businessDomains)))
		for _, domain := range businessDomains {
			result.WriteString(fmt.Sprintf("  • %s\n", domain))
		}
	}

	if totalEndpoints, ok := analysis["total_endpoints"].(int); ok {
		result.WriteString(fmt.Sprintf("\n🔗 Total Endpoints: %d\n", totalEndpoints))
	}

	return result.String()
}

// formatBusinessDomains formats business domain analysis results
func formatBusinessDomains(domains []models.BusinessDomain) string {
	var result strings.Builder
	result.WriteString("🏢 Business Domains Analysis\n")
	result.WriteString("=" + strings.Repeat("=", 40) + "\n\n")

	if len(domains) == 0 {
		result.WriteString("No business domains found.\n")
		return result.String()
	}

	for i, domain := range domains {
		if i > 0 {
			result.WriteString("\n" + strings.Repeat("-", 40) + "\n\n")
		}

		result.WriteString(fmt.Sprintf("🏷️ Domain: %s\n", domain.Name))
		result.WriteString(fmt.Sprintf("📄 Description: %s\n", domain.Description))
		result.WriteString(fmt.Sprintf("📁 Path: %s\n", domain.Path))

		if len(domain.Services) > 0 {
			result.WriteString("\n🔧 Services:\n")
			for _, service := range domain.Services {
				result.WriteString(fmt.Sprintf("  • %s\n", service))
			}
		}

		if len(domain.APIs) > 0 {
			result.WriteString("\n🔗 APIs:\n")
			for _, api := range domain.APIs {
				result.WriteString(fmt.Sprintf("  • %s\n", api))
			}
		}
	}

	return result.String()
}

// formatAdvancedTools formats advanced tooling analysis results
func formatAdvancedTools(tools []models.AdvancedTool) string {
	var result strings.Builder
	result.WriteString("🛠️ Advanced Development Tools\n")
	result.WriteString("=" + strings.Repeat("=", 40) + "\n\n")

	if len(tools) == 0 {
		result.WriteString("No advanced tools found.\n")
		return result.String()
	}

	categories := make(map[string][]models.AdvancedTool)
	for _, tool := range tools {
		categories[tool.Category] = append(categories[tool.Category], tool)
	}

	for category, categoryTools := range categories {
		result.WriteString(fmt.Sprintf("📂 %s:\n", strings.ToUpper(string(category[0]))+category[1:]))
		for _, tool := range categoryTools {
			result.WriteString(fmt.Sprintf("  🔧 %s (%s)\n", tool.Name, tool.Type))
			result.WriteString(fmt.Sprintf("     📄 %s\n", tool.Description))
			result.WriteString(fmt.Sprintf("     📁 %s\n", tool.Path))
		}
		result.WriteString("\n")
	}

	return result.String()
}

// formatServices formats service analysis results
func formatServices(services []models.Service, domainName string) string {
	var result strings.Builder
	result.WriteString(fmt.Sprintf("🔧 %s Services\n", domainName))
	result.WriteString("=" + strings.Repeat("=", 40) + "\n\n")

	if len(services) == 0 {
		result.WriteString(fmt.Sprintf("No %s services found.\n", strings.ToLower(domainName)))
		return result.String()
	}

	for i, service := range services {
		if i > 0 {
			result.WriteString("\n" + strings.Repeat("-", 30) + "\n\n")
		}

		result.WriteString(fmt.Sprintf("🏷️ Service: %s\n", service.Name))
		result.WriteString(fmt.Sprintf("📁 File: %s\n", service.File))
		result.WriteString(fmt.Sprintf("🏢 Category: %s\n", service.Category))

		if service.Interface != "" {
			result.WriteString(fmt.Sprintf("🔌 Interface: %s\n", service.Interface))
		}

		if len(service.Methods) > 0 {
			result.WriteString(fmt.Sprintf("\n📋 Methods (%d):\n", len(service.Methods)))
			for _, method := range service.Methods {
				result.WriteString(fmt.Sprintf("  • %s\n", method))
			}
		}
	}

	return result.String()
}

// formatAPISpecs formats API specification analysis results
func formatAPISpecs(specs interface{}, title string) string {
	var result strings.Builder
	result.WriteString(fmt.Sprintf("📋 %s Specifications\n", title))
	result.WriteString("=" + strings.Repeat("=", 40) + "\n\n")

	// Convert specs to JSON for display
	jsonData, err := json.MarshalIndent(specs, "", "  ")
	if err != nil {
		result.WriteString("Error formatting API specifications: " + err.Error())
		return result.String()
	}

	result.WriteString(string(jsonData))
	return result.String()
}

// formatBusinessDomainRoutes formats business domain route categorization
func formatBusinessDomainRoutes(routes map[string][]models.Route) string {
	var result strings.Builder
	result.WriteString("🔗 Business Domain Routes\n")
	result.WriteString("=" + strings.Repeat("=", 40) + "\n\n")

	if len(routes) == 0 {
		result.WriteString("No domain-categorized routes found.\n")
		return result.String()
	}

	for domain, domainRoutes := range routes {
		result.WriteString(fmt.Sprintf("🏢 %s Domain (%d routes):\n", domain, len(domainRoutes)))
		for _, route := range domainRoutes {
			result.WriteString(fmt.Sprintf("  %s %s -> %s\n", route.Method, route.Path, route.Handler))
		}
		result.WriteString("\n")
	}

	return result.String()
}

// formatEnhancedDependencies formats enhanced dependency analysis
func formatEnhancedDependencies(deps map[string]interface{}) string {
	var result strings.Builder
	result.WriteString("🔗 Enhanced Dependency Analysis\n")
	result.WriteString("=" + strings.Repeat("=", 40) + "\n\n")

	// Format standard dependencies
	if stdDeps, ok := deps["dependencies"].([]models.Dependency); ok {
		result.WriteString(fmt.Sprintf("📦 Standard Dependencies (%d):\n", len(stdDeps)))
		for _, dep := range stdDeps {
			result.WriteString(fmt.Sprintf("  • %s %s\n", dep.Path, dep.Version))
		}
		result.WriteString("\n")
	}

	// Format internal dependencies
	if internalDeps, ok := deps["internalDependencies"].(map[string][]string); ok {
		result.WriteString("🏗️ Internal Service Dependencies:\n")
		for service, serviceDeps := range internalDeps {
			result.WriteString(fmt.Sprintf("  🔧 %s:\n", service))
			for _, dep := range serviceDeps {
				result.WriteString(fmt.Sprintf("    • %s\n", dep))
			}
		}
		result.WriteString("\n")
	}

	// Format business domain dependencies
	if domainDeps, ok := deps["businessDomainDependencies"].(map[string]interface{}); ok {
		result.WriteString("🏢 Business Domain Dependencies:\n")
		for domain, domainInfo := range domainDeps {
			result.WriteString(fmt.Sprintf("  🏷️ %s:\n", domain))
			if domainMap, ok := domainInfo.(map[string]interface{}); ok {
				if refs, ok := domainMap["references"].([]string); ok {
					result.WriteString("    📋 References:\n")
					for _, ref := range refs {
						result.WriteString(fmt.Sprintf("      • %s\n", ref))
					}
				}
			}
		}
	}

	return result.String()
}

// formatEnhancedSecurityAnalysis formats enhanced security analysis
func formatEnhancedSecurityAnalysis(analysis map[string]interface{}) string {
	var result strings.Builder
	result.WriteString("🔒 Enhanced Security Analysis\n")
	result.WriteString("=" + strings.Repeat("=", 40) + "\n\n")

	// Format security policies
	if policies, ok := analysis["securityPolicies"].([]models.SecurityPolicy); ok {
		result.WriteString(fmt.Sprintf("📋 Security Policies (%d):\n", len(policies)))
		for _, policy := range policies {
			result.WriteString(fmt.Sprintf("  🛡️ %s: %s\n", policy.Name, policy.Description))
		}
		result.WriteString("\n")
	}

	// Format business domain auth patterns
	if authPatterns, ok := analysis["businessDomainAuthPatterns"].(map[string]interface{}); ok {
		result.WriteString("🏢 Business Domain Auth Patterns:\n")
		for domain, patterns := range authPatterns {
			result.WriteString(fmt.Sprintf("  🏷️ %s:\n", domain))
			if patternMap, ok := patterns.(map[string]interface{}); ok {
				for pattern, enabled := range patternMap {
					result.WriteString(fmt.Sprintf("    • %s: %v\n", pattern, enabled))
				}
			}
		}
		result.WriteString("\n")
	}

	// Format enhanced auth mechanisms
	if mechanisms, ok := analysis["enhancedAuthMechanisms"].([]string); ok {
		result.WriteString(fmt.Sprintf("🔐 Enhanced Auth Mechanisms (%d):\n", len(mechanisms)))
		for _, mechanism := range mechanisms {
			result.WriteString(fmt.Sprintf("  • %s\n", mechanism))
		}
	}

	return result.String()
}

// formatEnhancedAPISchema formats enhanced API schema analysis
func formatEnhancedAPISchema(schema interface{}) string {
	var result strings.Builder
	result.WriteString("📋 Enhanced API Schema Analysis\n")
	result.WriteString("=" + strings.Repeat("=", 40) + "\n\n")

	// Convert schema to JSON for detailed display
	jsonData, err := json.MarshalIndent(schema, "", "  ")
	if err != nil {
		result.WriteString("Error formatting enhanced API schema: " + err.Error())
		return result.String()
	}

	result.WriteString(string(jsonData))
	return result.String()
}

// formatBusinessDomainMiddleware formats business domain middleware
func formatBusinessDomainMiddleware(middleware []models.Middleware) string {
	var result strings.Builder
	result.WriteString("🔧 Business Domain Middleware\n")
	result.WriteString("=" + strings.Repeat("=", 40) + "\n\n")

	if len(middleware) == 0 {
		result.WriteString("No business domain-specific middleware found.\n")
		return result.String()
	}

	domains := make(map[string][]models.Middleware)
	for _, mw := range middleware {
		domains[mw.BusinessDomain] = append(domains[mw.BusinessDomain], mw)
	}

	for domain, domainMiddleware := range domains {
		result.WriteString(fmt.Sprintf("🏢 %s Domain:\n", domain))
		for _, mw := range domainMiddleware {
			result.WriteString(fmt.Sprintf("  🔧 %s (%s)\n", mw.Name, mw.Type))
			result.WriteString(fmt.Sprintf("     📁 %s:%d\n", mw.File, mw.Line))
		}
		result.WriteString("\n")
	}

	return result.String()
}

// formatInternalServiceDependencies formats internal service dependencies
func formatInternalServiceDependencies(deps map[string][]string) string {
	var result strings.Builder
	result.WriteString("🔗 Internal Service Dependencies\n")
	result.WriteString("=" + strings.Repeat("=", 40) + "\n\n")

	if len(deps) == 0 {
		result.WriteString("No internal service dependencies found.\n")
		return result.String()
	}

	for service, serviceDeps := range deps {
		result.WriteString(fmt.Sprintf("🔧 %s:\n", service))
		if len(serviceDeps) == 0 {
			result.WriteString("  (no dependencies)\n")
		} else {
			for _, dep := range serviceDeps {
				result.WriteString(fmt.Sprintf("  • %s\n", dep))
			}
		}
		result.WriteString("\n")
	}

	return result.String()
}

// formatBusinessDomainCrossDependencies formats cross-dependencies between business domains
func formatBusinessDomainCrossDependencies(deps map[string]interface{}) string {
	var result strings.Builder
	result.WriteString("🔗 Business Domain Cross Dependencies\n")
	result.WriteString("=" + strings.Repeat("=", 40) + "\n\n")

	if len(deps) == 0 {
		result.WriteString("No cross-domain dependencies found.\n")
		return result.String()
	}

	for domain, domainDeps := range deps {
		result.WriteString(fmt.Sprintf("🏢 %s:\n", domain))
		if depMap, ok := domainDeps.(map[string]interface{}); ok {
			if refs, ok := depMap["references"].([]string); ok {
				result.WriteString("  📋 References:\n")
				for _, ref := range refs {
					result.WriteString(fmt.Sprintf("    • %s\n", ref))
				}
			}
		}
		result.WriteString("\n")
	}

	return result.String()
}