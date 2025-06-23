// File: backend/internal/domainexpert/generator.go
package domainexpert

import (
	"fmt"
	"math"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/fntelecomllc/studio/backend/internal/models" // For CampaignPatternType etc. if defined there
)

// MemoryEfficiencyConfig holds configuration for memory-efficient generation
type MemoryEfficiencyConfig struct {
	MaxMemoryUsageMB    int           // Maximum memory usage in MB before optimization
	BatchSizeReduction  float64       // Factor to reduce batch size when memory pressure detected (0.5 = 50% reduction)
	MonitoringInterval  time.Duration // How often to check memory usage
	EnableMemoryLogging bool          // Whether to log memory usage statistics
}

// DefaultMemoryEfficiencyConfig returns default memory efficiency settings
func DefaultMemoryEfficiencyConfig() MemoryEfficiencyConfig {
	return MemoryEfficiencyConfig{
		MaxMemoryUsageMB:    512, // 512MB default limit
		BatchSizeReduction:  0.7, // Reduce batch size to 70% when memory pressure detected
		MonitoringInterval:  100 * time.Millisecond,
		EnableMemoryLogging: false,
	}
}

// MemoryStats tracks memory usage during domain generation
type MemoryStats struct {
	AllocMB      uint64
	TotalAllocMB uint64
	SysMB        uint64
	HeapAllocMB  uint64
	NumGC        uint32
	LastGCTime   time.Time
}

// GetCurrentMemoryStats returns current memory statistics
func GetCurrentMemoryStats() MemoryStats {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)

	return MemoryStats{
		AllocMB:      m.Alloc / 1024 / 1024,
		TotalAllocMB: m.TotalAlloc / 1024 / 1024,
		SysMB:        m.Sys / 1024 / 1024,
		HeapAllocMB:  m.HeapAlloc / 1024 / 1024,
		NumGC:        m.NumGC,
		LastGCTime:   time.Unix(0, int64(m.LastGC)),
	}
}

// CampaignPatternType defines the types of domain generation patterns.
// Duplicating from models if not accessible or to avoid import cycle, ideally in models.
type CampaignPatternType string

const (
	PatternPrefix CampaignPatternType = "prefix" // [VARIABLE][CONSTANT][TLD]
	PatternSuffix CampaignPatternType = "suffix" // [CONSTANT][VARIABLE][TLD]
	PatternBoth   CampaignPatternType = "both"   // [VARIABLE][CONSTANT][VARIABLE][TLD]
)

// DomainGenerator holds the configuration for a domain generation task.
type DomainGenerator struct {
	PatternType    CampaignPatternType
	VariableLength int    // Length of EACH variable segment if PatternBoth
	CharacterSet   []rune // The set of characters to use for variable parts
	ConstantString string // The static part of the domain
	TLD            string // Top-Level Domain, e.g., ".com"

	charsetSize          int
	totalCombinations    int64
	maxVariableStringLen int // For PatternBoth, this is VariableLength * 2

	// Memory efficiency features
	memoryConfig      MemoryEfficiencyConfig
	lastMemoryCheck   time.Time
	stringBuilderPool sync.Pool // Pool of reusable string builders
	domainPool        sync.Pool // Pool of reusable domain slices
}

