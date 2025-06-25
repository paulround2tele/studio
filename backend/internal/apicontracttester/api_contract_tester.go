package apicontracttester

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	legacyrouter "github.com/getkin/kin-openapi/routers/legacy"
)

// APIContractTester tests API endpoints against an OpenAPI specification
// APIContractTester validates API endpoints against an OpenAPI specification
type APIContractTester struct {
	BaseURL string
	client  *http.Client
	spec    *openapi3.T
	router  routers.Router
}

// TestResult represents the result of a single API test
type TestResult struct {
	Endpoint     string
	Method       string
	StatusCode   int
	Expected     int
	Error        string
	ResponseTime time.Duration
	Success      bool
}

// TestResults contains all test results
type TestResults struct {
	Success             bool
	TotalTests          int
	PassedTests         int
	FailedTests         int
	Results             []TestResult
	SpecErrors          []string
	AverageResponseTime time.Duration
}

// NewAPIContractTester creates a new APIContractTester
func NewAPIContractTester(baseURL string) *APIContractTester {
	return &APIContractTester{
		BaseURL: baseURL,
		client: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// loadSpec loads the OpenAPI specification and initializes the router
func (t *APIContractTester) loadSpec() error {
	loader := openapi3.NewLoader()
	doc, err := loader.LoadFromFile("backend/docs/openapi.yaml")
	if err != nil {
		return err
	}
	doc.Servers = openapi3.Servers{{URL: t.BaseURL}}
	if err := doc.Validate(context.Background()); err != nil {
		return err
	}
	router, err := legacyrouter.NewRouter(doc)
	if err != nil {
		return err
	}
	t.spec = doc
	t.router = router
	return nil
}

func exampleFromSchema(s *openapi3.Schema) interface{} {
	if s == nil {
		return nil
	}
	if s.Example != nil {
		return s.Example
	}
	if len(s.Enum) > 0 {
		return s.Enum[0]
	}
	switch {
	case s.Type != nil && s.Type.Is("string"):
		if s.Format == "uuid" {
			return "123e4567-e89b-12d3-a456-426614174000"
		}
		return "string"
	case s.Type != nil && (s.Type.Is("integer") || s.Type.Is("number")):
		return 1
	case s.Type != nil && s.Type.Is("boolean"):
		return true
	case s.Type != nil && s.Type.Is("array"):
		if s.Items != nil {
			return []interface{}{exampleFromSchema(s.Items.Value)}
		}
		return []interface{}{}
	case s.Type != nil && s.Type.Is("object"):
		obj := make(map[string]interface{})
		for name, prop := range s.Properties {
			obj[name] = exampleFromSchema(prop.Value)
		}
		return obj
	default:
		return nil
	}
}

func (t *APIContractTester) buildRequest(path string, method string, op *openapi3.Operation, pathItem *openapi3.PathItem) (*http.Request, error) {
	fullPath := path
	params := append(pathItem.Parameters, op.Parameters...)
	for _, p := range params {
		if p.Value == nil || p.Value.In != openapi3.ParameterInPath {
			continue
		}
		val := exampleFromSchema(p.Value.Schema.Value)
		if val == nil {
			val = "test"
		}
		fullPath = strings.ReplaceAll(fullPath, "{"+p.Value.Name+"}", fmt.Sprint(val))
	}

	var body io.Reader
	if op.RequestBody != nil {
		for ct, mt := range op.RequestBody.Value.Content {
			if strings.Contains(ct, "json") {
				var v interface{}
				if mt.Example != nil {
					v = mt.Example
				} else if mt.Schema != nil {
					v = exampleFromSchema(mt.Schema.Value)
				}
				if v != nil {
					b, _ := json.Marshal(v)
					body = bytes.NewReader(b)
				}
				break
			}
		}
	}

	req, err := http.NewRequest(strings.ToUpper(method), t.BaseURL+fullPath, body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	return req, nil
}

// RunTests runs all API contract tests by iterating through the OpenAPI spec
func (t *APIContractTester) RunTests() (*TestResults, error) {
	if err := t.loadSpec(); err != nil {
		return nil, err
	}

	results := &TestResults{
		Success:    true,
		TotalTests: 0,
		Results:    []TestResult{},
		SpecErrors: []string{},
	}

	ctx := context.Background()
	totalResponseTime := time.Duration(0)

	for path, pathItem := range t.spec.Paths.Map() {
		for method, op := range pathItem.Operations() {
			tr := TestResult{
				Endpoint: path,
				Method:   strings.ToUpper(method),
				Success:  true,
				Expected: 200,
			}

			req, err := t.buildRequest(path, method, op, pathItem)
			if err != nil {
				tr.Error = fmt.Sprintf("failed to build request: %v", err)
				tr.Success = false
				results.Success = false
				results.FailedTests++
				results.TotalTests++
				results.Results = append(results.Results, tr)
				continue
			}

			start := time.Now()
			resp, err := t.client.Do(req)
			tr.ResponseTime = time.Since(start)
			totalResponseTime += tr.ResponseTime
			if err != nil {
				tr.Error = fmt.Sprintf("request failed: %v", err)
				tr.Success = false
				results.Success = false
				results.FailedTests++
				results.TotalTests++
				results.Results = append(results.Results, tr)
				continue
			}
			bodyBytes, _ := io.ReadAll(resp.Body)
			resp.Body.Close()
			tr.StatusCode = resp.StatusCode

			route, params, err := t.router.FindRoute(req)
			if err != nil {
				results.SpecErrors = append(results.SpecErrors, fmt.Sprintf("%s %s: %v", method, path, err))
				tr.Success = false
			}

			input := &openapi3filter.ResponseValidationInput{
				RequestValidationInput: &openapi3filter.RequestValidationInput{
					Request:    req,
					PathParams: params,
					Route:      route,
				},
				Status: resp.StatusCode,
				Header: resp.Header,
				Body:   io.NopCloser(bytes.NewReader(bodyBytes)),
			}
			if err := openapi3filter.ValidateResponse(ctx, input); err != nil {
				tr.Error = err.Error()
				tr.Success = false
			}

			if tr.Success {
				results.PassedTests++
			} else {
				results.FailedTests++
				results.Success = false
			}
			results.TotalTests++
			results.Results = append(results.Results, tr)
		}
	}

	if results.TotalTests > 0 {
		results.AverageResponseTime = totalResponseTime / time.Duration(results.TotalTests)
	}
	return results, nil
}

// GenerateReport generates a report of the test results
func (t *APIContractTester) GenerateReport(results *TestResults) string {
	var report strings.Builder

	// Add header
	report.WriteString("# API Contract Test Report\n\n")
	report.WriteString(fmt.Sprintf("Generated: %s\n\n", time.Now().Format(time.RFC3339)))
	report.WriteString(fmt.Sprintf("Base URL: %s\n\n", t.BaseURL))

	// Add summary
	report.WriteString("## Summary\n\n")
	if results.Success {
		report.WriteString("✅ **All tests passed**\n\n")
	} else {
		report.WriteString("❌ **Some tests failed**\n\n")
	}
	report.WriteString(fmt.Sprintf("- Total Tests: %d\n", results.TotalTests))
	report.WriteString(fmt.Sprintf("- Passed Tests: %d\n", results.PassedTests))
	report.WriteString(fmt.Sprintf("- Failed Tests: %d\n", results.FailedTests))
	report.WriteString(fmt.Sprintf("- Average Response Time: %s\n\n", results.AverageResponseTime))

	// Add specification errors
	if len(results.SpecErrors) > 0 {
		report.WriteString("## Specification Errors\n\n")
		for _, err := range results.SpecErrors {
			report.WriteString(fmt.Sprintf("- %s\n", err))
		}
		report.WriteString("\n")
	}

	// Add test results
	report.WriteString("## Test Results\n\n")
	report.WriteString("| Endpoint | Method | Status Code | Expected | Response Time | Result |\n")
	report.WriteString("|----------|--------|-------------|----------|---------------|--------|\n")
	for _, result := range results.Results {
		status := "✅ Pass"
		if !result.Success {
			status = "❌ Fail"
		}
		report.WriteString(fmt.Sprintf("| %s | %s | %d | %d | %s | %s |\n",
			result.Endpoint,
			result.Method,
			result.StatusCode,
			result.Expected,
			result.ResponseTime,
			status,
		))
	}
	report.WriteString("\n")

	// Add failed tests details
	failedTests := []TestResult{}
	for _, result := range results.Results {
		if !result.Success {
			failedTests = append(failedTests, result)
		}
	}

	if len(failedTests) > 0 {
		report.WriteString("## Failed Tests Details\n\n")
		for i, result := range failedTests {
			report.WriteString(fmt.Sprintf("### %d. %s %s\n\n", i+1, result.Method, result.Endpoint))
			report.WriteString(fmt.Sprintf("- Status Code: %d (Expected: %d)\n", result.StatusCode, result.Expected))
			report.WriteString(fmt.Sprintf("- Response Time: %s\n", result.ResponseTime))
			report.WriteString(fmt.Sprintf("- Error: %s\n\n", result.Error))
		}
	}

	report.WriteString("## Note\n\n")
	report.WriteString("Responses were validated against the OpenAPI specification using kin-openapi.\n")

	return report.String()
}

// PrintSummary prints a summary of the test results to the console
func (t *APIContractTester) PrintSummary(results *TestResults) {
	fmt.Println("\nAPI Contract Test Summary:")
	fmt.Println("-------------------------")

	if results.Success {
		fmt.Println("✅ All tests passed")
	} else {
		fmt.Println("❌ Some tests failed")
	}

	fmt.Printf("Total Tests: %d\n", results.TotalTests)
	fmt.Printf("Passed Tests: %d\n", results.PassedTests)
	fmt.Printf("Failed Tests: %d\n", results.FailedTests)
	fmt.Printf("Average Response Time: %s\n", results.AverageResponseTime)

	if len(results.SpecErrors) > 0 {
		fmt.Println("\nSpecification Errors:")
		for _, err := range results.SpecErrors {
			fmt.Printf("- %s\n", err)
		}
	}

	if !results.Success {
		fmt.Println("\nFailed Tests:")
		for i, result := range results.Results {
			if !result.Success {
				fmt.Printf("%d. %s %s - %s\n", i+1, result.Method, result.Endpoint, result.Error)
			}
		}
	}

	fmt.Println("\nResponses validated against the OpenAPI specification.")
}
