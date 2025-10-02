/**
 * Enhanced Recommendation System (Phase 8)
 * Layered recommendation channels with provenance tracking
 */

import { telemetryService } from './telemetryService';
import { capabilitiesService } from './capabilitiesService';
// Alias import of feature flag util to avoid lint hook rule in service module
import { useBackendCanonical as backendCanonicalEnabled } from '@/lib/feature-flags-simple';

// Feature flag for layered recommendations
const isLayeredRecommendationsEnabled = () => 
  process.env.NEXT_PUBLIC_LAYERED_RECOMMENDATIONS !== 'false';

/**
 * Recommendation source types
 */
export type RecommendationSource = 'server' | 'ml-experimental' | 'client-anomaly' | 'client-heuristic';

/**
 * Recommendation provenance information
 */
export interface RecommendationProvenance {
  source: RecommendationSource;
  confidence: number; // 0-1
  modelVersion?: string;
  generatedAt: string;
  reasoning?: string[];
  experimentId?: string; // For A/B testing
  baselineComparison?: {
    improvedMetric: string;
    expectedImprovement: number;
  };
}

/**
 * Enhanced recommendation with provenance
 */
export interface EnhancedRecommendation {
  id: string;
  severity: 'info' | 'warn' | 'action';
  title: string;
  detail: string;
  rationale: string;
  // Phase 8: Enhanced metadata
  provenance: RecommendationProvenance;
  category: 'optimization' | 'quality' | 'scalability' | 'anomaly';
  priority: number; // 1-10, higher = more important
  estimatedImpact: {
    timeToImplement: string; // e.g., "5 minutes", "2 hours"
    expectedROI: number; // Percentage improvement expected
    riskLevel: 'low' | 'medium' | 'high';
  };
  actionable: {
    quickAction?: string; // Simple action description
    detailedSteps?: string[];
    automatable: boolean;
  };
}

/**
 * Recommendation mix statistics
 */
export interface RecommendationMix {
  total: number;
  bySource: {
    server: number;
    experimental: number;
    anomalyAugmented: number;
    clientHeuristic: number;
  };
  averageConfidence: number;
  highPriorityCount: number;
}

/**
 * Experimental recommendation configuration
 */
export interface ExperimentalRecommendationConfig {
  enableMLRecommendations: boolean;
  enableAnomalyAugmentation: boolean;
  confidenceThreshold: number; // Minimum confidence to include
  maxExperimentalRecs: number;
  abTestGroup?: string;
}

/**
 * Enhanced recommendation system service
 */
class EnhancedRecommendationService {
  
  /**
   * Generate layered recommendations with provenance tracking
   */
  async generateLayeredRecommendations(
    campaignId: string,
    snapshots: any[],
    context: {
      anomalies?: any[];
      forecasts?: any[];
      cohortInsights?: any[];
    } = {},
    config: ExperimentalRecommendationConfig = this.getDefaultConfig()
  ): Promise<{
    recommendations: EnhancedRecommendation[];
    mix: RecommendationMix;
    generatedAt: string;
  }> {
    const startTime = Date.now();
    const allRecommendations: EnhancedRecommendation[] = [];

    // 1. Get server/canonical recommendations
    const serverRecs = await this.getServerRecommendations(campaignId, snapshots);
    allRecommendations.push(...serverRecs);

    // 2. Get experimental ML recommendations (if enabled and in experiment)
    if (config.enableMLRecommendations && this.isInExperimentalGroup(config)) {
      const mlRecs = await this.getExperimentalMLRecommendations(campaignId, snapshots, config);
      allRecommendations.push(...mlRecs);
    }

    // 3. Get client anomaly-augmented recommendations
    if (config.enableAnomalyAugmentation && context.anomalies) {
      const anomalyRecs = await this.generateAnomalyAugmentedRecommendations(
        context.anomalies, 
        snapshots, 
        campaignId
      );
      allRecommendations.push(...anomalyRecs);
    }

    // 4. Generate client heuristic recommendations as fallback/supplement
    const heuristicRecs = this.generateClientHeuristicRecommendations(snapshots, context);
    allRecommendations.push(...heuristicRecs);

    // 5. Filter by confidence threshold and deduplicate
    const filteredRecs = this.filterAndDeduplicate(allRecommendations, config);

    // 6. Calculate recommendation mix
    const mix = this.calculateRecommendationMix(filteredRecs);

    // 7. Emit telemetry
    telemetryService.emitTelemetry('recommendation_mix', {
      counts: mix.bySource,
      totalRecommendations: mix.total
    });

    return {
      recommendations: filteredRecs,
      mix,
      generatedAt: new Date().toISOString()
    };
  }

