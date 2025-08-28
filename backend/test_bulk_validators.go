//go:build tools

package main

import (
	"context"
	"fmt"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/config"
	"github.com/fntelecomllc/studio/backend/internal/dnsvalidator"
	"github.com/fntelecomllc/studio/backend/internal/httpvalidator"
	"github.com/fntelecomllc/studio/backend/internal/models"
)

func main() {
	fmt.Println("Testing bulk validation implementations...")

	// Test DNS Validator Bulk Processing with timeout
	fmt.Println("\n=== Testing DNS Validator Bulk Processing ===")
	done := make(chan bool, 1)
	go func() {
		testDNSValidatorBulk()
		done <- true
	}()

	select {
	case <-done:
		fmt.Println("DNS test completed")
	case <-time.After(30 * time.Second):
		fmt.Println("DNS test TIMED OUT - hanging detected")
		return
	}

	// Test HTTP Validator Bulk Processing with timeout
	fmt.Println("\n=== Testing HTTP Validator Bulk Processing ===")
	done2 := make(chan bool, 1)
	go func() {
		testHTTPValidatorBulk()
		done2 <- true
	}()

	select {
	case <-done2:
		fmt.Println("HTTP test completed")
	case <-time.After(30 * time.Second):
		fmt.Println("HTTP test TIMED OUT - hanging detected")
		return
	}

	fmt.Println("\n=== All tests completed successfully! ===")
}

func testDNSValidatorBulk() {
	// Create DNS validator with default config
	dnsConfig := config.DNSValidatorConfig{
		Resolvers:                  []string{"8.8.8.8:53", "1.1.1.1:53"},
		UseSystemResolvers:         false,
		QueryTimeout:               5 * time.Second,
		MaxDomainsPerRequest:       100,
		ResolverStrategy:           "random_rotation",
		MaxConcurrentGoroutines:    10,
		ConcurrentQueriesPerDomain: 2,
		QueryDelayMin:              0 * time.Millisecond,
		QueryDelayMax:              50 * time.Millisecond,
	}

	validator := dnsvalidator.New(dnsConfig)

	// Test domains
	testDomains := []string{
		"google.com",
		"github.com",
		"stackoverflow.com",
		"invalid-domain-that-should-not-exist-12345.com",
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	fmt.Printf("Validating %d domains in bulk with batch size 2...\n", len(testDomains))

	start := time.Now()
	results := validator.ValidateDomainsBulk(testDomains, ctx, 2)
	duration := time.Since(start)

	fmt.Printf("Bulk validation completed in %v\n", duration)
	fmt.Printf("Results:\n")

	for i, result := range results {
		fmt.Printf("  %d. Domain: %s, Status: %s", i+1, result.Domain, result.Status)
		if result.Error != "" {
			fmt.Printf(", Error: %s", result.Error)
		}
		if len(result.IPs) > 0 {
			fmt.Printf(", IPs: %v", result.IPs)
		}
		fmt.Printf(", Duration: %dms\n", result.DurationMs)
	}

	// Test empty input
	emptyResults := validator.ValidateDomainsBulk([]string{}, ctx, 10)
	fmt.Printf("Empty domain list test: got %d results (expected 0)\n", len(emptyResults))

	// Test context cancellation
	cancelCtx, cancelFunc := context.WithCancel(context.Background())
	cancelFunc() // Cancel immediately

	cancelResults := validator.ValidateDomainsBulk(testDomains, cancelCtx, 2)
	fmt.Printf("Cancelled context test: got %d results with cancellation errors\n", len(cancelResults))
}

func testHTTPValidatorBulk() {
	// Create HTTP validator with default config
	appConfig := &config.AppConfig{
		HTTPValidator: config.HTTPValidatorConfig{
			DefaultUserAgent:        "TestAgent/1.0",
			RequestTimeout:          10 * time.Second,
			MaxRedirects:            3,
			FollowRedirects:         true,
			AllowInsecureTLS:        true,
			MaxConcurrentGoroutines: 15,
			MaxBodyReadBytes:        1024 * 1024, // 1MB
		},
	}

	validator := httpvalidator.NewHTTPValidator(appConfig)

	// Test domains (convert to GeneratedDomain format)
	testDomains := []*models.GeneratedDomain{
		{DomainName: "httpbin.org"},
		{DomainName: "google.com"},
		{DomainName: "github.com"},
		{DomainName: "invalid-domain-that-should-not-exist-12345.com"},
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	fmt.Printf("Validating %d domains in bulk with batch size 2...\n", len(testDomains))

	start := time.Now()
	results := validator.ValidateDomainsBulk(ctx, testDomains, 2, nil, nil)
	duration := time.Since(start)

	fmt.Printf("Bulk validation completed in %v\n", duration)
	fmt.Printf("Results:\n")

	for i, result := range results {
		fmt.Printf("  %d. Domain: %s, Status: %s", i+1, result.Domain, result.Status)
		if result.Error != "" {
			fmt.Printf(", Error: %s", result.Error)
		}
		if result.StatusCode > 0 {
			fmt.Printf(", StatusCode: %d", result.StatusCode)
		}
		if result.FinalURL != "" && result.FinalURL != result.AttemptedURL {
			fmt.Printf(", FinalURL: %s", result.FinalURL)
		}
		fmt.Printf(", Success: %t, Duration: %dms\n", result.IsSuccess, result.DurationMs)
	}

	// Test empty input
	emptyResults := validator.ValidateDomainsBulk(ctx, []*models.GeneratedDomain{}, 10, nil, nil)
	fmt.Printf("Empty domain list test: got %d results (expected 0)\n", len(emptyResults))

	// Test context cancellation
	cancelCtx, cancelFunc := context.WithCancel(context.Background())
	cancelFunc() // Cancel immediately

	cancelResults := validator.ValidateDomainsBulk(cancelCtx, testDomains, 2, nil, nil)
	fmt.Printf("Cancelled context test: got %d results with cancellation errors\n", len(cancelResults))
}
