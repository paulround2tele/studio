package analyzer

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"mcp/internal/models"
	"sync"
	"time"
)

// RegionScreenshotManager handles selective screenshot capture and management
type RegionScreenshotManager struct {
	regionCache     map[string]*CachedRegion
	compressionPool sync.Pool
	mutex           sync.RWMutex
	maxCacheSize    int
	defaultQuality  int
}

// CachedRegion represents a cached screenshot region
type CachedRegion struct {
	ImageData     []byte
	Hash          string
	LastAccessed  time.Time
	AccessCount   int
	BoundingBox   models.Rectangle
	Format        string
	Size          int
}

// NewRegionScreenshotManager creates a new screenshot region manager
func NewRegionScreenshotManager() *RegionScreenshotManager {
	rsm := &RegionScreenshotManager{
		regionCache:    make(map[string]*CachedRegion),
		maxCacheSize:   50, // Maximum 50 cached regions
		defaultQuality: 80,
		compressionPool: sync.Pool{
			New: func() interface{} {
				return &bytes.Buffer{}
			},
		},
	}
	return rsm
}

// CaptureRegions captures screenshots for specified regions with intelligent caching
func (rsm *RegionScreenshotManager) CaptureRegions(regions []models.Rectangle, fullScreenshotPath string) ([]models.ScreenshotRegion, error) {
	if len(regions) == 0 {
		return nil, nil
	}

	// Load the full screenshot
	fullImage, err := rsm.loadImage(fullScreenshotPath)
	if err != nil {
		return nil, fmt.Errorf("failed to load full screenshot: %w", err)
	}

	results := make([]models.ScreenshotRegion, 0, len(regions))
	
	for i, region := range regions {
		regionID := rsm.generateRegionID(region)
		
		// Check cache first
		if cached := rsm.getCachedRegion(regionID); cached != nil {
			results = append(results, models.ScreenshotRegion{
				RegionID:     regionID,
				BoundingBox:  region,
				ImageData:    cached.ImageData,
				Encoding:     cached.Format,
				ChangeHash:   cached.Hash,
				Compression:  float64(cached.Size) / float64(len(cached.ImageData)),
				IsDiff:       false,
			})
			continue
		}

		// Extract region from full image
		regionImage, err := rsm.extractRegion(fullImage, region)
		if err != nil {
			return nil, fmt.Errorf("failed to extract region %d: %w", i, err)
		}

		// Compress region image
		compressed, format, err := rsm.compressImage(regionImage, rsm.defaultQuality)
		if err != nil {
			return nil, fmt.Errorf("failed to compress region %d: %w", i, err)
		}

		// Calculate hash for deduplication
		hash := rsm.calculateImageHash(compressed)

		// Cache the region
		rsm.cacheRegion(regionID, &CachedRegion{
			ImageData:    compressed,
			Hash:         hash,
			LastAccessed: time.Now(),
			AccessCount:  1,
			BoundingBox:  region,
			Format:       format,
			Size:         len(compressed),
		})

		results = append(results, models.ScreenshotRegion{
			RegionID:     regionID,
			BoundingBox:  region,
			ImageData:    compressed,
			Encoding:     format,
			ChangeHash:   hash,
			Compression:  float64(len(compressed)) / float64(rsm.estimateUncompressedSize(regionImage)),
			IsDiff:       false,
		})
	}

	return results, nil
}

// GenerateDiffRegions creates diff images between old and new regions
func (rsm *RegionScreenshotManager) GenerateDiffRegions(oldRegions, newRegions []models.ScreenshotRegion) ([]models.ScreenshotRegion, error) {
	if len(oldRegions) != len(newRegions) {
		return newRegions, nil // Fallback to full regions if counts don't match
	}

	diffRegions := make([]models.ScreenshotRegion, 0)

	for i, newRegion := range newRegions {
		if i >= len(oldRegions) {
			diffRegions = append(diffRegions, newRegion)
			continue
		}

		oldRegion := oldRegions[i]

		// Check if regions are the same
		if newRegion.ChangeHash == oldRegion.ChangeHash {
			continue // No change, skip this region
		}

		// Check if we can create a meaningful diff
		if rsm.shouldCreateDiff(oldRegion, newRegion) {
			diffImage, err := rsm.createImageDiff(oldRegion.ImageData, newRegion.ImageData)
			if err != nil {
				// Fallback to full region if diff fails
				diffRegions = append(diffRegions, newRegion)
				continue
			}

			// Compress diff image
			compressed, format, err := rsm.compressImageData(diffImage, rsm.defaultQuality)
			if err != nil {
				diffRegions = append(diffRegions, newRegion)
				continue
			}

			// Only use diff if it's smaller than the full region
			if len(compressed) < len(newRegion.ImageData) {
				diffRegion := models.ScreenshotRegion{
					RegionID:     newRegion.RegionID + "_diff",
					BoundingBox:  newRegion.BoundingBox,
					ImageData:    compressed,
					Encoding:     format,
					ChangeHash:   rsm.calculateImageHash(compressed),
					Compression:  float64(len(compressed)) / float64(len(newRegion.ImageData)),
					IsDiff:       true,
					BaseRegionID: oldRegion.RegionID,
				}
				diffRegions = append(diffRegions, diffRegion)
			} else {
				diffRegions = append(diffRegions, newRegion)
			}
		} else {
			diffRegions = append(diffRegions, newRegion)
		}
	}

	return diffRegions, nil
}