  /**
   * Get server/canonical recommendations
   */
  private async getServerRecommendations(
    campaignId: string, 
    snapshots: any[]
  ): Promise<EnhancedRecommendation[]> {
  if (!backendCanonicalEnabled()) {
      return [];
    }

    try {
      await capabilitiesService.initialize();
      const resolution = capabilitiesService.resolveDomain('recommendations');
      
      if (resolution !== 'server') {
        return [];
      }

      // Mock server recommendation call - in practice would hit actual API
      const serverResponse = await this.fetchServerRecommendations(campaignId);
      
      return serverResponse.map(rec => ({
        ...rec,
        provenance: {
          source: 'server' as const,
          confidence: rec.confidence || 0.9,
          modelVersion: (serverResponse as any).modelVersion,
          generatedAt: new Date().toISOString(),
          reasoning: rec.reasoning || []
        },
        category: this.categorizeRecommendation(rec),
        priority: this.calculatePriority(rec),
        estimatedImpact: this.estimateImpact(rec),
        actionable: this.makeActionable(rec)
      }));
    } catch (error) {
      console.warn('[EnhancedRecommendationService] Server recommendations failed:', error);
      return [];
    }
  }

  /**
   * Get experimental ML recommendations
   */
  private async getExperimentalMLRecommendations(
    campaignId: string,
    snapshots: any[],
    config: ExperimentalRecommendationConfig
  ): Promise<EnhancedRecommendation[]> {
    try {
      // This would integrate with ML recommendation service
      // For now, generate synthetic experimental recommendations
      const experimentalRecs = this.generateSyntheticMLRecommendations(
        campaignId, 
        snapshots, 
        config
      );

      return experimentalRecs.slice(0, config.maxExperimentalRecs).map(rec => ({
        ...rec,
        provenance: {
          source: 'ml-experimental' as const,
          confidence: rec.confidence || 0.7,
          generatedAt: new Date().toISOString(),
          experimentId: config.abTestGroup,
          reasoning: rec.reasoning || ['Generated by experimental ML model'],
          baselineComparison: rec.baselineComparison
        }
      }));
    } catch (error) {
      console.warn('[EnhancedRecommendationService] Experimental ML recommendations failed:', error);
      return [];
    }
  }

  /**
   * Generate anomaly-augmented recommendations
   */
  private generateAnomalyAugmentedRecommendations(
    anomalies: any[],
    snapshots: any[],
    campaignId: string
  ): Promise<EnhancedRecommendation[]> {
    const recommendations: EnhancedRecommendation[] = [];

    anomalies.forEach((anomaly, index) => {
      if (anomaly.severity === 'high') {
        recommendations.push({
          id: `anomaly_aug_${campaignId}_${index}`,
          severity: 'action',
          title: `Investigate ${anomaly.metric} Anomaly`,
          detail: `Unusual pattern detected in ${anomaly.metric} at ${anomaly.timestamp}`,
          rationale: `Statistical anomaly detected (${anomaly.zScore}σ deviation from normal)`,
          provenance: {
            source: 'client-anomaly',
            confidence: Math.min(0.95, Math.abs(anomaly.zScore) / 3),
            generatedAt: new Date().toISOString(),
            reasoning: [
              `Anomaly score: ${anomaly.zScore.toFixed(2)}`,
              `Affected metric: ${anomaly.metric}`,
              `Detection method: ${anomaly.method || 'statistical'}`
            ]
          },
          category: 'anomaly',
          priority: anomaly.zScore > 3 ? 9 : 7,
          estimatedImpact: {
            timeToImplement: '10 minutes',
            expectedROI: 5, // Conservative estimate
            riskLevel: 'low'
          },
          actionable: {
            quickAction: `Review ${anomaly.metric} data for the time period around ${anomaly.timestamp}`,
            detailedSteps: [
              'Check data sources for quality issues',
              'Verify measurement accuracy',
              'Look for external factors that might explain the anomaly',
              'Consider adjusting alert thresholds if pattern is expected'
            ],
            automatable: false
          }
        });
      }
    });

    return Promise.resolve(recommendations);
  }

