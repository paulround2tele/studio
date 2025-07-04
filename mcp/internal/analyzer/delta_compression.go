package analyzer

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"fmt"
	"mcp/internal/models"
	"strings"
	"sync"
	"time"
)

// DeltaCompressor handles compression of UI state changes
type DeltaCompressor struct {
	previousStates map[string]*models.IncrementalState
	compressionPool sync.Pool
	mutex          sync.RWMutex
	maxStateHistory int
}

// NewDeltaCompressor creates a new delta compressor
func NewDeltaCompressor() *DeltaCompressor {
	return &DeltaCompressor{
		previousStates:  make(map[string]*models.IncrementalState),
		maxStateHistory: 10, // Keep last 10 states for each session
		compressionPool: sync.Pool{
			New: func() interface{} {
				return &bytes.Buffer{}
			},
		},
	}
}

// CompressDelta creates a compressed delta between previous and current state
func (dc *DeltaCompressor) CompressDelta(sessionID string, current *models.IncrementalState) (*models.CompressedDelta, error) {
	dc.mutex.Lock()
	defer dc.mutex.Unlock()

	previous := dc.previousStates[sessionID]
	
	// If no previous state, compress the full current state
	if previous == nil {
		return dc.compressFullState(current)
	}

	// Calculate deltas
	domDiff, err := dc.calculateDOMDiff(previous.DOMDeltas, current.DOMDeltas)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate DOM diff: %w", err)
	}

	imageDiff, err := dc.calculateImageDiff(previous.ScreenRegions, current.ScreenRegions)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate image diff: %w", err)
	}

	stateDiff, err := dc.calculateStateDiff(previous.ComponentState, current.ComponentState)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate state diff: %w", err)
	}

	// Compress each diff
	compressedDOM, err := dc.compressData(domDiff)
	if err != nil {
		return nil, fmt.Errorf("failed to compress DOM diff: %w", err)
	}

	compressedImages, err := dc.compressData(imageDiff)
	if err != nil {
		return nil, fmt.Errorf("failed to compress image diff: %w", err)
	}

	compressedState, err := dc.compressData(stateDiff)
	if err != nil {
		return nil, fmt.Errorf("failed to compress state diff: %w", err)
	}

	// Calculate compression metrics
	originalSize := len(domDiff) + len(imageDiff) + len(stateDiff)
	compressedSize := len(compressedDOM) + len(compressedImages) + len(compressedState)

	delta := &models.CompressedDelta{
		DOMDiff:          compressedDOM,
		ImageDiffs:       compressedImages,
		StateDiff:        compressedState,
		CompressionType:  "gzip",
		OriginalSize:     originalSize,
		CompressedSize:   compressedSize,
		CompressionRatio: float64(compressedSize) / float64(originalSize),
	}

	// Store current state as previous for next comparison
	dc.previousStates[sessionID] = current

	return delta, nil
}

// compressFullState compresses a complete state (used for first state or fallback)
func (dc *DeltaCompressor) compressFullState(state *models.IncrementalState) (*models.CompressedDelta, error) {
	// Serialize the full state
	fullData, err := json.Marshal(state)
	if err != nil {
		return nil, err
	}

	// Compress the full state
	compressed, err := dc.compressData(fullData)
	if err != nil {
		return nil, err
	}

	return &models.CompressedDelta{
		DOMDiff:          compressed,
		ImageDiffs:       []byte{},
		StateDiff:        []byte{},
		CompressionType:  "gzip",
		OriginalSize:     len(fullData),
		CompressedSize:   len(compressed),
		CompressionRatio: float64(len(compressed)) / float64(len(fullData)),
	}, nil
}

// calculateDOMDiff calculates the difference between DOM delta arrays
func (dc *DeltaCompressor) calculateDOMDiff(previous, current []models.DOMDelta) ([]byte, error) {
	// Create sets for efficient comparison
	prevSet := make(map[string]models.DOMDelta)
	for _, delta := range previous {
		key := dc.getDeltaKey(delta)
		prevSet[key] = delta
	}

	// Find new or modified deltas
	var diff []models.DOMDelta
	for _, delta := range current {
		key := dc.getDeltaKey(delta)
		if prevDelta, exists := prevSet[key]; !exists || !dc.deltasEqual(prevDelta, delta) {
			diff = append(diff, delta)
		}
	}

	// Only include meaningful changes to reduce token usage
	filteredDiff := dc.filterSignificantDOMChanges(diff)

	return json.Marshal(filteredDiff)
}

