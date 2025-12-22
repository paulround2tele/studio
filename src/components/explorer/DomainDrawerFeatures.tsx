/**
 * DomainDrawerFeatures - Keywords and Microcrawl details display
 * 
 * Displays expanded feature information:
 * - Keywords: unique count, total hits, matched keywords list
 * - Microcrawl: pages crawled, gain ratio, depth
 * 
 * @see Phase 7.3 Drawer Integration
 */

'use client';

import React from 'react';
import { Hash, Globe, Tag, ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DomainRow } from '@/types/explorer/state';
import type { 
  DomainAnalysisFeaturesKeywords,
  DomainAnalysisFeaturesMicrocrawl,
} from '@/lib/api-client/models';

// ============================================================================
// KEYWORDS SECTION
// ============================================================================

interface KeywordsSectionProps {
  keywords: DomainAnalysisFeaturesKeywords | undefined;
  className?: string;
}

const KeywordsSection = React.memo(function KeywordsSection({ 
  keywords,
  className,
}: KeywordsSectionProps) {
  if (!keywords) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No keyword data available
      </div>
    );
  }

  // Use actual API field names
  const { unique_count, hits_total, top3 } = keywords;

  return (
    <div className={cn("space-y-4", className)} data-testid="domain-drawer-keywords">
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="text-2xl font-bold tabular-nums">
            {unique_count ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">Unique keywords</div>
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold tabular-nums">
            {hits_total ?? 0}
          </div>
          <div className="text-xs text-muted-foreground">Total hits</div>
        </div>
      </div>

      {/* Top keywords (from top3 array) */}
      {top3 && top3.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium flex items-center gap-1.5">
            <Tag className="h-3.5 w-3.5" />
            Top Keywords
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {top3.map((kw: string, i: number) => (
              <Badge 
                key={`${kw}-${i}`} 
                variant="secondary"
                className="text-xs"
              >
                {kw}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

KeywordsSection.displayName = 'KeywordsSection';

// ============================================================================
// MICROCRAWL SECTION
// ============================================================================

interface MicrocrawlSectionProps {
  microcrawl: DomainAnalysisFeaturesMicrocrawl | undefined;
  className?: string;
}

const MicrocrawlSection = React.memo(function MicrocrawlSection({ 
  microcrawl,
  className,
}: MicrocrawlSectionProps) {
  if (!microcrawl) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No microcrawl data available
      </div>
    );
  }

  // API only provides gain_ratio for now
  const { gain_ratio } = microcrawl;

  // Format gain ratio as percentage
  const gainPercentage = gain_ratio !== undefined 
    ? `${Math.round(gain_ratio * 100)}%` 
    : 'N/A';

  // Color code gain ratio
  const getGainColor = (ratio: number | undefined): string => {
    if (ratio === undefined) return 'text-muted-foreground';
    if (ratio >= 0.5) return 'text-green-600 dark:text-green-400';
    if (ratio >= 0.2) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className={cn("space-y-4", className)} data-testid="domain-drawer-microcrawl">
      <div className="flex items-center gap-4">
        {/* Gain ratio - the main metric */}
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className={cn("text-2xl font-bold tabular-nums", getGainColor(gain_ratio))}>
            {gainPercentage}
          </div>
          <div className="text-xs text-muted-foreground">Gain ratio</div>
        </div>
      </div>

      {/* Explanation of gain ratio */}
      <p className="text-xs text-muted-foreground">
        Gain ratio indicates keyword discovery efficiency — higher is better.
      </p>
    </div>
  );
});

MicrocrawlSection.displayName = 'MicrocrawlSection';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface DomainDrawerFeaturesProps {
  /** Domain data from explorer state */
  domain: DomainRow;
  /** Additional className */
  className?: string;
}

/**
 * Domain features display for drawer
 * Shows keywords and microcrawl data in expandable sections
 */
export const DomainDrawerFeatures = React.memo(function DomainDrawerFeatures({
  domain,
  className,
}: DomainDrawerFeaturesProps) {
  const features = domain.features;

  return (
    <div className={cn("space-y-4", className)} data-testid="domain-drawer-features">
      {/* Keywords card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Hash className="h-4 w-4" />
            Keywords
          </CardTitle>
        </CardHeader>
        <CardContent>
          <KeywordsSection keywords={features?.keywords} />
        </CardContent>
      </Card>

      {/* Microcrawl card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Microcrawl
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MicrocrawlSection microcrawl={features?.microcrawl} />
        </CardContent>
      </Card>
    </div>
  );
});

DomainDrawerFeatures.displayName = 'DomainDrawerFeatures';
