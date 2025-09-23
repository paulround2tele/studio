package services

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/fntelecomllc/studio/backend/internal/featureflags"
)

// AdvancedScoringService implements sophisticated scoring algorithms based on detailed extraction data
// This implements Phase P5 of the Extraction → Analysis redesign.
type AdvancedScoringService struct {
	db     *sqlx.DB
	logger Logger
}

// NewAdvancedScoringService creates a new advanced scoring service
func NewAdvancedScoringService(db *sqlx.DB, logger Logger) *AdvancedScoringService {
	return &AdvancedScoringService{
		db:     db,
		logger: logger,
	}
}

// ScoringProfile represents a comprehensive domain scoring profile
type ScoringProfile struct {
	DomainID              uuid.UUID              `json:"domain_id"`
	DomainName            string                 `json:"domain_name"`
	CampaignID            uuid.UUID              `json:"campaign_id"`
	
	// Core Scores
	OverallScore          float64                `json:"overall_score"`
	RelevanceScore        float64                `json:"relevance_score"`
	QualityScore          float64                `json:"quality_score"`
	TechnicalScore        float64                `json:"technical_score"`
	
	// Component Scores
	KeywordRelevance      float64                `json:"keyword_relevance"`
	ContentQuality        float64                `json:"content_quality"`
	StructuralQuality     float64                `json:"structural_quality"`
	SemanticCoherence     float64                `json:"semantic_coherence"`
	
	// Feature-based Scores
	FeatureWeightedScore  float64                `json:"feature_weighted_score"`
	DiversityScore        float64                `json:"diversity_score"`
	ProminenceScore       float64                `json:"prominence_score"`
	DensityScore          float64                `json:"density_score"`
	
	// Technical Factors
	PerformanceScore      float64                `json:"performance_score"`
	AccessibilityScore    float64                `json:"accessibility_score"`
	SecurityScore         float64                `json:"security_score"`
	
	// Penalties and Bonuses
	Penalties             map[string]float64     `json:"penalties"`
	Bonuses               map[string]float64     `json:"bonuses"`
	
	// Metadata
	ScoringVersion        string                 `json:"scoring_version"`
	ComputedAt            time.Time              `json:"computed_at"`
	Confidence            float64                `json:"confidence"`
	
	// Detailed breakdown for transparency
	ComponentBreakdown    map[string]interface{} `json:"component_breakdown"`
}

// KeywordRelevanceAnalysis represents detailed keyword relevance scoring
type KeywordRelevanceAnalysis struct {
	TotalKeywords         int                    `json:"total_keywords"`
	UniqueKeywords        int                    `json:"unique_keywords"`
	HighRelevanceKeywords int                    `json:"high_relevance_keywords"`
	MediumRelevanceKeywords int                  `json:"medium_relevance_keywords"`
	LowRelevanceKeywords  int                    `json:"low_relevance_keywords"`
	
	// Semantic analysis
	SemanticClusters      []SemanticCluster      `json:"semantic_clusters"`
	TopicCoherence        float64                `json:"topic_coherence"`
	
	// Keyword quality metrics
	AverageRelevance      float64                `json:"average_relevance"`
	RelevanceVariance     float64                `json:"relevance_variance"`
	SentimentDistribution map[string]int         `json:"sentiment_distribution"`
}

// SemanticCluster represents a group of semantically related keywords
type SemanticCluster struct {
	Topic          string    `json:"topic"`
	Keywords       []string  `json:"keywords"`
	Coherence      float64   `json:"coherence"`
	Weight         float64   `json:"weight"`
	Relevance      float64   `json:"relevance"`
}

