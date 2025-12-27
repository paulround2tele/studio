/**
 * AnalysisSummary Component (P0)
 * 
 * Displays a campaign-level summary of what Analysis & Enrichment achieved.
 * Answers: "What changed? Why only these leads? What makes lead A better than B?"
 * 
 * Shows prominently when a campaign has analysis data, making the value of
 * the Analysis & Enrichment phase immediately clear.
 */

'use client';

import React from 'react';
import { 
  TrendingUp, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Target,
  FileSearch,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface AnalysisSummaryData {
  /** Domains that passed HTTP validation with keyword hits */
  keywordHits: number;
  /** Domains that were fully analyzed (scored) */
  analyzed: number;
  /** Domains that qualified as leads */
  leads: number;
  /** High potential domains (score >= threshold) */
  highPotential: number;
  /** Total HTTP valid domains (baseline) */
  httpValid: number;
  /** DNS valid domains (for context) */
  dnsValid: number;
  /** Total generated domains */
  generated: number;
}

export interface RejectionReason {
  reason: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface AnalysisSummaryProps {
  data: AnalysisSummaryData;
  className?: string;
  /** Callback when user wants to see rejected domains */
  onViewRejected?: () => void;
  /** Whether the campaign is still running */
  isRunning?: boolean;
  /** Whether to make the component sticky */
  sticky?: boolean;
}

/**
 * Compute rejection reasons from funnel data.
 * This is a best-effort breakdown based on available metrics.
 */
function computeRejectionBreakdown(data: AnalysisSummaryData): RejectionReason[] {
  const { keywordHits, analyzed, leads, highPotential, httpValid } = data;
  
  const reasons: RejectionReason[] = [];
  
  // Domains with keywords but not analyzed (pending or skipped)
  const pendingAnalysis = Math.max(0, keywordHits - analyzed);
  if (pendingAnalysis > 0) {
    reasons.push({
      reason: 'Pending Analysis',
      count: pendingAnalysis,
      icon: FileSearch,
      description: 'Awaiting content analysis and scoring',
    });
  }
  
  // Analyzed but not high potential (low score)
  const lowScore = Math.max(0, analyzed - highPotential);
  if (lowScore > 0) {
    reasons.push({
      reason: 'Low Score',
      count: lowScore,
      icon: TrendingUp,
      description: 'Score below threshold (limited keyword density, weak content)',
    });
  }
  
  // High potential but not lead (structural issues)
  const structuralRejection = Math.max(0, highPotential - leads);
  if (structuralRejection > 0) {
    reasons.push({
      reason: 'Structural Issues',
      count: structuralRejection,
      icon: AlertTriangle,
      description: 'Potential detected but validation signals insufficient',
    });
  }
  
  // HTTP valid but no keywords found
  const noKeywords = Math.max(0, httpValid - keywordHits);
  if (noKeywords > 0) {
    reasons.push({
      reason: 'No Keywords Found',
      count: noKeywords,
      icon: Target,
      description: 'HTTP reachable but no target keywords in content',
    });
  }
  
  return reasons.filter(r => r.count > 0);
}

export function AnalysisSummary({
  data,
  className,
  onViewRejected,
  isRunning = false,
  sticky = false,
}: AnalysisSummaryProps) {
  const [showDetails, setShowDetails] = React.useState(false);
  
  const rejectionReasons = React.useMemo(() => computeRejectionBreakdown(data), [data]);
  const totalRejected = Math.max(0, data.analyzed - data.leads);
  const conversionRate = data.keywordHits > 0 
    ? Math.round((data.leads / data.keywordHits) * 100)
    : 0;
  
  // Don't render if no meaningful analysis data
  if (data.keywordHits === 0 && data.analyzed === 0 && data.leads === 0) {
    return null;
  }
  
  return (
    <div className={cn(
      'rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50',
      'dark:border-blue-800 dark:from-blue-900/30 dark:via-indigo-900/30 dark:to-purple-900/30',
      'p-5 shadow-sm',
      sticky && 'sticky top-4 z-10',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Analysis & Enrichment Summary
          </h3>
          {isRunning && (
            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
              In Progress
            </span>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            {conversionRate}% conversion
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400" title="Conversion Rate = Leads ÷ Keyword Hits × 100">
            {data.leads} / {data.keywordHits} leads
          </div>
        </div>
      </div>
      
      {/* Primary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <div className="text-center p-3 bg-white/60 dark:bg-gray-900/40 rounded-lg">
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {data.keywordHits.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            Keyword Hits
          </div>
        </div>
        
        <div className="text-center p-3 bg-white/60 dark:bg-gray-900/40 rounded-lg">
          <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
            {data.analyzed.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            Fully Analyzed
          </div>
        </div>
        
        <div className="text-center p-3 bg-white/60 dark:bg-gray-900/40 rounded-lg">
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {data.leads.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            Qualified Leads
          </div>
        </div>
        
        <div className="text-center p-3 bg-white/60 dark:bg-gray-900/40 rounded-lg">
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {totalRejected.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 font-medium">
            Rejected by Scoring
          </div>
        </div>
      </div>
      
      {/* Visual progress flow */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-4 px-2">
        <div className="flex items-center gap-1">
          <Target className="h-3.5 w-3.5" />
          <span>Keywords</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-blue-300 to-indigo-300 dark:from-blue-700 dark:to-indigo-700 mx-2" />
        <div className="flex items-center gap-1">
          <FileSearch className="h-3.5 w-3.5" />
          <span>Analyzed</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-indigo-300 to-emerald-300 dark:from-indigo-700 dark:to-emerald-700 mx-2" />
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium text-emerald-700 dark:text-emerald-300">Leads</span>
        </div>
      </div>
      
      {/* Rejection details toggle */}
      {rejectionReasons.length > 0 && (
        <div className="border-t border-blue-200 dark:border-blue-800 pt-4">
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full text-left group"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Why were {totalRejected.toLocaleString()} domains rejected?
              </span>
            </div>
            {showDetails ? (
              <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
            )}
          </button>
          
          {showDetails && (
            <div className="mt-3 space-y-2">
              {rejectionReasons.map((reason) => (
                <div
                  key={reason.reason}
                  className="flex items-start gap-3 p-2 bg-white/40 dark:bg-gray-900/30 rounded-lg"
                >
                  <reason.icon className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        {reason.reason}
                      </span>
                      <span className="text-sm font-mono font-semibold text-rose-600 dark:text-rose-400">
                        {reason.count.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {reason.description}
                    </p>
                  </div>
                </div>
              ))}
              
              {onViewRejected && (
                <button
                  type="button"
                  onClick={onViewRejected}
                  className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  View rejected domains
                </button>
              )}
            </div>
          )}
        </div>
      )}
      
      {/* Value statement */}
      <div className="mt-4 p-3 bg-white/60 dark:bg-gray-900/40 rounded-lg text-sm text-gray-700 dark:text-gray-300">
        <strong className="text-gray-900 dark:text-gray-100">What this means:</strong>{' '}
        Analysis filtered {data.keywordHits.toLocaleString()} keyword-matching domains down to{' '}
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
          {data.leads.toLocaleString()} qualified leads
        </span>{' '}
        based on content quality, freshness, and keyword relevance scoring.
      </div>
    </div>
  );
}

export default AnalysisSummary;
