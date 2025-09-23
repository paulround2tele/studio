package services

import (
	"context"
	"fmt"
	"math"
	"regexp"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/extraction"
	"github.com/fntelecomllc/studio/backend/internal/featureflags"
)

// AdaptiveCrawlingService implements intelligent crawling strategies based on site characteristics and extraction results
// This implements Phase P4 of the Extraction → Analysis redesign.
type AdaptiveCrawlingService struct {
	db                     *sqlx.DB
	logger                 Logger
	microcrawler          extraction.Microcrawler
	featureExtractionSvc  *FeatureExtractionService
	keywordExtractionSvc  *KeywordExtractionService
}

// NewAdaptiveCrawlingService creates a new adaptive crawling service
func NewAdaptiveCrawlingService(
	db *sqlx.DB, 
	logger Logger, 
	microcrawler extraction.Microcrawler,
	featureExtractionSvc *FeatureExtractionService,
	keywordExtractionSvc *KeywordExtractionService,
) *AdaptiveCrawlingService {
	return &AdaptiveCrawlingService{
		db:                   db,
		logger:               logger,
		microcrawler:        microcrawler,
		featureExtractionSvc: featureExtractionSvc,
		keywordExtractionSvc: keywordExtractionSvc,
	}
}

// SiteComplexityProfile represents analysis of a site's characteristics
type SiteComplexityProfile struct {
	Domain                string    `json:"domain"`
	ComplexityScore       float64   `json:"complexity_score"`        // 0.0 (simple) to 1.0 (complex)
	ContentRichness       float64   `json:"content_richness"`
	StructuralComplexity  float64   `json:"structural_complexity"`
	KeywordDensity        float64   `json:"keyword_density"`
	IsStaticSite          bool      `json:"is_static_site"`
	IsSinglePageApp       bool      `json:"is_single_page_app"`
	HasSubdomains         bool      `json:"has_subdomains"`
	EstimatedPageCount    int       `json:"estimated_page_count"`
	RecommendedCrawlDepth int       `json:"recommended_crawl_depth"`
	CreatedAt             time.Time `json:"created_at"`
}

// CrawlStrategy represents the adaptive crawling strategy for a domain
type CrawlStrategy struct {
	Domain              string  `json:"domain"`
	Strategy            string  `json:"strategy"`               // "aggressive", "moderate", "conservative", "minimal"
	MaxPages            int     `json:"max_pages"`
	MaxDepth            int     `json:"max_depth"`
	CrawlTimeout        int     `json:"crawl_timeout_seconds"`
	KeywordThreshold    float64 `json:"keyword_threshold"`     // Minimum new keyword ratio to continue
	ContentThreshold    float64 `json:"content_threshold"`     // Minimum content richness to continue
	UseJS               bool    `json:"use_js"`                // Whether to use JavaScript rendering
	FollowSubdomains    bool    `json:"follow_subdomains"`
	RespectRobots       bool    `json:"respect_robots"`
	EstimatedComplexity float64 `json:"estimated_complexity"`
}