// ComputeAdvancedScore calculates comprehensive domain scores using detailed extraction data
func (s *AdvancedScoringService) ComputeAdvancedScore(ctx context.Context, domainID uuid.UUID, campaignID uuid.UUID, domainName string) (*ScoringProfile, error) {
	if !featureflags.IsAnalysisRescoringEnabled() {
		return nil, fmt.Errorf("advanced scoring disabled")
	}

	profile := &ScoringProfile{
		DomainID:           domainID,
		DomainName:         domainName,
		CampaignID:         campaignID,
		ComputedAt:         time.Now(),
		ScoringVersion:     "2.0",
		Penalties:          make(map[string]float64),
		Bonuses:            make(map[string]float64),
		ComponentBreakdown: make(map[string]interface{}),
	}

	// Get extraction features
	features, err := s.getExtractionFeatures(ctx, domainID, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get extraction features: %w", err)
	}

	// Get keyword analysis
	keywordAnalysis, err := s.getKeywordAnalysis(ctx, domainID, campaignID)
	if err != nil {
		return nil, fmt.Errorf("failed to get keyword analysis: %w", err)
	}

	// Compute component scores
	s.computeKeywordRelevanceScore(profile, features, keywordAnalysis)
	s.computeContentQualityScore(profile, features)
	s.computeStructuralQualityScore(profile, features)
	s.computeSemanticCoherenceScore(profile, keywordAnalysis)
	s.computeFeatureWeightedScore(profile, features)
	s.computeTechnicalScores(profile, features)
	
	// Apply penalties and bonuses
	s.applyAdvancedPenalties(profile, features, keywordAnalysis)
	s.applyAdvancedBonuses(profile, features, keywordAnalysis)
	
	// Compute overall scores
	s.computeOverallScores(profile)
	
	// Calculate confidence score
	profile.Confidence = s.calculateConfidence(profile, features, keywordAnalysis)

	if s.logger != nil {
		s.logger.Info(ctx, "Advanced scoring completed", map[string]interface{}{
			"domain":            domainName,
			"overall_score":     profile.OverallScore,
			"relevance_score":   profile.RelevanceScore,
			"quality_score":     profile.QualityScore,
			"technical_score":   profile.TechnicalScore,
			"confidence":        profile.Confidence,
			"penalties":         len(profile.Penalties),
			"bonuses":           len(profile.Bonuses),
		})
	}

	return profile, nil
}