// calculateImageDiff calculates the difference between image regions
func (dc *DeltaCompressor) calculateImageDiff(previous, current []models.ScreenshotRegion) ([]byte, error) {
	// Create a map of previous regions by ID
	prevRegions := make(map[string]models.ScreenshotRegion)
	for _, region := range previous {
		prevRegions[region.RegionID] = region
	}

	// Find changed or new regions
	var changedRegions []models.ScreenshotRegion
	for _, region := range current {
		if prevRegion, exists := prevRegions[region.RegionID]; !exists || prevRegion.ChangeHash != region.ChangeHash {
			// For token reduction, only include essential metadata
			compactRegion := models.ScreenshotRegion{
				RegionID:    region.RegionID,
				BoundingBox: region.BoundingBox,
				ChangeHash:  region.ChangeHash,
				Encoding:    region.Encoding,
				// Only include image data if region is small enough
				ImageData: dc.conditionalImageData(region),
			}
			changedRegions = append(changedRegions, compactRegion)
		}
	}

	return json.Marshal(changedRegions)
}

// calculateStateDiff calculates the difference between component states
func (dc *DeltaCompressor) calculateStateDiff(previous, current map[string]interface{}) ([]byte, error) {
	diff := make(map[string]interface{})

	// Find new or changed values
	for key, currentValue := range current {
		if prevValue, exists := previous[key]; !exists || !dc.valuesEqual(prevValue, currentValue) {
			diff[key] = currentValue
		}
	}

	// Mark removed values
	for key := range previous {
		if _, exists := current[key]; !exists {
			diff[key] = nil // nil indicates removal
		}
	}

	return json.Marshal(diff)
}

// getDeltaKey creates a unique key for a DOM delta
func (dc *DeltaCompressor) getDeltaKey(delta models.DOMDelta) string {
	return fmt.Sprintf("%s:%s:%s", delta.OperationType, delta.TargetPath, delta.ElementID)
}

// deltasEqual checks if two DOM deltas are equivalent
func (dc *DeltaCompressor) deltasEqual(a, b models.DOMDelta) bool {
	return a.OperationType == b.OperationType &&
		a.TargetPath == b.TargetPath &&
		a.ElementID == b.ElementID &&
		dc.valuesEqual(a.NewValue, b.NewValue) &&
		a.TextContent == b.TextContent
}

// valuesEqual performs deep comparison of interface{} values
func (dc *DeltaCompressor) valuesEqual(a, b interface{}) bool {
	aJSON, _ := json.Marshal(a)
	bJSON, _ := json.Marshal(b)
	return bytes.Equal(aJSON, bJSON)
}

// filterSignificantDOMChanges removes low-priority changes to reduce token usage
func (dc *DeltaCompressor) filterSignificantDOMChanges(deltas []models.DOMDelta) []models.DOMDelta {
	var significant []models.DOMDelta

	for _, delta := range deltas {
		// Skip purely cosmetic changes for token efficiency
		if dc.isSignificantChange(delta) {
			// Create a compact version of the delta
			compactDelta := models.DOMDelta{
				OperationType: delta.OperationType,
				TargetPath:    dc.shortenCSSPath(delta.TargetPath),
				ElementID:     delta.ElementID,
				TextContent:   delta.TextContent,
				Timestamp:     delta.Timestamp,
			}

			// Only include essential attributes
			if len(delta.Attributes) > 0 {
				compactDelta.Attributes = dc.filterEssentialAttributes(delta.Attributes)
			}

			significant = append(significant, compactDelta)
		}
	}

	return significant
}