// loadImage loads an image from file path
func (rsm *RegionScreenshotManager) loadImage(path string) (image.Image, error) {
	// In a real implementation, this would load the image from the file system
	// For now, we'll return a placeholder implementation
	return nil, fmt.Errorf("image loading not implemented - would load from %s", path)
}

// extractRegion extracts a rectangular region from an image
func (rsm *RegionScreenshotManager) extractRegion(img image.Image, region models.Rectangle) (image.Image, error) {
	bounds := img.Bounds()
	
	// Validate region bounds
	x1 := int(region.X)
	y1 := int(region.Y)
	x2 := int(region.X + region.Width)
	y2 := int(region.Y + region.Height)
	
	if x1 < bounds.Min.X || y1 < bounds.Min.Y || x2 > bounds.Max.X || y2 > bounds.Max.Y {
		return nil, fmt.Errorf("region bounds exceed image bounds")
	}

	// Create a sub-image
	type SubImager interface {
		SubImage(r image.Rectangle) image.Image
	}

	if subImager, ok := img.(SubImager); ok {
		rect := image.Rect(x1, y1, x2, y2)
		return subImager.SubImage(rect), nil
	}

	return nil, fmt.Errorf("image does not support sub-image extraction")
}

// compressImage compresses an image with the specified quality
func (rsm *RegionScreenshotManager) compressImage(img image.Image, quality int) ([]byte, string, error) {
	if img == nil {
		return nil, "", fmt.Errorf("image is nil")
	}

	buf := rsm.compressionPool.Get().(*bytes.Buffer)
	defer func() {
		buf.Reset()
		rsm.compressionPool.Put(buf)
	}()

	// Try JPEG first for good compression with quality control
	if err := jpeg.Encode(buf, img, &jpeg.Options{Quality: quality}); err == nil {
		data := make([]byte, buf.Len())
		copy(data, buf.Bytes())
		return data, "jpeg", nil
	}

	// Fallback to PNG for lossless compression
	buf.Reset()
	if err := png.Encode(buf, img); err == nil {
		data := make([]byte, buf.Len())
		copy(data, buf.Bytes())
		return data, "png", nil
	}

	return nil, "", fmt.Errorf("failed to encode image in any format")
}

// compressImageData compresses raw image data
func (rsm *RegionScreenshotManager) compressImageData(data []byte, quality int) ([]byte, string, error) {
	// Decode the image first
	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, "", err
	}

	return rsm.compressImage(img, quality)
}

// generateRegionID creates a unique identifier for a region
func (rsm *RegionScreenshotManager) generateRegionID(region models.Rectangle) string {
	data := fmt.Sprintf("%.2f,%.2f,%.2f,%.2f", region.X, region.Y, region.Width, region.Height)
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:8]) // Use first 8 bytes for shorter ID
}

// calculateImageHash calculates a hash for image data
func (rsm *RegionScreenshotManager) calculateImageHash(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:16]) // Use first 16 bytes
}

// getCachedRegion retrieves a cached region
func (rsm *RegionScreenshotManager) getCachedRegion(regionID string) *CachedRegion {
	rsm.mutex.RLock()
	defer rsm.mutex.RUnlock()

	if cached, exists := rsm.regionCache[regionID]; exists {
		cached.LastAccessed = time.Now()
		cached.AccessCount++
		return cached
	}

	return nil
}

// cacheRegion stores a region in the cache
func (rsm *RegionScreenshotManager) cacheRegion(regionID string, region *CachedRegion) {
	rsm.mutex.Lock()
	defer rsm.mutex.Unlock()

	// Clean cache if it's getting too large
	if len(rsm.regionCache) >= rsm.maxCacheSize {
		rsm.evictLeastUsed()
	}

	rsm.regionCache[regionID] = region
}

// evictLeastUsed removes the least recently used cache entry
func (rsm *RegionScreenshotManager) evictLeastUsed() {
	var oldestID string
	var oldestTime time.Time = time.Now()

	for id, region := range rsm.regionCache {
		if region.LastAccessed.Before(oldestTime) {
			oldestTime = region.LastAccessed
			oldestID = id
		}
	}

	if oldestID != "" {
		delete(rsm.regionCache, oldestID)
	}
}

// shouldCreateDiff determines if a diff image should be created
func (rsm *RegionScreenshotManager) shouldCreateDiff(old, new models.ScreenshotRegion) bool {
	// Don't create diff if regions are too different in size
	sizeDiff := float64(len(new.ImageData)) / float64(len(old.ImageData))
	if sizeDiff > 2.0 || sizeDiff < 0.5 {
		return false
	}

	// Don't create diff if bounding boxes are different
	if old.BoundingBox.X != new.BoundingBox.X || 
	   old.BoundingBox.Y != new.BoundingBox.Y ||
	   old.BoundingBox.Width != new.BoundingBox.Width ||
	   old.BoundingBox.Height != new.BoundingBox.Height {
		return false
	}

	return true
}