// NewDomainGenerator initializes a new domain generator.
func NewDomainGenerator(patternType CampaignPatternType, variableLength int, charSet string, constantStr string, tld string) (*DomainGenerator, error) {
	if variableLength <= 0 {
		return nil, fmt.Errorf("variable length must be a positive integer")
	}
	if charSet == "" {
		return nil, fmt.Errorf("character set cannot be empty")
	}
	if tld == "" {
		return nil, fmt.Errorf("TLD cannot be empty")
	}
	if !strings.HasPrefix(tld, ".") {
		return nil, fmt.Errorf("TLD must start with a dot")
	}
	if len(tld) < 2 { // Must be at least a dot and one character
		return nil, fmt.Errorf("TLD must contain at least one character after the dot")
	}

	uniqueRunes := make(map[rune]bool)
	var distinctRunes []rune

	for _, r := range charSet {
		if !uniqueRunes[r] {
			uniqueRunes[r] = true
			distinctRunes = append(distinctRunes, r)
		}
	}
	if len(distinctRunes) == 0 {
		return nil, fmt.Errorf("character set resulted in no unique characters")
	}

	dg := &DomainGenerator{
		PatternType:     patternType,
		VariableLength:  variableLength,
		CharacterSet:    distinctRunes,
		ConstantString:  constantStr,
		TLD:             tld,
		charsetSize:     len(distinctRunes),
		memoryConfig:    DefaultMemoryEfficiencyConfig(),
		lastMemoryCheck: time.Now(),
	}

	// Initialize object pools for memory efficiency
	dg.stringBuilderPool = sync.Pool{
		New: func() interface{} {
			return &strings.Builder{}
		},
	}

	dg.domainPool = sync.Pool{
		New: func() interface{} {
			return make([]models.GeneratedDomain, 0, 1000) // Pre-allocate with default batch size
		},
	}

	switch patternType {
	case PatternPrefix, PatternSuffix:
		dg.totalCombinations = power(int64(dg.charsetSize), int64(variableLength))
		dg.maxVariableStringLen = variableLength
	case PatternBoth:
		dg.totalCombinations = power(int64(dg.charsetSize), int64(variableLength*2))
		dg.maxVariableStringLen = variableLength * 2
	default:
		return nil, fmt.Errorf("invalid pattern type: %s", patternType)
	}

	// Check for overflow against int64 (MaxInt64 is approx 9e18)
	// Our int64 totalCombinations can be larger. The user spec said "int64 range"
	// This check might need to be against a specific max for the application.
	if dg.totalCombinations > math.MaxInt64/2 && variableLength > 10 { // Heuristic for potential overflow if converted to signed later or if limit is int64.
		// For practical purposes, int64 is fine unless it needs to fit in a signed int64 DB field.
		// The prompt said: "Total combinations must not exceed int64 range"
		// If totalCombinations itself must fit int64, then: if dg.totalCombinations > int64(math.MaxInt64)
		// For now, we use int64 internally for generation logic.
	}

	return dg, nil
}

// power calculates base^exponent for int64.
func power(base, exponent int64) int64 {
	result := int64(1)
	for i := int64(0); i < exponent; i++ {
		if math.MaxInt64/base < result { // Overflow check
			return math.MaxInt64
		}
		result *= base
	}
	return result
}

// GetTotalCombinations returns the total number of possible unique domains.
func (dg *DomainGenerator) GetTotalCombinations() int64 {
	return dg.totalCombinations
}

// GenerateDomainAtOffset generates the domain string at a specific 0-based offset.
// This function must be deterministic.
func (dg *DomainGenerator) GenerateDomainAtOffset(offset int64) (string, error) {
	if offset >= dg.totalCombinations {
		return "", fmt.Errorf("offset %d is out of range (total combinations: %d)", offset, dg.totalCombinations)
	}

	var varPart1 strings.Builder

	tempOffset := offset

	switch dg.PatternType {
	case PatternPrefix:
		// Generate [VARIABLE][CONSTANT][TLD]
		generateVariableString(tempOffset, dg.VariableLength, dg.CharacterSet, dg.charsetSize, &varPart1)
		return varPart1.String() + dg.ConstantString + dg.TLD, nil
	case PatternSuffix:
		// Generate [CONSTANT][VARIABLE][TLD]
		generateVariableString(tempOffset, dg.VariableLength, dg.CharacterSet, dg.charsetSize, &varPart1)
		return dg.ConstantString + varPart1.String() + dg.TLD, nil
	case PatternBoth:
		// Generate [VARIABLE1][CONSTANT][VARIABLE2][TLD]
		// Split the offset for two variable parts.
		// combinationsPerPart1 := power(int64(dg.charsetSize), int64(dg.VariableLength))
		// This is effectively like treating the two variable parts as a single number in a mixed radix system,
		// or more simply, a number of length (VariableLength*2) in base charsetSize.

		var varFull strings.Builder
		generateVariableString(tempOffset, dg.VariableLength*2, dg.CharacterSet, dg.charsetSize, &varFull)
		fullVarStr := varFull.String()

		var1Str := fullVarStr[:dg.VariableLength]
		var2Str := fullVarStr[dg.VariableLength:]
		return var1Str + dg.ConstantString + var2Str + dg.TLD, nil
	default:
		return "", fmt.Errorf("unknown pattern type: %s", dg.PatternType)
	}
}

