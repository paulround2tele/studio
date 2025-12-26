/**
 * Discovery Preview Panel - Shows lineage & offset information before campaign creation
 * Per design: visibility only (no offset override), shows configHash, nextOffset, priorCampaigns, exhaustionWarning
 */

import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, History, Hash, ArrowRight, Info } from 'lucide-react';
import { CampaignsApi } from '@/lib/api-client/apis/campaigns-api';
import type { DiscoveryPreviewRequest } from '@/lib/api-client/models/discovery-preview-request';
import type { DiscoveryPreviewResponse } from '@/lib/api-client/models/discovery-preview-response';
import { Configuration } from '@/lib/api-client/configuration';

interface DiscoveryPreviewPanelProps {
  patternType: 'prefix' | 'suffix' | 'both';
  constantString?: string;
  prefixVariableLength?: number;
  suffixVariableLength?: number;
  characterSet: string;
  tld: string;
  enabled?: boolean;
  /** Number of domains requested for generation */
  domainsRequested?: number;
  /** Batch size for generation */
  batchSize?: number;
}

/**
 * Compact circular progress indicator for pattern coverage
 */
function CoverageIndicator({ percentage }: { percentage: number }) {
  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const displayPercentage = Math.min(100, Math.max(0, percentage));
  
  // Color based on coverage: green (early) → yellow (mid) → red (late)
  const getColor = (pct: number) => {
    if (pct < 50) return 'text-green-500';
    if (pct < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="flex items-center gap-2" title={`${displayPercentage.toFixed(1)}% of pattern space explored`}>
      <svg width="36" height="36" className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/30"
        />
        {/* Progress circle */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={getColor(displayPercentage)}
        />
      </svg>
      <span className={`text-xs font-medium ${getColor(displayPercentage)}`}>
        {displayPercentage.toFixed(0)}% explored
      </span>
    </div>
  );
}

// Map frontend pattern type to API enum
function mapPatternType(frontendType: 'prefix' | 'suffix' | 'both'): 'prefix_variable' | 'suffix_variable' | 'both_variable' {
  switch (frontendType) {
    case 'prefix': return 'prefix_variable';
    case 'suffix': return 'suffix_variable';
    case 'both': return 'both_variable';
  }
}

export function DiscoveryPreviewPanel({
  patternType,
  constantString,
  prefixVariableLength,
  suffixVariableLength,
  characterSet,
  tld,
  enabled = true,
  domainsRequested,
  batchSize
}: DiscoveryPreviewPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DiscoveryPreviewResponse['data'] | null>(null);
  const [lastParams, setLastParams] = useState<string>('');

  useEffect(() => {
    if (!enabled) return;
    
    // Require minimum valid config
    if (!characterSet || characterSet.length === 0) return;
    if (!tld) return;
    
    // Debounce: only fetch if params changed
    const paramsKey = JSON.stringify({ patternType, constantString, prefixVariableLength, suffixVariableLength, characterSet, tld });
    if (paramsKey === lastParams) return;
    
    const timeoutId = setTimeout(async () => {
      setLastParams(paramsKey);
      setLoading(true);
      setError(null);
      
      try {
        const config = new Configuration({ basePath: '/api/v2' });
        const api = new CampaignsApi(config);
        
        const request: DiscoveryPreviewRequest = {
          patternType: mapPatternType(patternType),
          characterSet,
          tld: tld.startsWith('.') ? tld : `.${tld}`,
          constantString: constantString || undefined,
          prefixVariableLength: prefixVariableLength || 0,
          suffixVariableLength: suffixVariableLength || 0,
        };
        
        const response = await api.discoveryPreview(request);
        if (response.data?.success && response.data.data) {
          setData(response.data.data);
        } else {
          setError('Failed to fetch discovery preview');
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
      } finally {
        setLoading(false);
      }
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timeoutId);
  }, [enabled, patternType, constantString, prefixVariableLength, suffixVariableLength, characterSet, tld, lastParams]);

  if (!enabled) return null;
  
  if (loading) {
    return (
      <Card className="mt-4 bg-muted/50">
        <CardContent className="flex items-center gap-2 py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading discovery lineage...</span>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Preview Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }
  
  if (!data) return null;

  const priorCampaigns = data.priorCampaigns ?? [];
  const hasPriorCampaigns = priorCampaigns.length > 0;
  const totalPriorDomains = hasPriorCampaigns 
    ? priorCampaigns.reduce((sum, c) => sum + (c.stats?.domainsGenerated || 0), 0)
    : 0;
  
  // Calculate pattern coverage percentage
  const coveragePercentage = data.totalCombinations > 0 
    ? (data.nextOffset / data.totalCombinations) * 100 
    : 0;

  return (
    <Card className="mt-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <History className="h-4 w-4" />
          Discovery Lineage Preview
          <span 
            className="ml-1 text-muted-foreground cursor-help" 
            title="This campaign continues from prior runs using the same pattern."
          >
            ⓘ
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Config Hash with tooltip */}
        <div className="flex items-start gap-2 text-xs">
          <Hash className="h-3 w-3 mt-0.5 text-muted-foreground" />
          <div>
            <span className="text-muted-foreground">Config Hash: </span>
            <code 
              className="font-mono text-[10px] bg-muted px-1 rounded cursor-help"
              title="This uniquely identifies this pattern. Any change above creates a new hash and resets discovery lineage."
            >
              {data.configHash.slice(0, 16)}...
            </code>
          </div>
        </div>

        {/* Pattern Coverage Indicator */}
        {data.nextOffset > 0 && (
          <div className="flex items-center justify-between">
            <CoverageIndicator percentage={coveragePercentage} />
          </div>
        )}

        {/* Offset Information */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Total Combinations:</span>
            <div className="font-medium">{data.totalCombinations.toLocaleString()}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Next Offset:</span>
            <div className="font-medium flex items-center gap-1">
              <ArrowRight className="h-3 w-3" />
              {data.nextOffset.toLocaleString()}
            </div>
            {/* Offset explanation (P0) */}
            {data.nextOffset > 0 && (
              <p className="text-[10px] text-muted-foreground mt-1">
                This campaign will start generating from the {data.nextOffset.toLocaleString()}th domain in the pattern because earlier ranges were already used.
              </p>
            )}
          </div>
        </div>

        {/* Requested/Batch/Offset relationship (P1) */}
        {domainsRequested && batchSize && (
          <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded flex items-center gap-1">
            <Info className="h-3 w-3" />
            Up to {domainsRequested.toLocaleString()} new unique domains will be generated starting from offset {data.nextOffset.toLocaleString()}, in batches of {batchSize.toLocaleString()}.
          </div>
        )}

        {/* Exhaustion Warning with consequence (P0) */}
        {data.exhaustionWarning && (
          <Alert variant="destructive" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs space-y-1">
              <p><strong>Pattern Exhaustion Warning:</strong> Next offset + typical batch may exceed total combinations.</p>
              <p className="font-medium">Some requested domains may not be generated if the pattern is exhausted.</p>
              <p className="text-muted-foreground">Consider a different character set, longer variable length, or a new constant string.</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Prior Campaigns */}
        {hasPriorCampaigns && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Prior campaigns with this pattern:</span>
              <Badge variant="secondary">{priorCampaigns.length}</Badge>
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {priorCampaigns.slice(0, 5).map((campaign) => (
                <div 
                  key={campaign.id} 
                  className="flex justify-between items-center text-xs bg-muted/50 px-2 py-1 rounded"
                >
                  <span className="truncate max-w-[150px]" title={campaign.name}>
                    {campaign.name}
                  </span>
                  <div className="flex gap-2 text-muted-foreground">
                    <span>{campaign.stats?.domainsGenerated || 0} domains</span>
                    <span>{campaign.stats?.dnsValid || 0} valid</span>
                  </div>
                </div>
              ))}
              {priorCampaigns.length > 5 && (
                <div className="text-xs text-muted-foreground text-center">
                  +{priorCampaigns.length - 5} more campaigns
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              Total prior domains: <strong>{totalPriorDomains.toLocaleString()}</strong>
            </div>
          </div>
        )}

        {/* Empty lineage copy - reassuring message (P1) */}
        {!hasPriorCampaigns && (
          <div className="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-1.5 rounded flex items-center gap-1">
            <Info className="h-3 w-3" />
            This pattern hasn&apos;t been used before. Discovery will start from the beginning.
          </div>
        )}

        {/* Restart contract reminder (P1) */}
        <div className="text-[10px] text-muted-foreground border-t pt-2 mt-2 flex items-start gap-1">
          <Info className="h-3 w-3 shrink-0 mt-0.5" />
          <span>Once created, discovery for this campaign is fixed. Re-running will not regenerate domains.</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default DiscoveryPreviewPanel;