// isSignificantChange determines if a change is important for AI decision-making
func (dc *DeltaCompressor) isSignificantChange(delta models.DOMDelta) bool {
	path := strings.ToLower(delta.TargetPath)

	// Always include structural changes
	if delta.OperationType == models.DOMOpAdd || delta.OperationType == models.DOMOpRemove {
		return true
	}

	// Always include text content changes
	if delta.OperationType == models.DOMOpText && strings.TrimSpace(delta.TextContent) != "" {
		return true
	}

	// Include interactive element changes
	if strings.Contains(path, "button") || strings.Contains(path, "input") || 
	   strings.Contains(path, "select") || strings.Contains(path, "form") {
		return true
	}

	// Include navigation changes
	if strings.Contains(path, "nav") || strings.Contains(path, "menu") {
		return true
	}

	// Include error/status messages
	if strings.Contains(path, "error") || strings.Contains(path, "alert") || 
	   strings.Contains(path, "status") || strings.Contains(path, "message") {
		return true
	}

	// Skip pure style changes unless they affect visibility
	if delta.OperationType == models.DOMOpStyle {
		return dc.isVisibilityAffectingStyle(delta.Attributes)
	}

	return false
}

// shortenCSSPath creates a more compact CSS selector path
func (dc *DeltaCompressor) shortenCSSPath(path string) string {
	// Remove redundant parts and use shorter selectors
	path = strings.ReplaceAll(path, " > ", ">")
	
	// If there's an ID, prefer it over complex paths
	if strings.Contains(path, "#") {
		parts := strings.Split(path, " ")
		for _, part := range parts {
			if strings.HasPrefix(part, "#") {
				return part
			}
		}
	}

	// Simplify class selectors
	if len(path) > 50 {
		parts := strings.Split(path, ">")
		if len(parts) > 3 {
			// Keep only the last 3 parts for specificity
			path = strings.Join(parts[len(parts)-3:], ">")
		}
	}

	return path
}

// filterEssentialAttributes keeps only attributes important for AI decision-making
func (dc *DeltaCompressor) filterEssentialAttributes(attrs map[string]string) map[string]string {
	essential := make(map[string]string)
	
	// Essential attributes for AI agents
	essentialKeys := map[string]bool{
		"id":           true,
		"class":        true,
		"href":         true,
		"src":          true,
		"alt":          true,
		"title":        true,
		"value":        true,
		"placeholder":  true,
		"disabled":     true,
		"readonly":     true,
		"checked":      true,
		"selected":     true,
		"type":         true,
		"role":         true,
		"aria-label":   true,
		"aria-expanded": true,
		"data-testid":  true,
	}

	for key, value := range attrs {
		if essentialKeys[key] || strings.HasPrefix(key, "data-") || strings.HasPrefix(key, "aria-") {
			essential[key] = value
		}
	}

	return essential
}

// isVisibilityAffectingStyle checks if a style change affects element visibility
func (dc *DeltaCompressor) isVisibilityAffectingStyle(attrs map[string]string) bool {
	for key, value := range attrs {
		key = strings.ToLower(key)
		value = strings.ToLower(value)
		
		if key == "display" || key == "visibility" || key == "opacity" {
			return true
		}
		
		if key == "style" && (strings.Contains(value, "display") || 
		   strings.Contains(value, "visibility") || strings.Contains(value, "opacity")) {
			return true
		}
	}
	return false
}

// conditionalImageData includes image data only if it's small enough to be token-efficient
func (dc *DeltaCompressor) conditionalImageData(region models.ScreenshotRegion) []byte {
	// Only include image data for small regions to save tokens
	maxImageSize := 10 * 1024 // 10KB threshold
	
	if len(region.ImageData) <= maxImageSize {
		return region.ImageData
	}
	
	// For larger images, return empty data - they can be fetched separately if needed
	return []byte{}
}

// compressData compresses data using gzip
func (dc *DeltaCompressor) compressData(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return data, nil
	}

	buf := dc.compressionPool.Get().(*bytes.Buffer)
	defer func() {
		buf.Reset()
		dc.compressionPool.Put(buf)
	}()

	gzipWriter := gzip.NewWriter(buf)
	if _, err := gzipWriter.Write(data); err != nil {
		return nil, err
	}

	if err := gzipWriter.Close(); err != nil {
		return nil, err
	}

	compressed := make([]byte, buf.Len())
	copy(compressed, buf.Bytes())
	return compressed, nil
}