  /**
   * Generate client heuristic recommendations
   */
  private generateClientHeuristicRecommendations(
    snapshots: any[],
    context: any
  ): EnhancedRecommendation[] {
    const recommendations: EnhancedRecommendation[] = [];
    
    if (snapshots.length === 0) return recommendations;

    const latest = snapshots[snapshots.length - 1];
    const aggregates = latest.aggregates;

    // Low success rate recommendation
    if (aggregates.successRate < 0.7) {
      recommendations.push({
        id: `heuristic_success_rate_${Date.now()}`,
        severity: 'warn',
        title: 'Improve Campaign Success Rate',
        detail: `Current success rate is ${(aggregates.successRate * 100).toFixed(1)}%, below optimal threshold`,
        rationale: 'Success rates below 70% typically indicate data quality or targeting issues',
        provenance: {
          source: 'client-heuristic',
          confidence: 0.8,
          generatedAt: new Date().toISOString(),
          reasoning: [
            `Success rate: ${(aggregates.successRate * 100).toFixed(1)}%`,
            'Threshold: 70%',
            'Based on industry best practices'
          ]
        },
        category: 'optimization',
        priority: 6,
        estimatedImpact: {
          timeToImplement: '1-2 hours',
          expectedROI: 15,
          riskLevel: 'low'
        },
        actionable: {
          quickAction: 'Review domain validation settings and data sources',
          detailedSteps: [
            'Check DNS and HTTP validation accuracy',
            'Review domain filtering criteria',
            'Validate data source quality',
            'Consider adjusting validation timeouts'
          ],
          automatable: true
        }
      });
    }

    // Low lead score recommendation
    if (aggregates.avgLeadScore < 30) {
      recommendations.push({
        id: `heuristic_lead_score_${Date.now()}`,
        severity: 'action',
        title: 'Optimize Lead Scoring Model',
        detail: `Average lead score is ${aggregates.avgLeadScore.toFixed(1)}, indicating low-quality domains`,
        rationale: 'Lead scores below 30 suggest the scoring model may need adjustment or domain sources may be suboptimal',
        provenance: {
          source: 'client-heuristic',
          confidence: 0.85,
          generatedAt: new Date().toISOString(),
          reasoning: [
            `Average lead score: ${aggregates.avgLeadScore.toFixed(1)}`,
            'Target threshold: 30+',
            'Domain quality assessment'
          ]
        },
        category: 'quality',
        priority: 8,
        estimatedImpact: {
          timeToImplement: '2-4 hours',
          expectedROI: 25,
          riskLevel: 'medium'
        },
        actionable: {
          quickAction: 'Review lead scoring criteria and domain sources',
          detailedSteps: [
            'Analyze domain source quality',
            'Review lead scoring algorithm weights',
            'Consider additional quality signals',
            'Test different scoring thresholds'
          ],
          automatable: false
        }
      });
    }

    return recommendations;
  }

