/**
 * DomainDetailDrawer Component (P0)
 * 
 * Displays detailed domain scoring breakdown when a domain row is clicked
 * in the LeadResultsPanel. Uses the score-breakdown API endpoint.
 */

'use client';

import React from 'react';
import { LoaderIcon, AlertCircleIcon, CopyIcon, CheckCircle2Icon, ExternalLinkIcon, TrendingUpIcon, TargetIcon, FileTextIcon, ClockIcon, ShieldIcon, SparklesIcon } from '@/icons';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import Badge from '@/components/ta/ui/badge/Badge';
import Button from '@/components/ta/ui/button/Button';
import { cn } from '@/lib/utils';
import { useGetCampaignDomainScoreBreakdownQuery } from '@/store/api/campaignApi';
import type { DomainListItem } from '@/lib/api-client/models/domain-list-item';
import type { DomainScoreBreakdownResponse } from '@/lib/api-client/models/domain-score-breakdown-response';

// Score component configuration for display (keys match API camelCase)
const SCORE_COMPONENTS = [
  { key: 'density', label: 'Keyword Density', weight: 2.5, icon: TargetIcon, description: 'Frequency of target keywords in content' },
  { key: 'coverage', label: 'Keyword Coverage', weight: 2.0, icon: FileTextIcon, description: 'Variety of unique keywords found' },
  { key: 'nonParked', label: 'Not Parked', weight: 1.5, icon: ShieldIcon, description: 'Domain is live and not parked' },
  { key: 'contentLength', label: 'Content Quality', weight: 1.0, icon: FileTextIcon, description: 'Sufficient meaningful content length' },
  { key: 'titleKeyword', label: 'Title Keyword', weight: 1.5, icon: SparklesIcon, description: 'Target keyword in page title' },
  { key: 'freshness', label: 'Freshness', weight: 0.5, icon: ClockIcon, description: 'Recent content updates detected' },
] as const;

// Helper to extract numeric value from ScoreComponent
function getComponentValue(component: { value?: number; state: string } | undefined): number {
  return component?.value ?? 0;
}