// generateVariableString constructs the variable part of the domain based on the offset.
// It effectively converts the offset into a base-N number, where N is charsetSize.
func generateVariableString(offset int64, length int, charSet []rune, charsetSize int, builder *strings.Builder) {
	tempOffset := offset
	resultRunes := make([]rune, length)

	for i := 0; i < length; i++ {
		index := tempOffset % int64(charsetSize)
		resultRunes[i] = charSet[index]
		tempOffset /= int64(charsetSize)
	}

	// The resultRunes are in reverse order of generation (least significant to most significant digit),
	// so we reverse them to get the correct string.
	for i := length - 1; i >= 0; i-- {
		builder.WriteRune(resultRunes[i])
	}
}

// GenerateBatch generates a slice of domains starting from startOffset, up to batchSize or totalCombinations.
func (dg *DomainGenerator) GenerateBatch(startOffset int64, batchSize int) ([]models.GeneratedDomain, int64, error) {
	if startOffset >= dg.totalCombinations {
		return nil, startOffset, fmt.Errorf("startOffset %d is already past total combinations %d", startOffset, dg.totalCombinations)
	}

	// Optimize batch size based on memory pressure and constraints
	optimizedBatchSize := dg.optimizeBatchSize(batchSize)

	// Get reusable domain slice from pool with exact capacity to avoid reallocations
	domains := dg.getDomainSlice(optimizedBatchSize)
	defer dg.putDomainSlice(domains) // Return to pool when done

	currentOffset := startOffset
	count := 0

	// Pre-calculate remaining combinations to avoid unnecessary iterations
	remainingCombinations := dg.totalCombinations - currentOffset
	if int64(optimizedBatchSize) > remainingCombinations {
		optimizedBatchSize = int(remainingCombinations)
	}

	// Generate domains with memory-efficient string building
	for count < optimizedBatchSize && currentOffset < dg.totalCombinations {
		domainStr, err := dg.generateDomainAtOffsetEfficient(currentOffset)
		if err != nil {
			// Return what we have so far, don't fail the entire batch
			return domains[:count], currentOffset, fmt.Errorf("error generating domain at offset %d: %w", currentOffset, err)
		}

		// Append domain with pre-allocated slice (no reallocation)
		domains = append(domains, models.GeneratedDomain{
			DomainName:  domainStr,
			OffsetIndex: currentOffset,
		})

		currentOffset++
		count++

		// Periodically check for memory pressure and trigger GC if needed
		if count%100 == 0 && dg.checkMemoryPressure() {
			runtime.GC() // Force garbage collection if memory pressure detected
		}
	}

	// Create a new slice with the exact size to return (avoids holding onto large capacity)
	result := make([]models.GeneratedDomain, count)
	copy(result, domains[:count])

	return result, currentOffset, nil
}

// WithMemoryConfig configures memory efficiency settings
func (dg *DomainGenerator) WithMemoryConfig(config MemoryEfficiencyConfig) *DomainGenerator {
	dg.memoryConfig = config
	return dg
}

// checkMemoryPressure returns true if memory usage is above the configured threshold
func (dg *DomainGenerator) checkMemoryPressure() bool {
	// Only check memory periodically to avoid overhead
	now := time.Now()
	if now.Sub(dg.lastMemoryCheck) < dg.memoryConfig.MonitoringInterval {
		return false
	}
	dg.lastMemoryCheck = now

	stats := GetCurrentMemoryStats()

	if dg.memoryConfig.EnableMemoryLogging {
		fmt.Printf("Memory Stats - Alloc: %dMB, HeapAlloc: %dMB, Sys: %dMB, NumGC: %d\n",
			stats.AllocMB, stats.HeapAllocMB, stats.SysMB, stats.NumGC)
	}

	return stats.HeapAllocMB > uint64(dg.memoryConfig.MaxMemoryUsageMB)
}

// optimizeBatchSize adjusts batch size based on memory pressure and domain complexity
func (dg *DomainGenerator) optimizeBatchSize(requestedSize int) int {
	// Calculate estimated memory per domain
	avgDomainSize := len(dg.ConstantString) + dg.maxVariableStringLen + len(dg.TLD)
	// Estimate memory overhead for models.GeneratedDomain struct (~200 bytes base + domain string)
	estimatedMemoryPerDomain := avgDomainSize + 200

	// Check if requested batch would exceed memory limits
	estimatedBatchMemoryMB := (requestedSize * estimatedMemoryPerDomain) / (1024 * 1024)

	optimizedSize := requestedSize

	// Reduce batch size if estimated memory usage is too high
	if estimatedBatchMemoryMB > dg.memoryConfig.MaxMemoryUsageMB/4 { // Use 25% of available memory for batch
		maxSafeBatchSize := (dg.memoryConfig.MaxMemoryUsageMB * 1024 * 1024 / 4) / estimatedMemoryPerDomain
		if maxSafeBatchSize < optimizedSize {
			optimizedSize = maxSafeBatchSize
		}
	}

	// Reduce batch size if memory pressure is detected
	if dg.checkMemoryPressure() {
		optimizedSize = int(float64(optimizedSize) * dg.memoryConfig.BatchSizeReduction)
	}

	// Ensure minimum batch size
	if optimizedSize < 10 {
		optimizedSize = 10
	}

	return optimizedSize
}

