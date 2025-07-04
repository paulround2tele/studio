package analyzer

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"mcp/internal/models"
	"strings"
	"sync"
	"time"

	"github.com/PuerkitoBio/goquery"
)

// IncrementalStateManager handles incremental UI state tracking and delta generation
type IncrementalStateManager struct {
	sessions     map[string]*models.IncrementalSession
	stateCache   *models.StateCache
	thresholds   *models.StreamingThresholds
	performance  *models.PerformanceTracker
	changeBuffer []models.DOMDelta
	mutex        sync.RWMutex
}

// NewIncrementalStateManager creates a new incremental state manager
func NewIncrementalStateManager() *IncrementalStateManager {
	return &IncrementalStateManager{
		sessions: make(map[string]*models.IncrementalSession),
		stateCache: &models.StateCache{
			ScreenshotCache: make(map[string][]byte),
			ComponentStates: make(map[string]interface{}),
			MaxCacheSize:    100, // MB
			CacheHitRate:    0.0,
		},
		thresholds: &models.StreamingThresholds{
			MaxDeltaSize:        1024 * 1024, // 1MB
			MaxRegionCount:      10,
			CompressionRatio:    0.3, // Must achieve 30% compression
			LatencyThreshold:    100 * time.Millisecond,
			MemoryThreshold:     50 * 1024 * 1024, // 50MB
			CacheHitThreshold:   0.7,              // 70% hit rate
		},
		performance: &models.PerformanceTracker{
			LastUpdated: time.Now(),
		},
		changeBuffer: make([]models.DOMDelta, 0, 100),
	}
}

// CreateSession creates a new incremental streaming session
func (ism *IncrementalStateManager) CreateSession(sessionID, startURL string, mode models.StreamingMode) *models.IncrementalSession {
	ism.mutex.Lock()
	defer ism.mutex.Unlock()

	session := &models.IncrementalSession{
		SessionID:      sessionID,
		StartURL:       startURL,
		Mode:           mode,
		StateCache:     ism.stateCache,
		ChangeStream:   make(chan *models.IncrementalState, 100),
		StartTime:      time.Now(),
		LastActivity:   time.Now(),
		TotalChanges:   0,
		BytesSaved:     0,
		CompressionAvg: 0.0,
		IsActive:       true,
	}

	ism.sessions[sessionID] = session
	return session
}

// ProcessHTMLChanges detects changes between old and new HTML and generates deltas
func (ism *IncrementalStateManager) ProcessHTMLChanges(sessionID, oldHTML, newHTML string) (*models.IncrementalState, error) {
	startTime := time.Now()

	// Parse HTML documents
	oldDoc, err := goquery.NewDocumentFromReader(strings.NewReader(oldHTML))
	if err != nil {
		return nil, fmt.Errorf("failed to parse old HTML: %w", err)
	}

	newDoc, err := goquery.NewDocumentFromReader(strings.NewReader(newHTML))
	if err != nil {
		return nil, fmt.Errorf("failed to parse new HTML: %w", err)
	}

	// Generate DOM deltas
	deltas := ism.generateDOMDeltas(oldDoc, newDoc)

	// Create incremental state
	state := &models.IncrementalState{
		SessionID:   sessionID,
		SequenceNum: time.Now().UnixNano(),
		Timestamp:   time.Now(),
		ChangeType:  ism.classifyChangeType(deltas),
		DOMDeltas:   deltas,
		Metadata: models.ChangeMetadata{
			TriggerAction:    "html_comparison",
			AffectedAreas:    ism.extractAffectedAreas(deltas),
			ComponentTypes:   ism.extractComponentTypes(deltas),
			Priority:         ism.calculatePriority(deltas),
			ProcessingTime:   time.Since(startTime).Microseconds(),
			DetectionLatency: 0, // Set by caller
		},
		Checksum: ism.calculateChecksum(deltas),
	}

	// Update session
	ism.updateSession(sessionID, state)

	return state, nil
}

