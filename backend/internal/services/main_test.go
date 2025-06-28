package services_test

import (
        "fmt"
        "os"
        "testing"

        "github.com/fntelecomllc/studio/backend/internal/services"
)

// ServiceTestSuite is an alias for the actual CampaignServiceTestSuite defined in the services package.
// This allows test files in the services_test package to embed ServiceTestSuite unqualified.
// It includes the fields from services.CampaignServiceTestSuite like DB, CampaignStore, etc.
// and embeds suite.Suite for testify integration.
type ServiceTestSuite = services.CampaignServiceTestSuite

// TestMain can be used for package-level setup/teardown if needed in the future.
// For now, its main purpose is to ensure this file is part of the test compilation unit
// and makes the ServiceTestSuite alias available.
func TestMain(m *testing.M) {
        if os.Getenv("TEST_POSTGRES_DSN") == "" {
                fmt.Println("Skipping services tests; TEST_POSTGRES_DSN not set")
                os.Exit(0)
        }
        m.Run()
}