// createImageDiff creates a binary diff between two image data arrays
func (rsm *RegionScreenshotManager) createImageDiff(oldData, newData []byte) ([]byte, error) {
	// Simple XOR-based diff for demonstration
	// In a production system, you'd use a more sophisticated image diff algorithm
	
	if len(oldData) != len(newData) {
		return newData, nil // Return full new image if sizes don't match
	}

	diff := make([]byte, len(newData))
	hasChanges := false

	for i := 0; i < len(newData); i++ {
		diff[i] = oldData[i] ^ newData[i]
		if diff[i] != 0 {
			hasChanges = true
		}
	}

	if !hasChanges {
		return nil, fmt.Errorf("no changes detected")
	}

	return diff, nil
}

// estimateUncompressedSize estimates the uncompressed size of an image
func (rsm *RegionScreenshotManager) estimateUncompressedSize(img image.Image) int {
	if img == nil {
		return 0
	}
	bounds := img.Bounds()
	width := bounds.Dx()
	height := bounds.Dy()
	return width * height * 4 // Assume RGBA, 4 bytes per pixel
}

// GetCacheStats returns cache statistics
func (rsm *RegionScreenshotManager) GetCacheStats() map[string]interface{} {
	rsm.mutex.RLock()
	defer rsm.mutex.RUnlock()

	totalSize := 0
	totalAccesses := 0
	
	for _, region := range rsm.regionCache {
		totalSize += region.Size
		totalAccesses += region.AccessCount
	}

	return map[string]interface{}{
		"cached_regions":   len(rsm.regionCache),
		"total_cache_size": totalSize,
		"total_accesses":   totalAccesses,
		"max_cache_size":   rsm.maxCacheSize,
		"cache_utilization": float64(len(rsm.regionCache)) / float64(rsm.maxCacheSize),
	}
}

// ClearCache clears all cached regions
func (rsm *RegionScreenshotManager) ClearCache() {
	rsm.mutex.Lock()
	defer rsm.mutex.Unlock()
	
	rsm.regionCache = make(map[string]*CachedRegion)
}

// CalculateRegionsFromDeltas determines which screen regions need to be captured based on DOM deltas
func (rsm *RegionScreenshotManager) CalculateRegionsFromDeltas(deltas []models.DOMDelta, viewportSize models.Rectangle) []models.Rectangle {
	regions := make([]models.Rectangle, 0)
	
	for _, delta := range deltas {
		if delta.BoundingRect != nil {
			// Expand region slightly to capture context
			region := *delta.BoundingRect
			region.X = max(0, region.X-10)
			region.Y = max(0, region.Y-10)
			region.Width = min(viewportSize.Width-region.X, region.Width+20)
			region.Height = min(viewportSize.Height-region.Y, region.Height+20)
			
			regions = append(regions, region)
		}
	}
	
	// Merge overlapping regions to optimize capture
	return rsm.mergeOverlappingRegions(regions)
}

// mergeOverlappingRegions combines overlapping or nearby regions
func (rsm *RegionScreenshotManager) mergeOverlappingRegions(regions []models.Rectangle) []models.Rectangle {
	if len(regions) <= 1 {
		return regions
	}

	merged := make([]models.Rectangle, 0, len(regions))
	used := make([]bool, len(regions))

	for i, region := range regions {
		if used[i] {
			continue
		}

		currentRegion := region
		used[i] = true

		// Try to merge with other regions
		for j := i + 1; j < len(regions); j++ {
			if used[j] {
				continue
			}

			if rsm.regionsOverlap(currentRegion, regions[j]) {
				currentRegion = rsm.mergeRectangles(currentRegion, regions[j])
				used[j] = true
			}
		}

		merged = append(merged, currentRegion)
	}

	return merged
}

// regionsOverlap checks if two rectangles overlap or are close enough to merge
func (rsm *RegionScreenshotManager) regionsOverlap(a, b models.Rectangle) bool {
	// Add small buffer for nearby regions
	buffer := 20.0
	
	return a.X-buffer < b.X+b.Width &&
		   a.X+a.Width+buffer > b.X &&
		   a.Y-buffer < b.Y+b.Height &&
		   a.Y+a.Height+buffer > b.Y
}

// mergeRectangles combines two rectangles into their bounding rectangle
func (rsm *RegionScreenshotManager) mergeRectangles(a, b models.Rectangle) models.Rectangle {
	x1 := min(a.X, b.X)
	y1 := min(a.Y, b.Y)
	x2 := max(a.X+a.Width, b.X+b.Width)
	y2 := max(a.Y+a.Height, b.Y+b.Height)

	return models.Rectangle{
		X:      x1,
		Y:      y1,
		Width:  x2 - x1,
		Height: y2 - y1,
	}
}

// Utility functions
func min(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}