// generateDOMDeltas compares two HTML documents and generates delta operations
func (ism *IncrementalStateManager) generateDOMDeltas(oldDoc, newDoc *goquery.Document) []models.DOMDelta {
	deltas := make([]models.DOMDelta, 0)
	timestamp := time.Now().UnixNano() / 1000 // microseconds

	// Build element maps for comparison
	oldElements := ism.buildElementMap(oldDoc)
	newElements := ism.buildElementMap(newDoc)

	// Find removed elements
	for path, oldElement := range oldElements {
		if _, exists := newElements[path]; !exists {
			deltas = append(deltas, models.DOMDelta{
				OperationType: models.DOMOpRemove,
				TargetPath:    path,
				ElementID:     oldElement.ID,
				OldValue:      oldElement,
				Timestamp:     timestamp,
			})
		}
	}

	// Find added and modified elements
	for path, newElement := range newElements {
		if oldElement, exists := oldElements[path]; exists {
			// Check for modifications
			if ism.hasElementChanged(oldElement, newElement) {
				delta := models.DOMDelta{
					OperationType: models.DOMOpModify,
					TargetPath:    path,
					ElementID:     newElement.ID,
					OldValue:      oldElement,
					NewValue:      newElement,
					Timestamp:     timestamp,
				}

				// Detect specific change types
				if oldElement.Text != newElement.Text {
					delta.OperationType = models.DOMOpText
					delta.TextContent = newElement.Text
				} else if ism.hasAttributesChanged(oldElement.Attributes, newElement.Attributes) {
					delta.OperationType = models.DOMOpAttribute
					delta.Attributes = ism.getChangedAttributes(oldElement.Attributes, newElement.Attributes)
				}

				deltas = append(deltas, delta)
			}
		} else {
			// New element added
			deltas = append(deltas, models.DOMDelta{
				OperationType: models.DOMOpAdd,
				TargetPath:    path,
				ElementID:     newElement.ID,
				NewValue:      newElement,
				Timestamp:     timestamp,
			})
		}
	}

	return deltas
}

// buildElementMap creates a map of CSS paths to element data
func (ism *IncrementalStateManager) buildElementMap(doc *goquery.Document) map[string]ElementData {
	elements := make(map[string]ElementData)

	doc.Find("*").Each(func(i int, s *goquery.Selection) {
		path := ism.generateCSSPath(s)
		id, _ := s.Attr("id")
		class, _ := s.Attr("class")

		elements[path] = ElementData{
			Tag:        goquery.NodeName(s),
			ID:         id,
			Classes:    strings.Fields(class),
			Text:       strings.TrimSpace(s.Text()),
			Attributes: ism.getAttributes(s),
		}
	})

	return elements
}

// ElementData represents extracted element information for comparison
type ElementData struct {
	Tag        string            `json:"tag"`
	ID         string            `json:"id"`
	Classes    []string          `json:"classes"`
	Text       string            `json:"text"`
	Attributes map[string]string `json:"attributes"`
}

// generateCSSPath creates a CSS selector path for an element
func (ism *IncrementalStateManager) generateCSSPath(s *goquery.Selection) string {
	if s.Length() == 0 {
		return ""
	}

	// Check for ID first
	if id, exists := s.Attr("id"); exists && id != "" {
		return "#" + id
	}

	// Build hierarchical path
	var parts []string
	current := s

	for current.Length() > 0 && goquery.NodeName(current) != "html" {
		tag := goquery.NodeName(current)
		
		// Add class information if available
		if class, exists := current.Attr("class"); exists && class != "" {
			classes := strings.Fields(class)
			if len(classes) > 0 {
				tag += "." + strings.Join(classes, ".")
			}
		}

		// Add nth-child if needed for specificity
		siblings := current.Siblings().AddSelection(current)
		if siblings.Length() > 1 {
			index := 0
			currentNode := current.Get(0)
			siblings.Each(func(i int, sibling *goquery.Selection) {
				if sibling.Get(0) == currentNode {
					index = i + 1
					return
				}
			})
			if index > 0 {
				tag += fmt.Sprintf(":nth-child(%d)", index)
			}
		}

		parts = append([]string{tag}, parts...)
		current = current.Parent()
	}

	return strings.Join(parts, " > ")
}

// getAttributes extracts all attributes from an element
func (ism *IncrementalStateManager) getAttributes(s *goquery.Selection) map[string]string {
	attrs := make(map[string]string)
	if s.Length() > 0 && s.Nodes[0] != nil {
		for _, attr := range s.Nodes[0].Attr {
			attrs[attr.Key] = attr.Val
		}
	}
	return attrs
}

// hasElementChanged checks if two elements are different
func (ism *IncrementalStateManager) hasElementChanged(old, new ElementData) bool {
	if old.Tag != new.Tag || old.Text != new.Text {
		return true
	}

	if len(old.Classes) != len(new.Classes) {
		return true
	}

	for i, class := range old.Classes {
		if class != new.Classes[i] {
			return true
		}
	}

	return ism.hasAttributesChanged(old.Attributes, new.Attributes)
}