// getExtractionFeatures retrieves feature extraction data for the domain
func (s *AdvancedScoringService) getExtractionFeatures(ctx context.Context, domainID uuid.UUID, campaignID uuid.UUID) (map[string]interface{}, error) {
	query := `
		SELECT 
			kw_unique_count, kw_total_occurrences, kw_weight_sum, kw_top3, kw_signal_distribution,
			content_richness_score, microcrawl_enabled, microcrawl_gain_ratio, diminishing_returns,
			is_parked, parked_confidence, content_bytes, page_lang, http_status_code,
			feature_vector, extracted_at
		FROM domain_extraction_features 
		WHERE domain_id = $1 AND campaign_id = $2 AND processing_state = 'ready'
		ORDER BY updated_at DESC 
		LIMIT 1
	`

	var (
		kwUniqueCount           sql.NullInt32
		kwTotalOccurrences      sql.NullInt32
		kwWeightSum             sql.NullFloat64
		kwTop3                  sql.NullString
		kwSignalDistribution    sql.NullString
		contentRichnessScore    sql.NullFloat64
		microcrawlEnabled       sql.NullBool
		microcrawlGainRatio     sql.NullFloat64
		diminishingReturns      sql.NullBool
		isParked                sql.NullBool
		parkedConfidence        sql.NullFloat64
		contentBytes            sql.NullInt32
		pageLang                sql.NullString
		httpStatusCode          sql.NullInt32
		featureVector           sql.NullString
		extractedAt             sql.NullTime
	)

	err := s.db.QueryRowContext(ctx, query, domainID, campaignID).Scan(
		&kwUniqueCount, &kwTotalOccurrences, &kwWeightSum, &kwTop3, &kwSignalDistribution,
		&contentRichnessScore, &microcrawlEnabled, &microcrawlGainRatio, &diminishingReturns,
		&isParked, &parkedConfidence, &contentBytes, &pageLang, &httpStatusCode,
		&featureVector, &extractedAt,
	)
	if err != nil {
		return nil, err
	}

	features := map[string]interface{}{
		"kw_unique_count":        nullableInt32ToInt(kwUniqueCount),
		"kw_total_occurrences":   nullableInt32ToInt(kwTotalOccurrences),
		"kw_weight_sum":          nullableFloat64ToFloat(kwWeightSum),
		"content_richness_score": nullableFloat64ToFloat(contentRichnessScore),
		"microcrawl_enabled":     nullableBoolToBool(microcrawlEnabled),
		"microcrawl_gain_ratio":  nullableFloat64ToFloat(microcrawlGainRatio),
		"diminishing_returns":    nullableBoolToBool(diminishingReturns),
		"is_parked":              nullableBoolToBool(isParked),
		"parked_confidence":      nullableFloat64ToFloat(parkedConfidence),
		"content_bytes":          nullableInt32ToInt(contentBytes),
		"page_lang":              nullableStringToString(pageLang),
		"http_status_code":       nullableInt32ToInt(httpStatusCode),
		"extracted_at":           nullableTimeToTime(extractedAt),
	}

	// Parse JSON fields
	if kwTop3.Valid {
		var top3 []string
		if err := json.Unmarshal([]byte(kwTop3.String), &top3); err == nil {
			features["kw_top3"] = top3
		}
	}

	if kwSignalDistribution.Valid {
		var signalDist map[string]int
		if err := json.Unmarshal([]byte(kwSignalDistribution.String), &signalDist); err == nil {
			features["kw_signal_distribution"] = signalDist
		}
	}

	if featureVector.Valid {
		var fv map[string]interface{}
		if err := json.Unmarshal([]byte(featureVector.String), &fv); err == nil {
			features["feature_vector"] = fv
		}
	}

	return features, nil
}

