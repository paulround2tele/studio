// File: backend/internal/domainexpert/config_hasher.go
package domainexpert

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json" // Was missing from original snippet, but json.Marshal is used
	"fmt"
	"sort"
	"strings"

	"github.com/fntelecomllc/studio/backend/internal/models" // Assuming NormalizedDomainGenerationParams is here
	"golang.org/x/exp/slog"                                  // Assuming this is your logging library
)

// GenerateDomainGenerationPhaseConfigHashInput is a subset of DomainGenerationCampaignParams used for hashing.
// It is effectively the same as models.NormalizedDomainGenerationParams but defined here for clarity of input.
type GenerateDomainGenerationPhaseConfigHashInput struct {
	PatternType          string
	PrefixVariableLength int
	SuffixVariableLength int
	CharacterSet         string
	ConstantString       string
	TLD                  string
}

// GenerateDomainGenerationPhaseConfigHashResult holds the generated hash and the normalized params used.
type GenerateDomainGenerationPhaseConfigHashResult struct {
	HashString       string
	NormalizedParams models.NormalizedDomainGenerationParams
}

// GenerateDomainGenerationPhaseConfigHash creates a stable hash for a given set of domain generation parameters.
// It normalizes the parameters (e.g., sorts CharacterSet) before hashing to ensure consistency.
// It returns the hex-encoded SHA256 hash string and the normalized parameters used for hashing.
func GenerateDomainGenerationPhaseConfigHash(params models.DomainGenerationCampaignParams) (*GenerateDomainGenerationPhaseConfigHashResult, error) {
	// Normalize CharacterSet: convert to lowercase and sort characters
	charSetValue := params.CharacterSet
	if charSetValue == "" {
		slog.Warn("GenerateDomainGenerationPhaseConfigHash: CharacterSet is empty, using empty string for hashing.")
	}
	charSet := strings.ToLower(charSetValue)
	chars := strings.Split(charSet, "")
	sort.Strings(chars)
	normalizedCharSet := strings.Join(chars, "")

	// Normalize TLD: convert to lowercase and remove leading/trailing dots if any, ensure single leading dot.
	normalizedTLD := strings.ToLower(strings.Trim(params.TLD, "."))
	if normalizedTLD != "" && !strings.HasPrefix(normalizedTLD, ".") {
		normalizedTLD = "." + normalizedTLD
	}

	prefixLen := 0
	if params.PrefixVariableLength.Valid {
		prefixLen = int(params.PrefixVariableLength.Int32)
	}
	suffixLen := 0
	if params.SuffixVariableLength.Valid {
		suffixLen = int(params.SuffixVariableLength.Int32)
	}
	if prefixLen == 0 && suffixLen == 0 {
		slog.Warn("GenerateDomainGenerationPhaseConfigHash: both prefix and suffix lengths are 0; hashing will treat as 0 values.")
	}

	var constStrValue string
	if params.ConstantString != nil {
		constStrValue = *params.ConstantString
	} else {
		slog.Warn("GenerateDomainGenerationPhaseConfigHash: params.ConstantString is nil, using empty string for hashing.")
	}

	normalizedParams := models.NormalizedDomainGenerationParams{
		PatternType:          strings.ToLower(params.PatternType),
		PrefixVariableLength: prefixLen,
		SuffixVariableLength: suffixLen,
		CharacterSet:         normalizedCharSet,
		ConstantString:       constStrValue,
		TLD:                  normalizedTLD,
	}

	// Marshal the normalized struct to JSON for hashing
	// Using JSON ensures a stable representation if new fields are added (though order isn't guaranteed by spec, it's often stable for structs)
	// For absolute stability, one might construct a canonical string representation manually as in previous versions.
	jsonData, err := json.Marshal(normalizedParams)
	if err != nil {
		slog.Error("Failed to marshal normalized params for hashing", "error", err, "params", normalizedParams)
		return nil, fmt.Errorf("failed to marshal normalized params for hashing: %w", err) // Added fmt.Errorf
	}

	hash := sha256.Sum256(jsonData)
	hashString := hex.EncodeToString(hash[:])

	return &GenerateDomainGenerationPhaseConfigHashResult{
		HashString:       hashString,
		NormalizedParams: normalizedParams,
	}, nil
}