// hasAttributesChanged checks if attributes have changed between elements
func (ism *IncrementalStateManager) hasAttributesChanged(old, new map[string]string) bool {
	if len(old) != len(new) {
		return true
	}

	for key, oldVal := range old {
		if newVal, exists := new[key]; !exists || oldVal != newVal {
			return true
		}
	}

	return false
}

// getChangedAttributes returns only the attributes that have changed
func (ism *IncrementalStateManager) getChangedAttributes(old, new map[string]string) map[string]string {
	changed := make(map[string]string)

	// Check for modified or added attributes
	for key, newVal := range new {
		if oldVal, exists := old[key]; !exists || oldVal != newVal {
			changed[key] = newVal
		}
	}

	// Check for removed attributes
	for key := range old {
		if _, exists := new[key]; !exists {
			changed[key] = "" // Empty string indicates removal
		}
	}

	return changed
}

// classifyChangeType determines the primary type of change
func (ism *IncrementalStateManager) classifyChangeType(deltas []models.DOMDelta) models.ChangeType {
	if len(deltas) == 0 {
		return models.ChangeTypeDOM
	}

	// Count change types
	domChanges := 0
	contentChanges := 0
	visualChanges := 0
	interactionChanges := 0

	for _, delta := range deltas {
		switch delta.OperationType {
		case models.DOMOpAdd, models.DOMOpRemove:
			domChanges++
		case models.DOMOpText:
			contentChanges++
		case models.DOMOpStyle, models.DOMOpClass:
			visualChanges++
		case models.DOMOpAttribute:
			// Check if it's an interactive attribute
			if ism.isInteractiveAttribute(delta.Attributes) {
				interactionChanges++
			} else {
				visualChanges++
			}
		}
	}

	// Return the most significant change type
	if interactionChanges > 0 {
		return models.ChangeTypeInteraction
	}
	if contentChanges > domChanges && contentChanges > visualChanges {
		return models.ChangeTypeContent
	}
	if visualChanges > domChanges {
		return models.ChangeTypeVisual
	}
	return models.ChangeTypeDOM
}

// isInteractiveAttribute checks if an attribute change affects interactivity
func (ism *IncrementalStateManager) isInteractiveAttribute(attributes map[string]string) bool {
	interactiveAttrs := map[string]bool{
		"disabled":     true,
		"readonly":     true,
		"checked":      true,
		"selected":     true,
		"href":         true,
		"onclick":      true,
		"onchange":     true,
		"aria-expanded": true,
		"aria-selected": true,
	}

	for attr := range attributes {
		if interactiveAttrs[attr] {
			return true
		}
	}
	return false
}

// extractAffectedAreas returns CSS selectors of changed elements
func (ism *IncrementalStateManager) extractAffectedAreas(deltas []models.DOMDelta) []string {
	areas := make([]string, 0, len(deltas))
	for _, delta := range deltas {
		areas = append(areas, delta.TargetPath)
	}
	return areas
}

// extractComponentTypes identifies types of components that changed
func (ism *IncrementalStateManager) extractComponentTypes(deltas []models.DOMDelta) []string {
	types := make(map[string]bool)
	
	for _, delta := range deltas {
		// Extract component type from CSS path or element data
		if strings.Contains(delta.TargetPath, "button") {
			types["button"] = true
		} else if strings.Contains(delta.TargetPath, "input") {
			types["input"] = true
		} else if strings.Contains(delta.TargetPath, "form") {
			types["form"] = true
		} else if strings.Contains(delta.TargetPath, "nav") {
			types["navigation"] = true
		} else if strings.Contains(delta.TargetPath, "modal") {
			types["modal"] = true
		} else {
			types["generic"] = true
		}
	}

	result := make([]string, 0, len(types))
	for componentType := range types {
		result = append(result, componentType)
	}
	return result
}

// calculatePriority determines the priority of changes for AI decision-making
func (ism *IncrementalStateManager) calculatePriority(deltas []models.DOMDelta) models.ChangePriority {
	if len(deltas) == 0 {
		return models.PriorityLow
	}

	maxPriority := models.PriorityLow

	for _, delta := range deltas {
		priority := ism.getDeltaPriority(delta)
		if priority > maxPriority {
			maxPriority = priority
		}
	}

	return maxPriority
}

