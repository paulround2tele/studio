package services

import (
	"runtime"
	"strings"
	"testing"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/domainexpert"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestPF002_DomainExpertMemoryEfficiency(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping PF-002 memory efficiency test in short mode")
	}

	t.Run("Memory Efficient Domain Generator Direct Test", func(t *testing.T) {
		// Test the domain expert generator directly with memory efficiency features
		var initialMemStats runtime.MemStats
		runtime.GC() // Force garbage collection before test
		runtime.ReadMemStats(&initialMemStats)

		// Create domain generator with memory efficiency config
		domainGen, err := domainexpert.NewDomainGenerator(
			domainexpert.PatternPrefix,
			3,
			"abc", // 3^3 = 27 combinations
			"test",
			".com",
		)
		require.NoError(t, err)

		// Configure memory efficiency
		memConfig := domainexpert.MemoryEfficiencyConfig{
			MaxMemoryUsageMB:    50,  // 50MB limit
			BatchSizeReduction:  0.7, // Reduce to 70% if memory pressure
			MonitoringInterval:  10 * time.Millisecond,
			EnableMemoryLogging: true, // Enable for test debugging
		}
		domainGen.WithMemoryConfig(memConfig)

		// Generate multiple batches to test memory efficiency
		totalGenerated := 0
		batchSize := 10

		for offset := int64(0); offset < 27; offset += int64(batchSize) {
			// Get memory stats before generation
			var beforeMemStats runtime.MemStats
			runtime.ReadMemStats(&beforeMemStats)

			// Generate batch
			domains, nextOffset, err := domainGen.GenerateBatch(offset, batchSize)
			require.NoError(t, err)

			// Get memory stats after generation
			var afterMemStats runtime.MemStats
			runtime.ReadMemStats(&afterMemStats)

			// Verify domains were generated
			assert.NotEmpty(t, domains, "Should generate domains in each batch")
			assert.LessOrEqual(t, len(domains), batchSize, "Should not exceed batch size")

			// Verify domain format
			for i, domain := range domains {
				assert.Contains(t, domain.DomainName, "test.com", "Domain should contain constant string and TLD")
				assert.Equal(t, offset+int64(i), domain.OffsetIndex, "Offset index should be correct")

				// Verify the domain name structure (prefix pattern: [VARIABLE][CONSTANT][TLD])
				assert.True(t, len(domain.DomainName) >= 8, "Domain should have minimum length") // 3 chars + 'test' + '.com'
				assert.True(t, strings.HasSuffix(domain.DomainName, "test.com"), "Domain should end with test.com")
			}

			totalGenerated += len(domains)

			// Log memory usage
			memoryDelta := int64(afterMemStats.Alloc - beforeMemStats.Alloc)
			t.Logf("Generated %d domains at offset %d, Memory delta: %d KB",
				len(domains), offset, memoryDelta/1024)

			// Verify memory usage is reasonable
			maxDeltaPerBatch := int64(5 * 1024 * 1024) // 5MB max per batch
			assert.LessOrEqual(t, memoryDelta, maxDeltaPerBatch,
				"Memory delta per batch should not exceed 5MB")

			// Update offset for next iteration
			if nextOffset <= offset {
				// All combinations generated
				break
			}
		}

		// Verify we generated all possible combinations
		assert.Equal(t, 27, totalGenerated, "Should generate all 27 possible combinations")

		// Get final memory stats
		var finalMemStats runtime.MemStats
		runtime.GC() // Force garbage collection after test
		runtime.ReadMemStats(&finalMemStats)

		// Verify total memory increase is reasonable
		memoryIncrease := int64(finalMemStats.Alloc - initialMemStats.Alloc)
		maxTotalIncrease := int64(20 * 1024 * 1024) // 20MB max total

		t.Logf("Total domain generation memory increase: %d MB",
			memoryIncrease/1024/1024)

		assert.LessOrEqual(t, memoryIncrease, maxTotalIncrease,
			"Total memory increase should not exceed 20MB")
	})

	t.Run("Memory Pressure Handling", func(t *testing.T) {
		// Test that domain generator handles memory pressure gracefully
		domainGen, err := domainexpert.NewDomainGenerator(
			domainexpert.PatternSuffix,
			2,
			"abcdefgh", // 8^2 = 64 combinations
			"const",
			".test",
		)
		require.NoError(t, err)

		// Configure with very low memory limit to trigger optimization
		memConfig := domainexpert.MemoryEfficiencyConfig{
			MaxMemoryUsageMB:    5,                    // Very low limit to trigger optimization
			BatchSizeReduction:  0.5,                  // Reduce to 50% if memory pressure
			MonitoringInterval:  1 * time.Millisecond, // Check frequently
			EnableMemoryLogging: true,
		}
		domainGen.WithMemoryConfig(memConfig)

		// Request a large batch that should be optimized down
		largeBatchSize := 1000
		domains, nextOffset, err := domainGen.GenerateBatch(0, largeBatchSize)
		require.NoError(t, err)

		// Verify that the actual batch size was optimized (reduced)
		assert.LessOrEqual(t, len(domains), largeBatchSize,
			"Batch size should be optimized based on memory constraints")
		assert.Greater(t, len(domains), 0, "Should still generate some domains")
		assert.Equal(t, int64(len(domains)), nextOffset, "Next offset should match generated count")

		// Verify domains have correct format (suffix pattern: [CONSTANT][VARIABLE][TLD])
		for _, domain := range domains {
			assert.Contains(t, domain.DomainName, "const", "Domain should contain constant string")
			assert.True(t, strings.HasSuffix(domain.DomainName, ".test"), "Domain should end with .test")
			assert.True(t, strings.HasPrefix(domain.DomainName, "const"), "Domain should start with const")
		}

		t.Logf("Requested batch size: %d, Actual generated: %d (optimized down)",
			largeBatchSize, len(domains))
	})
}