// Mock fallback data for when backend not ready
const MOCK_BREAKDOWN: DomainScoreBreakdownResponse = {
  campaignId: 'mock',
  domain: 'example.com',
  state: 'complete',
  overallScore: 78,
  components: {
    density: { value: 0.75, state: 'ok' },
    coverage: { value: 0.82, state: 'ok' },
    nonParked: { value: 1.0, state: 'ok' },
    contentLength: { value: 0.65, state: 'ok' },
    titleKeyword: { value: 0.9, state: 'ok' },
    freshness: { value: 0.45, state: 'ok' },
    tfLite: { value: 0, state: 'ok' },
  },
  evidence: {
    parkedPenaltyApplied: false,
    parkedPenaltyFactor: 1.0,
  },
  weights: {
    density: 2.5,
    coverage: 2.0,
    nonParked: 1.5,
    contentLength: 1.0,
    titleKeyword: 1.5,
    freshness: 0.5,
  },
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

  // Generate dynamic, credible match reason from actual score components
  const getMatchReason = (): { summary: string; strengths: string[]; weaknesses: string[] } => {
    const components = displayData?.components;
    if (!components) {
      return {
        summary: 'Scoring data loading...',
        strengths: [],
        weaknesses: [],
      };
    }

    const score = displayData?.overallScore ?? domain?.domainScore ?? 0;
    
    // Identify strengths (components >= 0.7 / 70%)
    const strengths: string[] = [];
    if (getComponentValue(components.nonParked) >= 0.9) strengths.push('Live, active site');
    if (getComponentValue(components.freshness) >= 0.7) strengths.push('Fresh content');
    if (getComponentValue(components.contentLength) >= 0.7) strengths.push('Rich content depth');
    if (getComponentValue(components.density) >= 0.5) strengths.push('Strong keyword density');
    if (getComponentValue(components.coverage) >= 0.5) strengths.push('Good keyword variety');
    if (getComponentValue(components.titleKeyword) >= 0.7) strengths.push('Keyword in title');
    
    // Identify weaknesses (components < 0.4 / 40%)
    const weaknesses: string[] = [];
    if (getComponentValue(components.nonParked) < 0.5) weaknesses.push('Parked or inactive');
    if (getComponentValue(components.freshness) < 0.3) weaknesses.push('Stale content');
    if (getComponentValue(components.contentLength) < 0.4) weaknesses.push('Limited content depth');
    if (getComponentValue(components.density) < 0.2) weaknesses.push('Low keyword density');
    if (getComponentValue(components.coverage) < 0.2) weaknesses.push('Narrow keyword coverage');
    if (getComponentValue(components.titleKeyword) < 0.3 && score < 60) weaknesses.push('No title keyword');
    
    // Build summary
    let summary: string;
    if (isMatch) {
      if (score >= 80) {
        summary = `High-quality lead (score ${Math.round(score)}). ${strengths.slice(0, 2).join(' and ').toLowerCase() || 'Strong signals'} make this a top candidate.`;
      } else if (score >= 60) {
        summary = `Qualified lead (score ${Math.round(score)}). ${strengths.length > 0 ? strengths[0] : 'Adequate signals'}, though ${weaknesses.length > 0 ? weaknesses[0]?.toLowerCase() : 'some areas could improve'}.`;
      } else {
        summary = `Borderline lead (score ${Math.round(score)}). Met minimum thresholds based on combined structural signals.`;
      }
    } else if (leadStatusKey === 'no_match') {
      if (score < 40) {
        summary = `Did not qualify (score ${Math.round(score)}). ${weaknesses.slice(0, 2).join(', ').toLowerCase() || 'Insufficient signals'}.`;
      } else {
        summary = `Score ${Math.round(score)} was not sufficient. ${weaknesses.length > 0 ? weaknesses[0] : 'Did not meet all requirements'}.`;
      }
    } else {
      summary = 'Lead evaluation pending or in progress.';
    }
    
    return { summary, strengths, weaknesses };
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const matchAnalysis = React.useMemo(() => getMatchReason(), [displayData, domain?.domainScore, domain?.leadStatus, isMatch, leadStatusKey]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="lg" className="overflow-y-auto">
        <SheetHeader className="space-y-1 pb-4 border-b">
          <div className="flex items-center gap-2">
            <SheetTitle className="text-xl font-bold break-all">
              {domain?.domain ?? 'Domain Details'}
            </SheetTitle>
            {domain?.leadStatus && (
              <Badge color="light" size="sm" className={cn('font-medium', leadStatusColor)}>
                {isMatch ? 'Match ✓' : domain.leadStatus}
              </Badge>
            )}
          </div>
          <SheetDescription className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2"
              onClick={handleCopyDomain}
              disabled={!domain?.domain}
              startIcon={copied ? <CheckCircle2Icon className="h-3.5 w-3.5 text-emerald-500" /> : <CopyIcon className="h-3.5 w-3.5" />}
            >
              {copied ? 'Copied' : 'Copy Domain'}
            </Button>
            {domain?.domain && (
              <a
                href={`https://${domain.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-7 px-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 rounded-md"
              >
                <ExternalLinkIcon className="h-3.5 w-3.5" />
                Visit Site
              </a>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Overall Score */}
          <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUpIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Overall Domain Score
                </span>
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {isLoading ? (
                  <LoaderIcon className="h-8 w-8 animate-spin" />
                ) : (
                  `${Math.round(displayData?.overallScore ?? domain?.domainScore ?? 0)}/100`
                )}
              </div>
            </div>
            {displayData?.evidence?.parkedPenaltyApplied && displayData.evidence.parkedPenaltyFactor !== undefined && displayData.evidence.parkedPenaltyFactor < 1 && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                ⚠️ Parked penalty applied: {Math.round((1 - displayData.evidence.parkedPenaltyFactor) * 100)}% reduction
              </p>
            )}
          </div>

          {/* Score Breakdown */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">Score Breakdown</h4>
            
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <LoaderIcon className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-500">Loading score details...</span>
              </div>
            )}

            {isError && (
              <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 p-4">
                <div className="flex items-start gap-2">
                  <AlertCircleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
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
                    value={getComponentValue(displayData.components?.[key as keyof typeof displayData.components])}
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
                  <Badge key={idx} color="light" className="text-sm">
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

          {/* Match Reason - Enhanced with strengths/weaknesses */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100">
              {isMatch ? 'Why Qualified' : 'Classification Reason'}
            </h4>
            <div className={cn(
              'rounded-lg p-4 text-sm space-y-3',
              isMatch
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200'
                : 'bg-gray-50 text-gray-700 dark:bg-gray-800/50 dark:text-gray-300'
            )}>
              <p className="font-medium">{matchAnalysis.summary}</p>
              
              {(matchAnalysis.strengths.length > 0 || matchAnalysis.weaknesses.length > 0) && (
                <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t border-current/10">
                  {matchAnalysis.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1 text-emerald-700 dark:text-emerald-300">
                        ✓ Strengths
                      </p>
                      <ul className="text-xs space-y-0.5">
                        {matchAnalysis.strengths.slice(0, 3).map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {matchAnalysis.weaknesses.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold mb-1 text-rose-700 dark:text-rose-300">
                        ✗ Weaknesses
                      </p>
                      <ul className="text-xs space-y-0.5">
                        {matchAnalysis.weaknesses.slice(0, 3).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
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