// AnalyzeSiteComplexity performs deep analysis of a site to determine its complexity and characteristics
func (s *AdaptiveCrawlingService) AnalyzeSiteComplexity(ctx context.Context, domainID uuid.UUID, campaignID uuid.UUID, domainName string, baseSignals extraction.RawSignals) (*SiteComplexityProfile, error) {
	if !featureflags.IsMicrocrawlAdaptiveModeEnabled() {
		return nil, fmt.Errorf("adaptive crawling disabled")
	}

	// Analyze base page signals to determine site characteristics
	profile := &SiteComplexityProfile{
		Domain:    domainName,
		CreatedAt: time.Now(),
	}

	// Calculate content richness from base signals
	if baseSignals.ContentBytes > 0 {
		profile.ContentRichness = math.Min(float64(baseSignals.ContentBytes)/5000.0, 1.0) // Normalize by 5KB
	}

	// Calculate keyword density
	keywordCount := len(baseSignals.ParsedKeywordHits)
	if baseSignals.ContentBytes > 0 && keywordCount > 0 {
		profile.KeywordDensity = float64(keywordCount) / float64(baseSignals.ContentBytes/100) // Keywords per 100 bytes
	}

	// Analyze structural complexity from HTML content
	profile.StructuralComplexity = s.analyzeStructuralComplexity(baseSignals.HTML)

	// Detect site type patterns
	profile.IsStaticSite = s.detectStaticSite(baseSignals.HTML)
	profile.IsSinglePageApp = s.detectSinglePageApp(baseSignals.HTML)
	profile.HasSubdomains = s.detectSubdomains(domainName, baseSignals.HTML)

	// Estimate page count from signals
	profile.EstimatedPageCount = s.estimatePageCount(baseSignals.HTML, profile.StructuralComplexity)

	// Calculate overall complexity score
	profile.ComplexityScore = s.calculateComplexityScore(profile)

	// Determine recommended crawl depth
	profile.RecommendedCrawlDepth = s.calculateRecommendedCrawlDepth(profile)

	if s.logger != nil {
		s.logger.Info(ctx, "Site complexity analysis completed", map[string]interface{}{
			"domain":                domainName,
			"complexity_score":      profile.ComplexityScore,
			"content_richness":      profile.ContentRichness,
			"structural_complexity": profile.StructuralComplexity,
			"estimated_pages":       profile.EstimatedPageCount,
			"recommended_depth":     profile.RecommendedCrawlDepth,
			"is_static":            profile.IsStaticSite,
			"is_spa":               profile.IsSinglePageApp,
		})
	}

	return profile, nil
}

// GenerateCrawlStrategy creates an adaptive crawling strategy based on site complexity analysis
func (s *AdaptiveCrawlingService) GenerateCrawlStrategy(ctx context.Context, profile *SiteComplexityProfile, campaignID uuid.UUID) (*CrawlStrategy, error) {
	if !featureflags.IsMicrocrawlAdaptiveModeEnabled() {
		return nil, fmt.Errorf("adaptive crawling disabled")
	}

	strategy := &CrawlStrategy{
		Domain:              profile.Domain,
		EstimatedComplexity: profile.ComplexityScore,
		RespectRobots:       true, // Always respect robots.txt
	}

	// Determine strategy based on complexity score
	switch {
	case profile.ComplexityScore >= 0.8:
		// High complexity sites - aggressive crawling
		strategy.Strategy = "aggressive"
		strategy.MaxPages = 15
		strategy.MaxDepth = 3
		strategy.CrawlTimeout = 60
		strategy.KeywordThreshold = 0.1
		strategy.ContentThreshold = 0.3
		strategy.UseJS = profile.IsSinglePageApp
		strategy.FollowSubdomains = profile.HasSubdomains

	case profile.ComplexityScore >= 0.6:
		// Medium complexity sites - moderate crawling
		strategy.Strategy = "moderate"
		strategy.MaxPages = 10
		strategy.MaxDepth = 2
		strategy.CrawlTimeout = 45
		strategy.KeywordThreshold = 0.15
		strategy.ContentThreshold = 0.4
		strategy.UseJS = profile.IsSinglePageApp
		strategy.FollowSubdomains = false

	case profile.ComplexityScore >= 0.3:
		// Low complexity sites - conservative crawling
		strategy.Strategy = "conservative"
		strategy.MaxPages = 6
		strategy.MaxDepth = 2
		strategy.CrawlTimeout = 30
		strategy.KeywordThreshold = 0.2
		strategy.ContentThreshold = 0.5
		strategy.UseJS = false
		strategy.FollowSubdomains = false

	default:
		// Very simple sites - minimal crawling
		strategy.Strategy = "minimal"
		strategy.MaxPages = 3
		strategy.MaxDepth = 1
		strategy.CrawlTimeout = 20
		strategy.KeywordThreshold = 0.3
		strategy.ContentThreshold = 0.6
		strategy.UseJS = false
		strategy.FollowSubdomains = false
	}

	// Adjust strategy based on specific site characteristics
	if profile.IsStaticSite {
		// Static sites usually have simpler structure, reduce crawl intensity
		strategy.MaxPages = int(float64(strategy.MaxPages) * 0.7)
		strategy.KeywordThreshold *= 1.2
	}

	if profile.EstimatedPageCount < 5 {
		// Small sites don't need extensive crawling
		strategy.MaxPages = minInt(strategy.MaxPages, 3)
		strategy.MaxDepth = 1
	}

	if s.logger != nil {
		s.logger.Info(ctx, "Adaptive crawl strategy generated", map[string]interface{}{
			"domain":              profile.Domain,
			"strategy":            strategy.Strategy,
			"max_pages":           strategy.MaxPages,
			"max_depth":           strategy.MaxDepth,
			"keyword_threshold":   strategy.KeywordThreshold,
			"estimated_complexity": strategy.EstimatedComplexity,
		})
	}

	return strategy, nil
}