// getKeywordAnalysis retrieves detailed keyword analysis data
func (s *AdvancedScoringService) getKeywordAnalysis(ctx context.Context, domainID uuid.UUID, campaignID uuid.UUID) (*KeywordRelevanceAnalysis, error) {
	query := `
		SELECT 
			keyword_text, frequency, weight, position_avg, sentiment_score, relevance_score, source_type
		FROM domain_extracted_keywords 
		WHERE domain_id = $1 AND campaign_id = $2 AND processing_state = 'ready'
		ORDER BY frequency DESC, weight DESC
	`

	rows, err := s.db.QueryContext(ctx, query, domainID, campaignID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	analysis := &KeywordRelevanceAnalysis{
		SemanticClusters:      make([]SemanticCluster, 0),
		SentimentDistribution: make(map[string]int),
	}

	var keywords []map[string]interface{}
	var totalRelevance float64
	var relevanceValues []float64

	for rows.Next() {
		var (
			keywordText     string
			frequency       int
			weight          sql.NullFloat64
			positionAvg     sql.NullFloat64
			sentimentScore  sql.NullFloat64
			relevanceScore  sql.NullFloat64
			sourceType      sql.NullString
		)

		if err := rows.Scan(&keywordText, &frequency, &weight, &positionAvg, &sentimentScore, &relevanceScore, &sourceType); err != nil {
			continue
		}

		keyword := map[string]interface{}{
			"text":            keywordText,
			"frequency":       frequency,
			"weight":          nullableFloat64ToFloat(weight),
			"position_avg":    nullableFloat64ToFloat(positionAvg),
			"sentiment_score": nullableFloat64ToFloat(sentimentScore),
			"relevance_score": nullableFloat64ToFloat(relevanceScore),
			"source_type":     nullableStringToString(sourceType),
		}

		keywords = append(keywords, keyword)
		
		// Track relevance statistics
		relevance := nullableFloat64ToFloat(relevanceScore)
		totalRelevance += relevance
		relevanceValues = append(relevanceValues, relevance)
		
		// Count relevance categories
		switch {
		case relevance >= 0.7:
			analysis.HighRelevanceKeywords++
		case relevance >= 0.4:
			analysis.MediumRelevanceKeywords++
		default:
			analysis.LowRelevanceKeywords++
		}
		
		// Count sentiment distribution
		sentiment := nullableFloat64ToFloat(sentimentScore)
		switch {
		case sentiment >= 0.6:
			analysis.SentimentDistribution["positive"]++
		case sentiment <= 0.4:
			analysis.SentimentDistribution["negative"]++
		default:
			analysis.SentimentDistribution["neutral"]++
		}
	}

	analysis.TotalKeywords = len(keywords)
	analysis.UniqueKeywords = len(keywords) // Assuming all keywords are unique based on the query

	// Calculate average relevance
	if len(relevanceValues) > 0 {
		analysis.AverageRelevance = totalRelevance / float64(len(relevanceValues))
		
		// Calculate relevance variance
		var variance float64
		for _, r := range relevanceValues {
			variance += math.Pow(r-analysis.AverageRelevance, 2)
		}
		analysis.RelevanceVariance = variance / float64(len(relevanceValues))
	}

	// Perform semantic clustering (simple implementation)
	analysis.SemanticClusters = s.performSemanticClustering(keywords)
	analysis.TopicCoherence = s.calculateTopicCoherence(analysis.SemanticClusters)

	return analysis, nil
}

// Scoring computation methods

func (s *AdvancedScoringService) computeKeywordRelevanceScore(profile *ScoringProfile, features map[string]interface{}, analysis *KeywordRelevanceAnalysis) {
	if analysis.TotalKeywords == 0 {
		profile.KeywordRelevance = 0.0
		return
	}

	// Base relevance from average keyword relevance
	baseRelevance := analysis.AverageRelevance

	// Bonus for high-relevance keyword ratio
	highRelevanceRatio := float64(analysis.HighRelevanceKeywords) / float64(analysis.TotalKeywords)
	relevanceBonus := highRelevanceRatio * 0.2

	// Penalty for low-relevance keyword ratio
	lowRelevanceRatio := float64(analysis.LowRelevanceKeywords) / float64(analysis.TotalKeywords)
	relevancePenalty := lowRelevanceRatio * 0.15

	// Topic coherence bonus
	coherenceBonus := analysis.TopicCoherence * 0.1

	profile.KeywordRelevance = math.Min(baseRelevance+relevanceBonus+coherenceBonus-relevancePenalty, 1.0)
	profile.ComponentBreakdown["keyword_relevance"] = map[string]float64{
		"base_relevance":      baseRelevance,
		"relevance_bonus":     relevanceBonus,
		"relevance_penalty":   relevancePenalty,
		"coherence_bonus":     coherenceBonus,
		"high_relevance_ratio": highRelevanceRatio,
		"low_relevance_ratio":  lowRelevanceRatio,
	}
}

func (s *AdvancedScoringService) computeContentQualityScore(profile *ScoringProfile, features map[string]interface{}) {
	contentBytes := getFloatFromFeatures(features, "content_bytes")
	richnessScore := getFloatFromFeatures(features, "content_richness_score")
	
	// Base quality from content richness
	baseQuality := richnessScore

	// Content length factor
	lengthFactor := 1.0
	if contentBytes > 0 {
		// Optimal content length around 2-8KB
		if contentBytes >= 2000 && contentBytes <= 8000 {
			lengthFactor = 1.1
		} else if contentBytes < 1000 {
			lengthFactor = 0.8
		} else if contentBytes > 20000 {
			lengthFactor = 0.9
		}
	}

	// Language bonus
	langBonus := 0.0
	if lang, ok := features["page_lang"].(string); ok && lang != "" {
		langBonus = 0.05 // Bonus for having language metadata
	}

	profile.ContentQuality = math.Min(baseQuality*lengthFactor+langBonus, 1.0)
	profile.ComponentBreakdown["content_quality"] = map[string]float64{
		"base_quality":   baseQuality,
		"length_factor":  lengthFactor,
		"language_bonus": langBonus,
		"content_bytes":  contentBytes,
	}
}

func (s *AdvancedScoringService) computeStructuralQualityScore(profile *ScoringProfile, features map[string]interface{}) {
	signalDist, ok := features["kw_signal_distribution"].(map[string]int)
	if !ok {
		profile.StructuralQuality = 0.5 // Default neutral score
		return
	}

	// Calculate signal diversity (Shannon entropy)
	totalSignals := 0
	for _, count := range signalDist {
		totalSignals += count
	}

	if totalSignals == 0 {
		profile.StructuralQuality = 0.0
		return
	}

	entropy := 0.0
	for _, count := range signalDist {
		if count > 0 {
			p := float64(count) / float64(totalSignals)
			entropy -= p * math.Log2(p)
		}
	}

	// Normalize entropy by maximum possible entropy
	maxEntropy := math.Log2(float64(len(signalDist)))
	normalizedEntropy := entropy / maxEntropy

	// Bonus for having title and h1 keywords
	structuralBonus := 0.0
	if signalDist["title"] > 0 {
		structuralBonus += 0.1
	}
	if signalDist["h1"] > 0 {
		structuralBonus += 0.08
	}
	if signalDist["meta"] > 0 {
		structuralBonus += 0.05
	}

	profile.StructuralQuality = math.Min(normalizedEntropy+structuralBonus, 1.0)
	profile.ComponentBreakdown["structural_quality"] = map[string]interface{}{
		"entropy":           entropy,
		"normalized_entropy": normalizedEntropy,
		"structural_bonus":  structuralBonus,
		"signal_distribution": signalDist,
	}
}

func (s *AdvancedScoringService) computeSemanticCoherenceScore(profile *ScoringProfile, analysis *KeywordRelevanceAnalysis) {
	if len(analysis.SemanticClusters) == 0 {
		profile.SemanticCoherence = 0.5
		return
	}

	// Calculate weighted average coherence across clusters
	totalWeight := 0.0
	weightedCoherence := 0.0

	for _, cluster := range analysis.SemanticClusters {
		totalWeight += cluster.Weight
		weightedCoherence += cluster.Coherence * cluster.Weight
	}

	if totalWeight > 0 {
		profile.SemanticCoherence = weightedCoherence / totalWeight
	} else {
		profile.SemanticCoherence = 0.5
	}

	// Bonus for topic diversity
	diversityBonus := math.Min(float64(len(analysis.SemanticClusters))/5.0, 0.1)
	profile.SemanticCoherence = math.Min(profile.SemanticCoherence+diversityBonus, 1.0)

	profile.ComponentBreakdown["semantic_coherence"] = map[string]interface{}{
		"cluster_count":      len(analysis.SemanticClusters),
		"weighted_coherence": weightedCoherence / totalWeight,
		"diversity_bonus":    diversityBonus,
		"clusters":           analysis.SemanticClusters,
	}
}

func (s *AdvancedScoringService) computeFeatureWeightedScore(profile *ScoringProfile, features map[string]interface{}) {
	// Extract richness components from feature vector
	fv, ok := features["feature_vector"].(map[string]interface{})
	if !ok {
		profile.FeatureWeightedScore = profile.ContentQuality
		return
	}

	// Get richness components
	diversity := getFloatFromFeatures(fv, "diversity_norm")
	prominence := getFloatFromFeatures(fv, "prominence_norm")
	density := getFloatFromFeatures(fv, "density_norm")
	entropy := getFloatFromFeatures(fv, "signal_entropy_norm")
	enrichment := getFloatFromFeatures(fv, "enrichment_norm")

	// Advanced weighting based on domain characteristics
	weights := map[string]float64{
		"diversity":   0.25,
		"prominence":  0.25,
		"density":     0.20,
		"entropy":     0.15,
		"enrichment":  0.15,
	}

	score := diversity*weights["diversity"] +
		prominence*weights["prominence"] +
		density*weights["density"] +
		entropy*weights["entropy"] +
		enrichment*weights["enrichment"]

	profile.FeatureWeightedScore = math.Min(score, 1.0)
	profile.DiversityScore = diversity
	profile.ProminenceScore = prominence
	profile.DensityScore = density

	profile.ComponentBreakdown["feature_weighted"] = map[string]float64{
		"diversity":   diversity,
		"prominence":  prominence,
		"density":     density,
		"entropy":     entropy,
		"enrichment":  enrichment,
		"final_score": profile.FeatureWeightedScore,
	}
}

func (s *AdvancedScoringService) computeTechnicalScores(profile *ScoringProfile, features map[string]interface{}) {
	httpStatus := getFloatFromFeatures(features, "http_status_code")
	contentBytes := getFloatFromFeatures(features, "content_bytes")
	
	// Performance score based on HTTP status and content size
	performanceScore := 1.0
	if httpStatus >= 200 && httpStatus < 300 {
		performanceScore = 1.0
	} else if httpStatus >= 300 && httpStatus < 400 {
		performanceScore = 0.8
	} else {
		performanceScore = 0.3
	}

	// Content size factor (penalize very large or very small pages)
	if contentBytes > 0 {
		if contentBytes < 500 {
			performanceScore *= 0.7 // Too small
		} else if contentBytes > 50000 {
			performanceScore *= 0.8 // Too large
		}
	}

	profile.PerformanceScore = performanceScore

	// Basic accessibility score (would need more data for full assessment)
	profile.AccessibilityScore = 0.7 // Default neutral score

	// Basic security score
	if httpStatus == 200 {
		profile.SecurityScore = 0.8
	} else {
		profile.SecurityScore = 0.5
	}

	profile.TechnicalScore = (profile.PerformanceScore + profile.AccessibilityScore + profile.SecurityScore) / 3.0
}

func (s *AdvancedScoringService) applyAdvancedPenalties(profile *ScoringProfile, features map[string]interface{}, analysis *KeywordRelevanceAnalysis) {
	// Parking penalty
	if isParked := getBoolFromFeatures(features, "is_parked"); isParked {
		parkedConf := getFloatFromFeatures(features, "parked_confidence")
		penalty := parkedConf * 0.5
		profile.Penalties["parking"] = penalty
	}

	// Low keyword diversity penalty
	if analysis.UniqueKeywords < 5 {
		profile.Penalties["low_keyword_diversity"] = 0.1
	}

	// High low-relevance ratio penalty
	if analysis.TotalKeywords > 0 {
		lowRatio := float64(analysis.LowRelevanceKeywords) / float64(analysis.TotalKeywords)
		if lowRatio > 0.5 {
			profile.Penalties["low_relevance_ratio"] = lowRatio * 0.15
		}
	}

	// Negative sentiment penalty
	if negCount, ok := analysis.SentimentDistribution["negative"]; ok && analysis.TotalKeywords > 0 {
		negRatio := float64(negCount) / float64(analysis.TotalKeywords)
		if negRatio > 0.3 {
			profile.Penalties["negative_sentiment"] = negRatio * 0.1
		}
	}
}

func (s *AdvancedScoringService) applyAdvancedBonuses(profile *ScoringProfile, features map[string]interface{}, analysis *KeywordRelevanceAnalysis) {
	// Microcrawl gain bonus
	if enabled := getBoolFromFeatures(features, "microcrawl_enabled"); enabled {
		gainRatio := getFloatFromFeatures(features, "microcrawl_gain_ratio")
		if gainRatio > 0.2 {
			profile.Bonuses["microcrawl_gain"] = gainRatio * 0.1
		}
	}

	// High relevance ratio bonus
	if analysis.TotalKeywords > 0 {
		highRatio := float64(analysis.HighRelevanceKeywords) / float64(analysis.TotalKeywords)
		if highRatio > 0.6 {
			profile.Bonuses["high_relevance_ratio"] = highRatio * 0.1
		}
	}

	// Topic coherence bonus
	if analysis.TopicCoherence > 0.7 {
		profile.Bonuses["topic_coherence"] = analysis.TopicCoherence * 0.08
	}

	// Positive sentiment bonus
	if posCount, ok := analysis.SentimentDistribution["positive"]; ok && analysis.TotalKeywords > 0 {
		posRatio := float64(posCount) / float64(analysis.TotalKeywords)
		if posRatio > 0.5 {
			profile.Bonuses["positive_sentiment"] = posRatio * 0.05
		}
	}
}

func (s *AdvancedScoringService) computeOverallScores(profile *ScoringProfile) {
	// Calculate component scores
	profile.RelevanceScore = (profile.KeywordRelevance*0.6 + profile.SemanticCoherence*0.4)
	profile.QualityScore = (profile.ContentQuality*0.5 + profile.StructuralQuality*0.3 + profile.FeatureWeightedScore*0.2)
	
	// Apply penalties and bonuses
	totalPenalties := 0.0
	for _, penalty := range profile.Penalties {
		totalPenalties += penalty
	}
	
	totalBonuses := 0.0
	for _, bonus := range profile.Bonuses {
		totalBonuses += bonus
	}

	// Calculate overall score with weighted components
	baseScore := profile.RelevanceScore*0.4 + profile.QualityScore*0.35 + profile.TechnicalScore*0.25
	profile.OverallScore = math.Max(0.0, math.Min(1.0, baseScore+totalBonuses-totalPenalties))
}

func (s *AdvancedScoringService) calculateConfidence(profile *ScoringProfile, features map[string]interface{}, analysis *KeywordRelevanceAnalysis) float64 {
	confidence := 1.0

	// Reduce confidence for low data quality
	if analysis.TotalKeywords < 3 {
		confidence -= 0.3
	}
	
	if getFloatFromFeatures(features, "content_bytes") < 1000 {
		confidence -= 0.2
	}

	// Reduce confidence for high variance in relevance scores
	if analysis.RelevanceVariance > 0.2 {
		confidence -= 0.15
	}

	// Reduce confidence for parking detection uncertainty
	if isParked := getBoolFromFeatures(features, "is_parked"); isParked {
		parkedConf := getFloatFromFeatures(features, "parked_confidence")
		if parkedConf < 0.8 {
			confidence -= 0.2
		}
	}

	return math.Max(0.1, confidence)
}

// Semantic clustering implementation (simplified)
func (s *AdvancedScoringService) performSemanticClustering(keywords []map[string]interface{}) []SemanticCluster {
	// Simple keyword clustering based on text similarity
	// In production, this would use more sophisticated NLP techniques
	
	clusters := make([]SemanticCluster, 0)
	
	// Group keywords by first letter and common patterns
	groups := make(map[string][]string)
	weights := make(map[string]float64)
	
	for _, kw := range keywords {
		text := kw["text"].(string)
		weight := getFloatFromAny(kw["weight"])
		
		// Simple grouping by semantic patterns
		group := s.categorizeKeyword(text)
		groups[group] = append(groups[group], text)
		weights[group] += weight
	}

	// Create clusters from groups
	for topic, kwList := range groups {
		if len(kwList) >= 2 { // Only create clusters with multiple keywords
			cluster := SemanticCluster{
				Topic:     topic,
				Keywords:  kwList,
				Weight:    weights[topic],
				Coherence: s.calculateClusterCoherence(kwList),
				Relevance: 0.7, // Default relevance
			}
			clusters = append(clusters, cluster)
		}
	}

	return clusters
}

func (s *AdvancedScoringService) categorizeKeyword(keyword string) string {
	keyword = strings.ToLower(keyword)
	
	// Simple categorization based on common patterns
	if strings.Contains(keyword, "business") || strings.Contains(keyword, "company") {
		return "business"
	}
	if strings.Contains(keyword, "service") || strings.Contains(keyword, "solution") {
		return "services"
	}
	if strings.Contains(keyword, "tech") || strings.Contains(keyword, "software") {
		return "technology"
	}
	if strings.Contains(keyword, "product") || strings.Contains(keyword, "item") {
		return "products"
	}
	
	// Default to first letter grouping
	if len(keyword) > 0 {
		return string(keyword[0])
	}
	
	return "other"
}

func (s *AdvancedScoringService) calculateClusterCoherence(keywords []string) float64 {
	if len(keywords) <= 1 {
		return 1.0
	}
	
	// Simple coherence based on string similarity
	totalSimilarity := 0.0
	comparisons := 0
	
	for i := 0; i < len(keywords); i++ {
		for j := i + 1; j < len(keywords); j++ {
			similarity := s.calculateStringSimilarity(keywords[i], keywords[j])
			totalSimilarity += similarity
			comparisons++
		}
	}
	
	if comparisons == 0 {
		return 1.0
	}
	
	return totalSimilarity / float64(comparisons)
}

func (s *AdvancedScoringService) calculateStringSimilarity(a, b string) float64 {
	// Simple Jaccard similarity based on character bigrams
	if a == b {
		return 1.0
	}
	
	aSet := make(map[string]bool)
	bSet := make(map[string]bool)
	
	// Create bigrams
	for i := 0; i < len(a)-1; i++ {
		aSet[a[i:i+2]] = true
	}
	for i := 0; i < len(b)-1; i++ {
		bSet[b[i:i+2]] = true
	}
	
	// Calculate Jaccard similarity
	intersection := 0
	union := len(aSet)
	
	for bigram := range bSet {
		if aSet[bigram] {
			intersection++
		} else {
			union++
		}
	}
	
	if union == 0 {
		return 0.0
	}
	
	return float64(intersection) / float64(union)
}

func (s *AdvancedScoringService) calculateTopicCoherence(clusters []SemanticCluster) float64 {
	if len(clusters) == 0 {
		return 0.0
	}
	
	totalCoherence := 0.0
	totalWeight := 0.0
	
	for _, cluster := range clusters {
		totalCoherence += cluster.Coherence * cluster.Weight
		totalWeight += cluster.Weight
	}
	
	if totalWeight == 0 {
		return 0.0
	}
	
	return totalCoherence / totalWeight
}

// Helper functions
func getFloatFromFeatures(features map[string]interface{}, key string) float64 {
	if val, ok := features[key]; ok {
		return getFloatFromAny(val)
	}
	return 0.0
}

func getBoolFromFeatures(features map[string]interface{}, key string) bool {
	if val, ok := features[key]; ok {
		if b, ok := val.(bool); ok {
			return b
		}
	}
	return false
}

func getFloatFromAny(val interface{}) float64 {
	switch v := val.(type) {
	case float64:
		return v
	case float32:
		return float64(v)
	case int:
		return float64(v)
	case int32:
		return float64(v)
	case int64:
		return float64(v)
	default:
		return 0.0
	}
}

// Nullable conversion helpers
func nullableInt32ToInt(val sql.NullInt32) int {
	if val.Valid {
		return int(val.Int32)
	}
	return 0
}

func nullableFloat64ToFloat(val sql.NullFloat64) float64 {
	if val.Valid {
		return val.Float64
	}
	return 0.0
}

func nullableBoolToBool(val sql.NullBool) bool {
	if val.Valid {
		return val.Bool
	}
	return false
}

func nullableStringToString(val sql.NullString) string {
	if val.Valid {
		return val.String
	}
	return ""
}

func nullableTimeToTime(val sql.NullTime) time.Time {
	if val.Valid {
		return val.Time
	}
	return time.Time{}
}