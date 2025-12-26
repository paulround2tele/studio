/**
 * DomainDetailDrawer Component (P0)
 * 
 * Displays detailed domain scoring breakdown when a domain row is clicked
 * in the LeadResultsPanel. Uses the score-breakdown API endpoint.
 */

'use client';

import React from 'react';
import { Loader2, AlertCircle, Copy, CheckCircle2, ExternalLink, TrendingUp, Target, FileText, Clock, Shield, Sparkles } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useGetCampaignDomainScoreBreakdownQuery } from '@/store/api/campaignApi';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';
import type { DomainScoreBreakdownResponse } from '@/lib/api-client/models/domain-score-breakdown-response';

// Score component configuration for display
const SCORE_COMPONENTS = [
  { key: 'density', label: 'Keyword Density', weight: 2.5, icon: Target, description: 'Frequency of target keywords in content' },
  { key: 'coverage', label: 'Keyword Coverage', weight: 2.0, icon: FileText, description: 'Variety of unique keywords found' },
  { key: 'non_parked', label: 'Not Parked', weight: 1.5, icon: Shield, description: 'Domain is live and not parked' },
  { key: 'content_length', label: 'Content Quality', weight: 1.0, icon: FileText, description: 'Sufficient meaningful content length' },
  { key: 'title_keyword', label: 'Title Keyword', weight: 1.5, icon: Sparkles, description: 'Target keyword in page title' },
  { key: 'freshness', label: 'Freshness', weight: 0.5, icon: Clock, description: 'Recent content updates detected' },
] as const;

// Mock fallback data for when backend not ready
const MOCK_BREAKDOWN: DomainScoreBreakdownResponse = {
  campaignId: 'mock',
  domain: 'example.com',
  components: {
    density: 0.75,
    coverage: 0.82,
    non_parked: 1.0,
    content_length: 0.65,
    title_keyword: 0.9,
    freshness: 0.45,
    tf_lite: 0,
  },
  final: 78,
  weights: {
    density: 2.5,
    coverage: 2.0,
    non_parked: 1.5,
    content_length: 1.0,
    title_keyword: 1.5,
    freshness: 0.5,
  },
  parkedPenaltyFactor: 1.0,
};