// ExecuteAdaptiveCrawl performs crawling using the adaptive strategy and real-time adjustments
func (s *AdaptiveCrawlingService) ExecuteAdaptiveCrawl(ctx context.Context, domainID uuid.UUID, campaignID uuid.UUID, domainName string, strategy *CrawlStrategy) (*extraction.MicrocrawlResult, []extraction.KeywordHit, error) {
	if !featureflags.IsMicrocrawlAdaptiveModeEnabled() {
		return nil, nil, fmt.Errorf("adaptive crawling disabled")
	}

	// Create adaptive context with timeout
	crawlCtx, cancel := context.WithTimeout(ctx, time.Duration(strategy.CrawlTimeout)*time.Second)
	defer cancel()

	// Perform the crawl with adaptive strategy
	result, keywords, err := s.microcrawler.Crawl(crawlCtx, "https://"+domainName, strategy.MaxPages)
	if err != nil {
		return nil, nil, fmt.Errorf("adaptive crawl failed: %w", err)
	}

	// Analyze crawl effectiveness and adjust for next time
	effectiveness := s.analyzeCrawlEffectiveness(result, keywords, strategy)

	if s.logger != nil {
		s.logger.Info(ctx, "Adaptive crawl completed", map[string]interface{}{
			"domain":                domainName,
			"strategy":              strategy.Strategy,
			"pages_visited":         result.PagesVisited,
			"keywords_added":        result.AddedUniqueKeywords,
			"gain_ratio":            result.GainRatio,
			"effectiveness_score":   effectiveness,
			"diminishing_returns":   result.DiminishingReturns,
		})
	}

	return &result, keywords, nil
}

// Helper methods for site analysis

func (s *AdaptiveCrawlingService) analyzeStructuralComplexity(html []byte) float64 {
	if len(html) == 0 {
		return 0.0
	}

	htmlStr := string(html)
	
	// Count structural elements that indicate complexity
	linkCount := len(findMatches(htmlStr, `<a\s+[^>]*href=`))
	formCount := len(findMatches(htmlStr, `<form\s+`))
	scriptCount := len(findMatches(htmlStr, `<script\s+`))
	divCount := len(findMatches(htmlStr, `<div\s+`))
	
	// Normalize by content length
	contentLength := float64(len(html))
	if contentLength == 0 {
		return 0.0
	}

	// Calculate complexity based on element density
	linkDensity := float64(linkCount) / (contentLength / 1000) // Links per KB
	formDensity := float64(formCount) / (contentLength / 1000)
	scriptDensity := float64(scriptCount) / (contentLength / 1000)
	divDensity := float64(divCount) / (contentLength / 1000)

	// Weighted complexity score
	complexity := (linkDensity*0.3 + formDensity*0.25 + scriptDensity*0.25 + divDensity*0.2) / 10.0
	
	return math.Min(complexity, 1.0)
}

func (s *AdaptiveCrawlingService) detectStaticSite(html []byte) bool {
	if len(html) == 0 {
		return true
	}

	htmlStr := string(html)
	
	// Static site indicators
	hasMinimalJS := len(findMatches(htmlStr, `<script\s+`)) < 3
	noForms := len(findMatches(htmlStr, `<form\s+`)) == 0
	hasStaticPatterns := len(findMatches(htmlStr, `(Jekyll|Hugo|Gatsby|Next\.js|generator.*static)`)) > 0
	
	return hasMinimalJS && (noForms || hasStaticPatterns)
}

