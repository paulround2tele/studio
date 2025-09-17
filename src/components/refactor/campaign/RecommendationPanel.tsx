/**
 * Recommendation Panel Component (Phase 2)
 * Displays actionable insights based on campaign metrics
 */

import React, { useState } from 'react';
import { X, AlertTriangle, Info, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Recommendation } from '@/types/campaignMetrics';

interface RecommendationPanelProps {
  recommendations: Recommendation[];
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

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set([...prev, id]));
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
      </div>
      
      <div className="space-y-3">
        {visibleRecommendations.map((recommendation) => {
          const config = severityConfig[recommendation.severity];
          const Icon = config.icon;
          
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
                    <h4 className="font-semibold text-sm">
                      {recommendation.title}
                    </h4>
                    
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