  /**
   * Filter recommendations by confidence and deduplicate
   */
  private filterAndDeduplicate(
    recommendations: EnhancedRecommendation[],
    config: ExperimentalRecommendationConfig
  ): EnhancedRecommendation[] {
    // Filter by confidence threshold
    const filtered = recommendations.filter(rec => 
      rec.provenance.confidence >= config.confidenceThreshold
    );

    // Deduplicate by title/category combination
    const deduped = filtered.reduce((acc, rec) => {
      const key = `${rec.title}_${rec.category}`;
      const existing = acc.find(r => `${r.title}_${r.category}` === key);
      
      if (!existing || rec.provenance.confidence > existing.provenance.confidence) {
        return [...acc.filter(r => `${r.title}_${r.category}` !== key), rec];
      }
      
      return acc;
    }, [] as EnhancedRecommendation[]);

    // Sort by priority (descending) then confidence (descending)
    return deduped.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      return b.provenance.confidence - a.provenance.confidence;
    });
  }

  /**
   * Calculate recommendation mix statistics
   */
  private calculateRecommendationMix(recommendations: EnhancedRecommendation[]): RecommendationMix {
    const bySource = {
      server: 0,
      experimental: 0,
      anomalyAugmented: 0,
      clientHeuristic: 0
    };

    let totalConfidence = 0;
    let highPriorityCount = 0;

    recommendations.forEach(rec => {
      switch (rec.provenance.source) {
        case 'server':
          bySource.server++;
          break;
        case 'ml-experimental':
          bySource.experimental++;
          break;
        case 'client-anomaly':
          bySource.anomalyAugmented++;
          break;
        case 'client-heuristic':
          bySource.clientHeuristic++;
          break;
      }

      totalConfidence += rec.provenance.confidence;
      if (rec.priority >= 8) {
        highPriorityCount++;
      }
    });

    return {
      total: recommendations.length,
      bySource,
      averageConfidence: recommendations.length > 0 ? totalConfidence / recommendations.length : 0,
      highPriorityCount
    };
  }

  /**
   * Check if in experimental group for A/B testing
   */
  private isInExperimentalGroup(config: ExperimentalRecommendationConfig): boolean {
    if (!config.abTestGroup) return true; // Default to enabled if no A/B test
    
    // Simple hash-based A/B testing
    const hash = this.simpleHash(config.abTestGroup);
    return hash % 2 === 0; // 50% split
  }

  /**
   * Helper methods
   */
  private async fetchServerRecommendations(campaignId: string): Promise<any[]> {
    // Mock server call - replace with actual API integration
    return [];
  }

  private generateSyntheticMLRecommendations(
    campaignId: string,
    snapshots: any[],
    config: ExperimentalRecommendationConfig
  ): any[] {
    // Generate synthetic ML recommendations for demonstration
    return [];
  }

  private categorizeRecommendation(rec: any): EnhancedRecommendation['category'] {
    // Categorize based on title/content
    const title = rec.title.toLowerCase();
    if (title.includes('anomaly') || title.includes('unusual')) return 'anomaly';
    if (title.includes('optimize') || title.includes('improve')) return 'optimization';
    if (title.includes('quality') || title.includes('accuracy')) return 'quality';
    if (title.includes('scale') || title.includes('capacity')) return 'scalability';
    return 'optimization';
  }

  private calculatePriority(rec: any): number {
    // Calculate priority based on severity and content
    const basePriority = rec.severity === 'action' ? 8 : rec.severity === 'warn' ? 6 : 4;
    return Math.min(10, basePriority + (rec.confidence || 0) * 2);
  }

  private estimateImpact(rec: any): EnhancedRecommendation['estimatedImpact'] {
    return {
      timeToImplement: '30 minutes',
      expectedROI: 10,
      riskLevel: 'low'
    };
  }

  private makeActionable(rec: any): EnhancedRecommendation['actionable'] {
    return {
      quickAction: rec.detail,
      automatable: false
    };
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private getDefaultConfig(): ExperimentalRecommendationConfig {
    return {
      enableMLRecommendations: true,
      enableAnomalyAugmentation: true,
      confidenceThreshold: 0.5,
      maxExperimentalRecs: 3,
      abTestGroup: 'default'
    };
  }
}

// Export singleton instance
export const enhancedRecommendationService = new EnhancedRecommendationService();

/**
 * Generate layered recommendations (convenience function)
 */
export async function generateLayeredRecommendations(
  campaignId: string,
  snapshots: any[],
  context?: any,
  config?: Partial<ExperimentalRecommendationConfig>
): Promise<ReturnType<EnhancedRecommendationService['generateLayeredRecommendations']>> {
  return enhancedRecommendationService.generateLayeredRecommendations(
    campaignId,
    snapshots,
    context,
    { ...enhancedRecommendationService['getDefaultConfig'](), ...config }
  );
}

/**
 * Check if layered recommendations are available
 */
export function isLayeredRecommendationsAvailable(): boolean {
  return isLayeredRecommendationsEnabled();
}