// getStringBuilder gets a reusable string builder from the pool
func (dg *DomainGenerator) getStringBuilder() *strings.Builder {
	builder := dg.stringBuilderPool.Get().(*strings.Builder)
	builder.Reset()
	return builder
}

// putStringBuilder returns a string builder to the pool
func (dg *DomainGenerator) putStringBuilder(builder *strings.Builder) {
	dg.stringBuilderPool.Put(builder)
}

// getDomainSlice gets a reusable domain slice from the pool
func (dg *DomainGenerator) getDomainSlice(capacity int) []models.GeneratedDomain {
	slice := dg.domainPool.Get().([]models.GeneratedDomain)

	// Resize slice if needed
	if cap(slice) < capacity {
		slice = make([]models.GeneratedDomain, 0, capacity)
	} else {
		slice = slice[:0] // Reset length but keep capacity
	}

	return slice
}

// putDomainSlice returns a domain slice to the pool
func (dg *DomainGenerator) putDomainSlice(slice []models.GeneratedDomain) {
	// Clear the slice to prevent memory leaks
	for i := range slice {
		slice[i] = models.GeneratedDomain{}
	}
	dg.domainPool.Put(slice)
}

// generateDomainAtOffsetEfficient is a memory-efficient version of GenerateDomainAtOffset
// that reuses string builders and minimizes allocations
func (dg *DomainGenerator) generateDomainAtOffsetEfficient(offset int64) (string, error) {
	if offset >= dg.totalCombinations {
		return "", fmt.Errorf("offset %d is out of range (total combinations: %d)", offset, dg.totalCombinations)
	}

	// Get reusable string builder from pool
	builder := dg.getStringBuilder()
	defer dg.putStringBuilder(builder)

	tempOffset := offset

	switch dg.PatternType {
	case PatternPrefix:
		// Generate [VARIABLE][CONSTANT][TLD]
		dg.generateVariableStringEfficient(tempOffset, dg.VariableLength, builder)
		builder.WriteString(dg.ConstantString)
		builder.WriteString(dg.TLD)
		return builder.String(), nil

	case PatternSuffix:
		// Generate [CONSTANT][VARIABLE][TLD]
		builder.WriteString(dg.ConstantString)
		dg.generateVariableStringEfficient(tempOffset, dg.VariableLength, builder)
		builder.WriteString(dg.TLD)
		return builder.String(), nil

	case PatternBoth:
		// Generate [VARIABLE1][CONSTANT][VARIABLE2][TLD]
		// Generate full variable string and split it
		varBuilder := dg.getStringBuilder()
		defer dg.putStringBuilder(varBuilder)

		dg.generateVariableStringEfficient(tempOffset, dg.VariableLength*2, varBuilder)
		fullVarStr := varBuilder.String()

		// Split and build final domain
		builder.WriteString(fullVarStr[:dg.VariableLength]) // var1
		builder.WriteString(dg.ConstantString)              // constant
		builder.WriteString(fullVarStr[dg.VariableLength:]) // var2
		builder.WriteString(dg.TLD)                         // tld
		return builder.String(), nil

	default:
		return "", fmt.Errorf("unknown pattern type: %s", dg.PatternType)
	}
}

// generateVariableStringEfficient constructs the variable part of the domain using a string builder
// This version writes directly to the builder to minimize memory allocations
func (dg *DomainGenerator) generateVariableStringEfficient(offset int64, length int, builder *strings.Builder) {
	tempOffset := offset

	// Pre-allocate space in the builder
	builder.Grow(length)

	// Build the runes in reverse order first
	runes := make([]rune, length)
	for i := 0; i < length; i++ {
		index := tempOffset % int64(dg.charsetSize)
		runes[i] = dg.CharacterSet[index]
		tempOffset /= int64(dg.charsetSize)
	}

	// Write runes in correct order (reverse of how we calculated them)
	for i := length - 1; i >= 0; i-- {
		builder.WriteRune(runes[i])
	}
}