// getDeltaPriority calculates priority for a single delta
func (ism *IncrementalStateManager) getDeltaPriority(delta models.DOMDelta) models.ChangePriority {
	path := strings.ToLower(delta.TargetPath)

	// Critical: Error messages, security prompts, alerts
	if strings.Contains(path, "error") || strings.Contains(path, "alert") || 
	   strings.Contains(path, "security") || strings.Contains(path, "warning") {
		return models.PriorityCritical
	}

	// High: Navigation changes, modal dialogs, form submissions
	if strings.Contains(path, "nav") || strings.Contains(path, "modal") || 
	   strings.Contains(path, "submit") || strings.Contains(path, "login") {
		return models.PriorityHigh
	}

	// Medium: Content updates, form field changes
	if delta.OperationType == models.DOMOpText || 
	   strings.Contains(path, "input") || strings.Contains(path, "content") {
		return models.PriorityMedium
	}

	// Low: Style changes, animations
	if delta.OperationType == models.DOMOpStyle || delta.OperationType == models.DOMOpClass {
		return models.PriorityLow
	}

	return models.PriorityMedium
}

// calculateChecksum generates a checksum for integrity verification
func (ism *IncrementalStateManager) calculateChecksum(deltas []models.DOMDelta) string {
	data, _ := json.Marshal(deltas)
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}

// updateSession updates session statistics
func (ism *IncrementalStateManager) updateSession(sessionID string, state *models.IncrementalState) {
	ism.mutex.Lock()
	defer ism.mutex.Unlock()

	if session, exists := ism.sessions[sessionID]; exists {
		session.LastActivity = time.Now()
		session.TotalChanges++
		
		// Estimate bytes saved (compared to full HTML capture)
		deltaSize := ism.estimateDeltaSize(state)
		estimatedFullSize := int64(50000) // Assume 50KB average HTML size
		session.BytesSaved += estimatedFullSize - deltaSize
		
		// Update compression average
		compressionRatio := float64(deltaSize) / float64(estimatedFullSize)
		session.CompressionAvg = (session.CompressionAvg*float64(session.TotalChanges-1) + compressionRatio) / float64(session.TotalChanges)
	}
}

// estimateDeltaSize estimates the size of a delta in bytes
func (ism *IncrementalStateManager) estimateDeltaSize(state *models.IncrementalState) int64 {
	data, _ := json.Marshal(state)
	return int64(len(data))
}

// ShouldUseIncremental determines if incremental mode should be used based on thresholds
func (ism *IncrementalStateManager) ShouldUseIncremental(state *models.IncrementalState) bool {
	deltaSize := ism.estimateDeltaSize(state)
	
	// Check size threshold
	if deltaSize > int64(ism.thresholds.MaxDeltaSize) {
		return false
	}
	
	// Check region count threshold
	if len(state.ScreenRegions) > ism.thresholds.MaxRegionCount {
		return false
	}
	
	// Check performance thresholds
	if ism.performance.NetworkLatency > ism.thresholds.LatencyThreshold {
		return false
	}
	
	return true
}

// GetSession retrieves a session by ID
func (ism *IncrementalStateManager) GetSession(sessionID string) (*models.IncrementalSession, bool) {
	ism.mutex.RLock()
	defer ism.mutex.RUnlock()
	
	session, exists := ism.sessions[sessionID]
	return session, exists
}

// CleanupExpiredSessions removes expired sessions
func (ism *IncrementalStateManager) CleanupExpiredSessions(timeout time.Duration) int {
	ism.mutex.Lock()
	defer ism.mutex.Unlock()
	
	cleaned := 0
	for sessionID, session := range ism.sessions {
		if session.IsExpired(timeout) {
			close(session.ChangeStream)
			delete(ism.sessions, sessionID)
			cleaned++
		}
	}
	
	return cleaned
}

// UpdatePerformanceMetrics updates performance tracking data
func (ism *IncrementalStateManager) UpdatePerformanceMetrics(latency time.Duration, memUsage int64, cacheHitRate float64) {
	ism.mutex.Lock()
	defer ism.mutex.Unlock()
	
	ism.performance.NetworkLatency = latency
	ism.performance.MemoryUsage = memUsage
	ism.performance.CacheHitRate = cacheHitRate
	ism.performance.LastUpdated = time.Now()
}