package jsonrpc

import (
	"mcp/internal/analyzer"
	"path/filepath"
)

// callGetFrontendAPIClientAnalysis implements the frontend_api_client_analysis tool
func (s *JSONRPCServer) callGetFrontendAPIClientAnalysis() (interface{}, error) {
	if s.bridge == nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Bridge not available",
				},
			},
		}, nil
	}

	// Get the frontend root directory (parent of backend)
	frontendRoot := filepath.Dir(s.bridge.BackendPath)
	analysis, err := analyzer.GetFrontendAPIClientAnalysis(frontendRoot)
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error analyzing frontend API client: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": "Frontend API Client Analysis Results",
			},
			{
				"type": "text",
				"text": formatAPIClientAnalysis(analysis),
			},
		},
	}, nil
}

// callGetBusinessDomains implements the get_business_domains tool
func (s *JSONRPCServer) callGetBusinessDomains() (interface{}, error) {
	domains, err := s.bridge.GetBusinessDomains()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting business domains: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatBusinessDomains(domains),
			},
		},
	}, nil
}

// callGetAdvancedTooling implements the get_advanced_tooling tool
func (s *JSONRPCServer) callGetAdvancedTooling() (interface{}, error) {
	tools, err := s.bridge.GetAdvancedTooling()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting advanced tooling: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatAdvancedTools(tools),
			},
		},
	}, nil
}

// callGetKeywordExtractionServices implements the get_keyword_extraction_services tool
func (s *JSONRPCServer) callGetKeywordExtractionServices() (interface{}, error) {
	services, err := s.bridge.GetKeywordExtractionServices()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting keyword extraction services: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatServices(services, "Keyword Extraction"),
			},
		},
	}, nil
}

// callGetKeywordScanningServices implements the get_keyword_scanning_services tool
func (s *JSONRPCServer) callGetKeywordScanningServices() (interface{}, error) {
	services, err := s.bridge.GetKeywordScanningServices()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting keyword scanning services: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatServices(services, "Keyword Scanning"),
			},
		},
	}, nil
}

// callGetProxyManagementServices implements the get_proxy_management_services tool
func (s *JSONRPCServer) callGetProxyManagementServices() (interface{}, error) {
	services, err := s.bridge.GetProxyManagementServices()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting proxy management services: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatServices(services, "Proxy Management"),
			},
		},
	}, nil
}

// callGetKeywordSetAPISpecs implements the get_keyword_set_api_specs tool
func (s *JSONRPCServer) callGetKeywordSetAPISpecs() (interface{}, error) {
	specs, err := s.bridge.GetKeywordSetAPISpecs()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting keyword set API specs: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatAPISpecs(specs, "Keyword Sets API"),
			},
		},
	}, nil
}

// callGetProxyPoolAPISpecs implements the get_proxy_pool_api_specs tool
func (s *JSONRPCServer) callGetProxyPoolAPISpecs() (interface{}, error) {
	specs, err := s.bridge.GetProxyPoolAPISpecs()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting proxy pool API specs: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatAPISpecs(specs, "Proxy Pools API"),
			},
		},
	}, nil
}

// callGetDatabaseToolingAnalysis implements the get_database_tooling_analysis tool
func (s *JSONRPCServer) callGetDatabaseToolingAnalysis() (interface{}, error) {
	tools, err := s.bridge.GetDatabaseToolingAnalysis()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting database tooling analysis: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatAdvancedTools(tools),
			},
		},
	}, nil
}

// callGetBusinessDomainRoutes implements the get_business_domain_routes tool
func (s *JSONRPCServer) callGetBusinessDomainRoutes() (interface{}, error) {
	routes, err := s.bridge.GetBusinessDomainRoutes()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting business domain routes: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatBusinessDomainRoutes(routes),
			},
		},
	}, nil
}

// callGetEnhancedDependencies implements the get_enhanced_dependencies tool
func (s *JSONRPCServer) callGetEnhancedDependencies() (interface{}, error) {
	deps, err := s.bridge.GetEnhancedDependencies()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting enhanced dependencies: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatEnhancedDependencies(deps),
			},
		},
	}, nil
}

// callGetEnhancedSecurityAnalysis implements the get_enhanced_security_analysis tool
func (s *JSONRPCServer) callGetEnhancedSecurityAnalysis() (interface{}, error) {
	analysis, err := s.bridge.GetEnhancedSecurityAnalysis()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting enhanced security analysis: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatEnhancedSecurityAnalysis(analysis),
			},
		},
	}, nil
}

// callGetEnhancedAPISchema implements the get_enhanced_api_schema tool
func (s *JSONRPCServer) callGetEnhancedAPISchema() (interface{}, error) {
	schema, err := s.bridge.GetEnhancedAPISchema()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting enhanced API schema: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatEnhancedAPISchema(schema),
			},
		},
	}, nil
}

// callGetBusinessDomainMiddleware implements the get_business_domain_middleware tool
func (s *JSONRPCServer) callGetBusinessDomainMiddleware() (interface{}, error) {
	middleware, err := s.bridge.GetBusinessDomainMiddleware()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting business domain middleware: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatBusinessDomainMiddleware(middleware),
			},
		},
	}, nil
}

// callGetInternalServiceDependencies implements the get_internal_service_dependencies tool
func (s *JSONRPCServer) callGetInternalServiceDependencies() (interface{}, error) {
	deps, err := s.bridge.GetInternalServiceDependencies()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting internal service dependencies: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatInternalServiceDependencies(deps),
			},
		},
	}, nil
}

// callGetBusinessDomainCrossDependencies implements the get_business_domain_cross_dependencies tool
func (s *JSONRPCServer) callGetBusinessDomainCrossDependencies() (interface{}, error) {
	deps, err := s.bridge.GetBusinessDomainCrossDependencies()
	if err != nil {
		return map[string]interface{}{
			"content": []map[string]interface{}{
				{
					"type": "text",
					"text": "Error getting business domain cross dependencies: " + err.Error(),
				},
			},
		}, nil
	}

	return map[string]interface{}{
		"content": []map[string]interface{}{
			{
				"type": "text",
				"text": formatBusinessDomainCrossDependencies(deps),
			},
		},
	}, nil
}