func (s *AdaptiveCrawlingService) detectSinglePageApp(html []byte) bool {
	if len(html) == 0 {
		return false
	}

	htmlStr := string(html)
	
	// SPA indicators
	hasReactVue := len(findMatches(htmlStr, `(React|Vue|Angular|react|vue|angular)`)) > 0
	hasMinimalContent := len(findMatches(htmlStr, `<body[^>]*>[\s\n]*<div[^>]*>[\s\n]*<script`)) > 0
	hasJSFramework := len(findMatches(htmlStr, `(app\.js|bundle\.js|main\.js|chunk\.)`)) > 0
	
	return hasReactVue || hasMinimalContent || hasJSFramework
}

func (s *AdaptiveCrawlingService) detectSubdomains(domain string, html []byte) bool {
	if len(html) == 0 {
		return false
	}

	htmlStr := string(html)
	
	// Look for subdomain references
	subdomainPattern := fmt.Sprintf(`https?://[a-zA-Z0-9-]+\.%s`, regexp.QuoteMeta(domain))
	return len(findMatches(htmlStr, subdomainPattern)) > 0
}

func (s *AdaptiveCrawlingService) estimatePageCount(html []byte, structuralComplexity float64) int {
	if len(html) == 0 {
		return 1
	}

	htmlStr := string(html)
	
	// Count navigation links
	navLinks := len(findMatches(htmlStr, `<nav[^>]*>.*?</nav>`))
	menuLinks := len(findMatches(htmlStr, `(menu|navigation|nav).*?<a\s+`))
	allLinks := len(findMatches(htmlStr, `<a\s+[^>]*href=`))
	
	// Estimate based on navigation structure and complexity
	baseEstimate := navLinks*5 + menuLinks*2 + int(structuralComplexity*20)
	
	// Cap the estimate based on total links
	maxEstimate := allLinks / 2
	if maxEstimate < baseEstimate {
		baseEstimate = maxEstimate
	}
	
	// Reasonable bounds
	if baseEstimate < 1 {
		baseEstimate = 1
	}
	if baseEstimate > 100 {
		baseEstimate = 100
	}
	
	return baseEstimate
}

func (s *AdaptiveCrawlingService) calculateComplexityScore(profile *SiteComplexityProfile) float64 {
	// Weighted complexity calculation
	score := profile.StructuralComplexity*0.4 + 
		     profile.ContentRichness*0.3 + 
		     profile.KeywordDensity*0.2

	// Adjustments based on site characteristics
	if profile.IsSinglePageApp {
		score += 0.2
	}
	if profile.HasSubdomains {
		score += 0.15
	}
	if profile.EstimatedPageCount > 20 {
		score += 0.1
	}
	if profile.IsStaticSite {
		score -= 0.1
	}

	return math.Min(score, 1.0)
}

func (s *AdaptiveCrawlingService) calculateRecommendedCrawlDepth(profile *SiteComplexityProfile) int {
	switch {
	case profile.ComplexityScore >= 0.8:
		return 3
	case profile.ComplexityScore >= 0.6:
		return 2
	case profile.EstimatedPageCount > 10:
		return 2
	default:
		return 1
	}
}

func (s *AdaptiveCrawlingService) analyzeCrawlEffectiveness(result extraction.MicrocrawlResult, keywords []extraction.KeywordHit, strategy *CrawlStrategy) float64 {
	// Calculate effectiveness based on keyword gain and resource usage
	if result.PagesVisited == 0 {
		return 0.0
	}

	// Keyword efficiency: keywords per page visited
	keywordEfficiency := float64(result.AddedUniqueKeywords) / float64(result.PagesVisited)
	
	// Resource efficiency: gain ratio vs strategy threshold
	thresholdRatio := result.GainRatio / strategy.KeywordThreshold
	
	// Penalize if diminishing returns occurred too early
	diminishingPenalty := 0.0
	if result.DiminishingReturns && result.PagesVisited < strategy.MaxPages/2 {
		diminishingPenalty = 0.2
	}

	effectiveness := (keywordEfficiency*0.6 + thresholdRatio*0.4) - diminishingPenalty
	
	return math.Min(math.Max(effectiveness, 0.0), 1.0)
}

func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// findMatches finds all matches of a regex pattern in a string and returns them as a slice
func findMatches(text, pattern string) []string {
	re, err := regexp.Compile(pattern)
	if err != nil {
		return nil
	}
	return re.FindAllString(text, -1)
}