// DecompressDelta decompresses a delta and reconstructs the state
func (dc *DeltaCompressor) DecompressDelta(delta *models.CompressedDelta) (*models.IncrementalState, error) {
	// Decompress DOM diff
	domData, err := dc.decompressData(delta.DOMDiff)
	if err != nil {
		return nil, fmt.Errorf("failed to decompress DOM diff: %w", err)
	}

	var domDeltas []models.DOMDelta
	if len(domData) > 0 {
		if err := json.Unmarshal(domData, &domDeltas); err != nil {
			return nil, fmt.Errorf("failed to unmarshal DOM deltas: %w", err)
		}
	}

	// Decompress image diff
	imageData, err := dc.decompressData(delta.ImageDiffs)
	if err != nil {
		return nil, fmt.Errorf("failed to decompress image diff: %w", err)
	}

	var screenRegions []models.ScreenshotRegion
	if len(imageData) > 0 {
		if err := json.Unmarshal(imageData, &screenRegions); err != nil {
			return nil, fmt.Errorf("failed to unmarshal screen regions: %w", err)
		}
	}

	// Decompress state diff
	stateData, err := dc.decompressData(delta.StateDiff)
	if err != nil {
		return nil, fmt.Errorf("failed to decompress state diff: %w", err)
	}

	var componentState map[string]interface{}
	if len(stateData) > 0 {
		if err := json.Unmarshal(stateData, &componentState); err != nil {
			return nil, fmt.Errorf("failed to unmarshal component state: %w", err)
		}
	}

	return &models.IncrementalState{
		DOMDeltas:      domDeltas,
		ScreenRegions:  screenRegions,
		ComponentState: componentState,
	}, nil
}

// decompressData decompresses gzip-compressed data
func (dc *DeltaCompressor) decompressData(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return data, nil
	}

	reader, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	buf := dc.compressionPool.Get().(*bytes.Buffer)
	defer func() {
		buf.Reset()
		dc.compressionPool.Put(buf)
	}()

	if _, err := buf.ReadFrom(reader); err != nil {
		return nil, err
	}

	result := make([]byte, buf.Len())
	copy(result, buf.Bytes())
	return result, nil
}

// GetCompressionStats returns compression statistics
func (dc *DeltaCompressor) GetCompressionStats(sessionID string) map[string]interface{} {
	dc.mutex.RLock()
	defer dc.mutex.RUnlock()

	stats := map[string]interface{}{
		"session_id":         sessionID,
		"has_previous_state": dc.previousStates[sessionID] != nil,
		"total_sessions":     len(dc.previousStates),
	}

	if state := dc.previousStates[sessionID]; state != nil {
		stats["last_update"] = state.Timestamp
		stats["dom_deltas"] = len(state.DOMDeltas)
		stats["screen_regions"] = len(state.ScreenRegions)
		stats["component_states"] = len(state.ComponentState)
	}

	return stats
}

// CleanupOldStates removes old state history to prevent memory leaks
func (dc *DeltaCompressor) CleanupOldStates() int {
	dc.mutex.Lock()
	defer dc.mutex.Unlock()

	// Simple cleanup: remove states older than 1 hour
	cutoff := time.Now().Add(-time.Hour)
	cleaned := 0

	for sessionID, state := range dc.previousStates {
		if state.Timestamp.Before(cutoff) {
			delete(dc.previousStates, sessionID)
			cleaned++
		}
	}

	return cleaned
}

// EstimateTokenReduction calculates the estimated token reduction compared to full capture
func (dc *DeltaCompressor) EstimateTokenReduction(delta *models.CompressedDelta, estimatedFullSize int) float64 {
	if estimatedFullSize == 0 {
		return 0.0
	}

	reduction := 1.0 - (float64(delta.CompressedSize) / float64(estimatedFullSize))
	if reduction < 0 {
		reduction = 0.0
	}

	return reduction
}