/**
 * Recommendation Panel Component (Phase 2, Updated for Phase 5)
 * Displays actionable insights based on campaign metrics with optional explainability
 */

import React, { useState } from 'react';
import { X, AlertTriangle, Info, Zap, ChevronDown, ChevronUp, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recommendation } from '@/types/campaignMetrics';
import type { EnhancedRecommendation } from '@/services/campaignMetrics/recommendationsV3Pipeline';

interface RecommendationPanelProps {
  recommendations: (Recommendation | EnhancedRecommendation)[];
  className?: string;
}

const severityConfig = {
  info: {
    icon: Info,
    className: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300',
    iconClassName: 'text-blue-600 dark:text-blue-400'
  },
  warn: {
    icon: AlertTriangle,
    className: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-300',
    iconClassName: 'text-yellow-600 dark:text-yellow-400'
  },
  action: {
    icon: Zap,
    className: 'bg-orange-50 border-orange-200 text-orange-800 dark:bg-orange-900/20 dark:border-orange-700 dark:text-orange-300',
    iconClassName: 'text-orange-600 dark:text-orange-400'
  }
};

export function RecommendationPanel({ recommendations, className }: RecommendationPanelProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expandedExplanations, setExpandedExplanations] = useState<Set<string>>(new Set());

  const isExplainabilityEnabled = process.env.NEXT_PUBLIC_ENABLE_ADV_REC_EXPLAIN !== 'false';

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
  };

  const toggleExplanation = (id: string) => {
    setExpandedExplanations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const visibleRecommendations = recommendations.filter(rec => !dismissedIds.has(rec.id));

  if (visibleRecommendations.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <Zap className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Recommendations
        </h3>
        {isExplainabilityEnabled && (
          <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
            AI Insights
          </span>
        )}
      </div>
      
      <div className="space-y-3">
        {visibleRecommendations.map((recommendation) => {
          const config = severityConfig[recommendation.severity];
          const Icon = config.icon;
          const enhanced = recommendation as EnhancedRecommendation;
          const hasExplanation = isExplainabilityEnabled && enhanced.explanation;
          const isExpanded = expandedExplanations.has(recommendation.id);
          
          return (
            <div
              key={recommendation.id}
              className={cn(
                "p-4 rounded-lg border transition-colors",
                config.className
              )}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("w-5 h-5 mt-0.5 shrink-0", config.iconClassName)} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm flex-1">
                      {recommendation.title}
                    </h4>
                    {hasExplanation && enhanced.explanation && (
                      <div className="flex items-center gap-1">
                        <Brain className="w-3 h-3 opacity-60" />
                        <span className="text-xs opacity-60">
                          {Math.round(enhanced.explanation.confidence * 100)}%
                        </span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleDismiss(recommendation.id)}
                      className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                      aria-label="Dismiss recommendation"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <p className="text-sm mt-1 opacity-90">
                    {recommendation.detail}
                  </p>
                  
                  <p className="text-xs mt-2 opacity-75">
                    {recommendation.rationale}
                  </p>

                  {/* Enhanced Explanation Section */}
                  {hasExplanation && enhanced.explanation && (
                    <div className="mt-3">
                      <button
                        onClick={() => toggleExplanation(recommendation.id)}
                        className="flex items-center gap-1 text-xs font-medium opacity-75 hover:opacity-100 transition-opacity"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            Hide explanation
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            Show explanation
                          </>
                        )}
                      </button>
                      
                      {isExpanded && (
                        <div className="mt-2 p-3 bg-black/5 dark:bg-white/5 rounded text-xs space-y-2">
                          <div>
                            <span className="font-medium">Source:</span> {enhanced.explanation.source}
                          </div>
                          <div>
                            <span className="font-medium">Confidence:</span> {Math.round(enhanced.explanation.confidence * 100)}%
                          </div>
                          <div>
                            <span className="font-medium">Factors:</span> {enhanced.explanation.factors.join(', ')}
                          </div>
                          <div>
                            <span className="font-medium">Reasoning:</span> {enhanced.explanation.reasoning}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RecommendationPanel;