interface ScoreBarProps {
  label: string;
  value: number; // 0-1 normalized
  weight: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

function ScoreBar({ label, value, weight, icon: Icon, description }: ScoreBarProps) {
  const percentage = Math.round(value * 100);
  const barColor = percentage >= 80 ? 'bg-emerald-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-rose-400';
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <span className="font-medium text-gray-900 dark:text-gray-100">{label}</span>
          <span className="text-xs text-gray-400" title={`Weight: ${weight}x`}>
            ({weight}x)
          </span>
        </div>
        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">
          {percentage}%
        </span>
      </div>
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${percentage}%`}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
  );
}

interface DomainDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  domain: DomainListItem | null;
  /** Use mock data if backend not ready - for development/testing */
  useMock?: boolean;
}

export function DomainDetailDrawer({
  open,
  onOpenChange,
  campaignId,
  domain,
  useMock = false,
}: DomainDetailDrawerProps) {
  const [copied, setCopied] = React.useState(false);

  const {
    data: breakdown,
    isLoading,
    isError,
    error,
  } = useGetCampaignDomainScoreBreakdownQuery(
    { campaignId, domain: domain?.domain ?? '' },
    { skip: !open || !domain?.domain || useMock }
  );

  // Use mock data in development/testing or when explicitly requested
  const displayData = useMock ? MOCK_BREAKDOWN : breakdown;

  const handleCopyDomain = React.useCallback(async () => {
    if (!domain?.domain) return;
    try {
      await navigator.clipboard.writeText(domain.domain);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      console.warn('Failed to copy domain to clipboard');
    }
  }, [domain?.domain]);

  // Determine lead status styling
  const leadStatusKey = (domain?.leadStatus ?? '').toLowerCase();
  const isMatch = leadStatusKey === 'match';
  const leadStatusColor = isMatch
    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
    : leadStatusKey === 'no_match'
      ? 'bg-slate-100 text-slate-700 border-slate-300'
      : 'bg-amber-100 text-amber-800 border-amber-300';

  // Format keywords from features
  const keywords = domain?.features?.keywords?.top3?.filter(Boolean) ?? [];
  const uniqueKeywordCount = domain?.features?.keywords?.unique_count ?? 0;

  // Determine match reason based on score and status
  const getMatchReason = (): string => {
    if (!displayData) return 'Score breakdown not available';
    
    const score = displayData.final ?? domain?.domainScore ?? 0;
    if (isMatch) {
      if (score >= 80) return `High score (${Math.round(score)}) exceeds threshold. Strong keyword signals and content quality.`;
      if (score >= 60) return `Score (${Math.round(score)}) meets minimum threshold. Structural signals indicate potential lead.`;
      return `Qualified based on combined structural and keyword signals.`;
    } else if (leadStatusKey === 'no_match') {
      if (score < 50) return `Score (${Math.round(score)}) below threshold. Insufficient keyword coverage or content quality.`;
      return `Did not meet structural signal requirements despite adequate score.`;
    }
    return 'Lead evaluation pending or in progress.';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg" className="overflow-y-auto">
        <SheetHeader className="space-y-1 pb-4 border-b">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-xl font-bold break-all">
              {domain?.domain ?? 'Domain Details'}
            </SheetTitle>
            {domain?.leadStatus && (
              <Badge variant="outline" className={cn('font-medium', leadStatusColor)}>
                {isMatch ? 'Match ✓' : domain.leadStatus}
              </Badge>
            )}
          </div>
          <SheetDescription className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={handleCopyDomain}
              disabled={!domain?.domain}
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy Domain
                </>
              )}
            </Button>
            {domain?.domain && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                asChild
              >
                <a
                  href={`https://${domain.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Visit Site
                </a>
              </Button>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Overall Score */}
          <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Overall Domain Score
                </span>
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {isLoading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  `${Math.round(displayData?.final ?? domain?.domainScore ?? 0)}/100`
                )}
              </div>
            </div>
            {displayData?.parkedPenaltyFactor !== undefined && displayData.parkedPenaltyFactor < 1 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                ⚠️ Parked penalty applied: {Math.round((1 - displayData.parkedPenaltyFactor) * 100)}% reduction
              </p>
            )}
          </div>

          {/* Score Breakdown */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Score Breakdown</h4>
            
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading score details...</span>
              </div>
            )}

            {isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-200">
                      Failed to load score breakdown
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      {(error as { data?: { message?: string } })?.data?.message ?? 'Unknown error occurred'}
                    </p>
                    {useMock === false && (
                      <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                        Showing cached domain score instead.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {!isLoading && displayData && (
              <div className="space-y-4">
                {SCORE_COMPONENTS.map(({ key, label, weight, icon, description }) => (
                  <ScoreBar
                    key={key}
                    label={label}
                    value={displayData.components?.[key as keyof typeof displayData.components] ?? 0}
                    weight={weight}
                    icon={icon}
                    description={description}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Keywords Found */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Keywords Found</h4>
            {keywords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {keywords.map((keyword, idx) => (
                  <Badge key={idx} variant="secondary" className="text-sm">
                    {keyword}
                  </Badge>
                ))}
                {uniqueKeywordCount > keywords.length && (
                  <span className="text-xs text-gray-500 self-center">
                    +{uniqueKeywordCount - keywords.length} more
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No keywords detected in this domain.
              </p>
            )}
          </div>

          {/* Match Reason */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {isMatch ? 'Why Qualified' : 'Classification Reason'}
            </h4>
            <div className={cn(
              'rounded-lg p-3 text-sm',
              isMatch
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200'
                : 'bg-gray-50 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300'
            )}>
              {getMatchReason()}
            </div>
          </div>

          {/* Validation Status */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Validation Status</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <span className="text-gray-500 dark:text-gray-400">DNS Status</span>
                <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {domain?.dnsStatus?.toLowerCase().replace(/_/g, ' ') ?? 'Unknown'}
                </p>
              </div>
              <div className="rounded-lg border p-3">
                <span className="text-gray-500 dark:text-gray-400">HTTP Status</span>
                <p className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                  {domain?.httpStatus?.toLowerCase().replace(/_/g, ' ') ?? 'Unknown'}
                </p>
              </div>
            </div>
          </div>

          {/* Richness Score */}
          {domain?.features?.richness?.score !== undefined && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100">Content Richness</h4>
              <div className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Richness Score</span>
                  <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                    {Math.round(domain.features.richness.score)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default DomainDetailDrawer;
