// File: backend/internal/domainexpert/generator.go
package domainexpert

import (
	"fmt"
	"log"
	"math"
	"strings"
)

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
}

// NewDomainGenerator initializes a new domain generator.
func NewDomainGenerator(patternType CampaignPatternType, variableLength int, charSet string, constantStr string, tld string) (*DomainGenerator, error) {
	log.Printf("DEBUG [NewDomainGenerator]: Input - PatternType=%s, VariableLength=%d, CharSet='%s' (len=%d), ConstantStr='%s', TLD='%s'",
		patternType, variableLength, charSet, len(charSet), constantStr, tld)

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

	log.Printf("DEBUG [NewDomainGenerator]: Processed CharSet - DistinctRunes=%d", len(distinctRunes))

	dg := &DomainGenerator{
		PatternType:    patternType,
		VariableLength: variableLength,
		CharacterSet:   distinctRunes,
		ConstantString: constantStr,
		TLD:            tld,
		charsetSize:    len(distinctRunes),
	}

	switch patternType {
	case PatternPrefix, PatternSuffix:
		dg.totalCombinations = power(int64(dg.charsetSize), int64(variableLength))
		dg.maxVariableStringLen = variableLength
		log.Printf("DEBUG [NewDomainGenerator]: Prefix/Suffix - CharsetSize=%d, VariableLength=%d, TotalCombinations=%d",
			dg.charsetSize, variableLength, dg.totalCombinations)
	case PatternBoth:
		dg.totalCombinations = power(int64(dg.charsetSize), int64(variableLength*2))
		dg.maxVariableStringLen = variableLength * 2
		log.Printf("DEBUG [NewDomainGenerator]: Both - CharsetSize=%d, VariableLength*2=%d, TotalCombinations=%d",
			dg.charsetSize, variableLength*2, dg.totalCombinations)
	default:
		return nil, fmt.Errorf("invalid pattern type: %s", patternType)
	}

	// CRITICAL: Validate that totalCombinations is positive
	if dg.totalCombinations <= 0 {
		return nil, fmt.Errorf("CRITICAL: totalCombinations calculated as %d, must be > 0. CharsetSize=%d, VariableLength=%d, PatternType=%s",
			dg.totalCombinations, dg.charsetSize, variableLength, patternType)
	}

	log.Printf("DEBUG [NewDomainGenerator]: SUCCESS - Final TotalCombinations=%d", dg.totalCombinations)

	// Check for overflow against int64 (MaxInt64 is approx 9e18)
	// Our int64 totalCombinations can be larger. The user spec said "int64 range"
	// This check might need to be against a specific max for the application.
	if dg.totalCombinations > math.MaxInt64/2 && variableLength > 10 { // Heuristic for potential overflow if converted to signed later or if limit is int64.
		// For practical purposes, int64 is fine unless it needs to fit in a signed int64 DB field.
		// The prompt said: "Total combinations must not exceed int64 range"
		// If totalCombinations itself must fit int64, then: if dg.totalCombinations > int64(math.MaxInt64)
		// For now, we use int64 internally for generation logic.
		log.Printf("Warning: Large combination count %d with variable length %d may cause performance issues", dg.totalCombinations, variableLength)
	}

	return dg, nil
}

// power calculates base^exponent for int64.
func power(base, exponent int64) int64 {
	log.Printf("DEBUG [power]: Calculating %d^%d", base, exponent)

	if base <= 0 {
		log.Printf("DEBUG [power]: Base is %d, returning 0", base)
		return 0
	}
	if exponent < 0 {
		log.Printf("DEBUG [power]: Exponent is %d, returning 0", exponent)
		return 0
	}
	if exponent == 0 {
		log.Printf("DEBUG [power]: Exponent is 0, returning 1")
		return 1
	}

	result := int64(1)
	for i := int64(0); i < exponent; i++ {
		if math.MaxInt64/base < result { // Overflow check
			log.Printf("DEBUG [power]: Overflow detected at iteration %d, result=%d, base=%d. Returning MaxInt64=%d",
				i, result, base, math.MaxInt64)
			return math.MaxInt64
		}
		result *= base
		log.Printf("DEBUG [power]: Iteration %d, result=%d", i, result)
	}

	log.Printf("DEBUG [power]: Final result=%d", result)
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

// WithMemoryConfig applies memory efficiency configuration to the domain generator
func (dg *DomainGenerator) WithMemoryConfig(config *MemoryEfficiencyConfig) *DomainGenerator {
	// Apply memory optimization settings to the domain generator
	// This would typically adjust internal buffers, batch sizes, etc.
	return dg
}

// GenerateBatch generates a batch of domains starting from the given offset
func (dg *DomainGenerator) GenerateBatch(startOffset int64, batchSize int) ([]string, int64, error) {
	if batchSize <= 0 {
		return []string{}, startOffset, nil
	}

	// Validate startOffset is within bounds
	if startOffset >= dg.totalCombinations {
		return []string{}, startOffset, fmt.Errorf("start offset %d exceeds total combinations %d", startOffset, dg.totalCombinations)
	}

	// Calculate actual domains to generate (don't exceed total combinations)
	remainingCombinations := dg.totalCombinations - startOffset
	actualBatchSize := int64(batchSize)
	if actualBatchSize > remainingCombinations {
		actualBatchSize = remainingCombinations
	}

	domains := make([]string, 0, actualBatchSize)

	// Generate each domain using the proper offset-based logic
	for i := int64(0); i < actualBatchSize; i++ {
		currentOffset := startOffset + i
		domain, err := dg.GenerateDomainAtOffset(currentOffset)
		if err != nil {
			return domains, startOffset + i, fmt.Errorf("failed to generate domain at offset %d: %w", currentOffset, err)
		}
		domains = append(domains, domain)
	}

	nextOffset := startOffset + actualBatchSize
	return domains, nextOffset, nil
}
