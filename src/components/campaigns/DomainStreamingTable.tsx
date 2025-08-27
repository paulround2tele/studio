"use client";

import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, RefreshCw } from 'lucide-react';
import type {
  Campaign
} from '@/lib/api-client/models';
import type { GeneratedDomain } from '@/lib/api-client/models/generated-domain';
import { ScrollArea } from '../ui/scroll-area';
import { StatusBadge, type DomainActivityStatus } from '@/components/shared/StatusBadge';
import { LeadScoreDisplay } from '@/components/shared/LeadScoreDisplay';
import { Button } from '@/components/ui/button';
import { useDomainData, useDomainStatusSummary } from '@/hooks/useDomainData';

interface DomainStreamingTableProps {
  campaign: Campaign;
  // Legacy props for backward compatibility - removed unused props
  generatedDomains?: GeneratedDomain[];
  totalDomains?: number;
  loading?: boolean;
  filters?: any;
  onFiltersChange?: (filters: any) => void;
  onDownloadDomains?: (domains: string[], fileNamePrefix: string) => void;
  className?: string;
}

interface EnrichedDomain {
  domainName: string;
  dnsStatus: DomainActivityStatus;
  httpStatus: DomainActivityStatus;
  leadScanStatus: DomainActivityStatus;
  leadScore: number; // 0-100 range
  // Rich domain data from REST API
  dnsIp?: string;
  httpStatusCode?: string;
  httpTitle?: string;
  httpKeywords?: string;
  sourceKeyword?: string;
  sourcePattern?: string;
  tld?: string;
  generatedAt?: string;
}

// Helper functions to safely extract domain data - AGGRESSIVE DEBUGGING
const getCampaignDomainsPhaseAware = (campaign: Campaign): string[] => {
  console.log('🚨 [AGGRESSIVE DEBUG] Full campaign object inspection:', {
    campaignId: campaign.id,
    campaignName: campaign.name,
    currentPhase: campaign.currentPhase,
  phaseStatus: (campaign as any).phaseStatus,
    allKeys: Object.keys(campaign),
  domainsProperty: (campaign as any).domains,
  domainsType: typeof (campaign as any).domains,
  domainsIsArray: Array.isArray((campaign as any).domains),
  domainsLength: Array.isArray((campaign as any).domains) ? (campaign as any).domains.length : 'not array',
    fullCampaignObject: campaign
  });

  // Try EVERY possible domain field in the campaign object
  const possibleDomainFields = [
    'domains', 'generatedDomains', 'dnsValidatedDomains', 'httpValidatedDomains',
    'leads', 'domainList', 'domainNames', 'results', 'items', 'data'
  ];

  for (const fieldName of possibleDomainFields) {
    const fieldValue = (campaign as any)[fieldName];
    console.log(`🚨 [AGGRESSIVE DEBUG] Checking field '${fieldName}':`, {
      exists: fieldName in campaign,
      value: fieldValue,
      type: typeof fieldValue,
      isArray: Array.isArray(fieldValue),
      length: fieldValue?.length
    });

    if (Array.isArray(fieldValue) && fieldValue.length > 0) {
      console.log(`🚨 [AGGRESSIVE DEBUG] Found data in '${fieldName}', examining first few items:`, {
        count: fieldValue.length,
        samples: fieldValue.slice(0, 3),
        firstItemType: typeof fieldValue[0],
        firstItemKeys: typeof fieldValue[0] === 'object' ? Object.keys(fieldValue[0]) : 'not object'
      });

      // Try to extract domains from this field
      const extractedDomains = fieldValue.map((item: any, index: number) => {
        if (typeof item === 'string' && item.includes('.') && !item.includes('[object')) {
          return item;
        }
        if (typeof item === 'object' && item) {
          // Try multiple possible domain name fields
          const domainFields = ['domainName', 'domain', 'name', 'hostname', 'url'];
          for (const domainField of domainFields) {
            if (domainField in item) {
              const domainValue = item[domainField];
              if (typeof domainValue === 'string' && domainValue !== '[object Object]') {
                return domainValue;
              }
            }
          }
        }
        return null;
      }).filter(Boolean);

      if (extractedDomains.length > 0) {
        console.log(`🚨 [AGGRESSIVE DEBUG] Successfully extracted ${extractedDomains.length} domains from '${fieldName}':`, extractedDomains.slice(0, 5));
        return extractedDomains as string[];
      }
    }
  }

  console.log('🚨 [AGGRESSIVE DEBUG] No domains found in any field!');
  return [];
};

// Convert backend status to frontend format - ROBUST STATUS CONVERSION
const convertStatus = (backendStatus?: string): DomainActivityStatus => {
  if (!backendStatus) return 'not_validated' as any;
  const normalized = backendStatus.toLowerCase();
  
  switch (normalized) {
    case 'ok':
    case 'valid':
    case 'resolved':
    case 'validated':
    case 'succeeded':
      return 'validated' as any;
    case 'error':
    case 'invalid':
    case 'unresolved':
    case 'failed':
    case 'timeout':
      return 'Failed' as any;
    case 'pending':
    case 'processing':
    case 'queued':
      return 'Pending' as any;
    case 'generating':
      return 'generating' as any;
    case 'scanned':
      return 'scanned' as any;
    case 'no_leads':
      return 'no_leads' as any;
    case 'match':
      return 'validated' as any; // Lead found/keywords matched
    case 'no match':
    case 'no_match':
      return 'no_leads' as any; // No keywords found
    case 'n_a':
    case 'na':
    case '':
      return 'n_a' as any;
    default:
      return 'not_validated' as any;
  }
};

// Backend-driven status lookup - no fallbacks, trust API data completely
const getDomainStatus = (
  domainName: string,
  campaign: Campaign,
  generatedDomains: GeneratedDomain[],
  statusType: 'dns' | 'http' | 'lead'
): DomainActivityStatus => {
  console.log(`🚀 [BACKEND-DRIVEN] Getting ${statusType} status for domain: ${domainName}`);
  
  // Only use generatedDomains from API - no fallbacks
  if (generatedDomains && Array.isArray(generatedDomains)) {
    const domainObject = generatedDomains.find((d: any) => {
      if (typeof d === 'object' && d && 'domainName' in d) {
        return d.domainName === domainName;
      }
      return false;
    });

    if (domainObject && typeof domainObject === 'object') {
      // Use only the camelCase field names that match API response
      const fieldName = statusType === 'dns' ? 'dnsStatus' :
                       statusType === 'http' ? 'httpStatus' : 'leadStatus';
      
      const statusValue = (domainObject as any)[fieldName];
      
      console.log(`🚀 [BACKEND-DRIVEN] Found ${fieldName} in API data:`, {
        domainName,
        fieldName,
        statusValue,
        domainObject: domainObject
      });
      
      if (statusValue !== undefined && statusValue !== null) {
        return convertStatus(statusValue);
      }
    }
  }

  console.log(`🚀 [BACKEND-DRIVEN] No ${statusType} status found in API data for ${domainName}`);
  return 'Unknown' as any; // Backend-driven: if API doesn't provide it, it's unknown
};

// Get lead score from domain object (UPDATED: handle both camelCase and snake_case)
const getLeadScore = (
  domainName: string,
  campaign: Campaign,
  generatedDomains: GeneratedDomain[]
): number => {
  console.log('🔍 [LEAD SCORE DEBUG] Looking for lead score for domain:', domainName);
  
  // Try generatedDomains prop first (typed auto-generated objects)
  if (generatedDomains && Array.isArray(generatedDomains)) {
    const domainObject = generatedDomains.find((d: GeneratedDomain) => {
      return d.domainName === domainName;
    });

    if (domainObject && domainObject.leadScore !== undefined) {
      const score = Number(domainObject.leadScore);
      const validScore = !isNaN(score) && score >= 0 && score <= 100 ? score : 0;
      console.log('🔍 [LEAD SCORE DEBUG] Found score in generatedDomains:', {
        domainName,
        rawScore: domainObject.leadScore,
        convertedScore: validScore
      });
      return validScore;
    }
  }

  // Try campaign.domains
  const campaignDomains = (campaign as any).domains;
  if (campaignDomains && Array.isArray(campaignDomains)) {
    const domainObject = campaignDomains.find((d: any) => {
      if (typeof d === 'object' && d && ('domainName' in d || 'domain_name' in d)) {
        return d.domainName === domainName || d.domain_name === domainName;
      }
      return false;
    });

    if (domainObject && typeof domainObject === 'object') {
      // Try both camelCase and snake_case field names
      const leadScore = domainObject.leadScore || domainObject.lead_score;
      if (leadScore !== undefined) {
        const score = Number(leadScore);
        const validScore = !isNaN(score) && score >= 0 && score <= 100 ? score : 0;
        console.log('🔍 [LEAD SCORE DEBUG] Found score in campaign.domains:', {
          domainName,
          rawScore: leadScore,
          convertedScore: validScore
        });
        return validScore;
      }
    }
  }

  console.log('🔍 [LEAD SCORE DEBUG] No score found, defaulting to 0 for:', domainName);
  return 0; // Default to 0 if no score found
};


// Domain row component with robust rendering
const DomainRow = React.memo<{ domain: EnrichedDomain }>(function DomainRow({ domain }) {
  // Validate domain name before rendering
  const safedomainName = domain.domainName || 'Unknown Domain';
  
  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="font-medium">
        <div className="space-y-1">
          <a
            href={`https://${safedomainName}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline flex items-center"
          >
            {safedomainName}
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
          {domain.dnsIp && (
            <div className="text-xs text-muted-foreground">
              IP: {domain.dnsIp}
            </div>
          )}
          {domain.sourceKeyword && (
            <div className="text-xs text-muted-foreground">
              Source: {domain.sourceKeyword}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <StatusBadge status={domain.dnsStatus} />
      </TableCell>
      <TableCell className="text-center">
        <div className="space-y-1">
          <StatusBadge status={domain.httpStatus} />
          {domain.httpStatusCode && (
            <div className="text-xs text-muted-foreground">
              {domain.httpStatusCode}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <StatusBadge status={domain.leadScanStatus} />
          {domain.httpTitle && (
            <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={domain.httpTitle}>
              {domain.httpTitle}
            </div>
          )}
          {domain.httpKeywords && (
            <div className="text-xs text-blue-600 truncate max-w-[200px]" title={domain.httpKeywords}>
              Keywords: {domain.httpKeywords}
            </div>
          )}
        </div>
      </TableCell>
      <TableCell className="text-center">
        <LeadScoreDisplay score={domain.leadScore} />
      </TableCell>
    </TableRow>
  );
});
DomainRow.displayName = 'DomainRow';

/**
 * ARCHITECTURAL NOTE: DomainStreamingTable vs LatestActivityTable - POST-REFACTOR
 *
 * DomainStreamingTable (REST API ONLY):
 * - Single campaign focus with prop-based data from REST APIs
 * - Uses generatedDomains from bulk enriched data endpoints
 * - No WebSocket dependencies - pure REST API driven
 * - Performance optimized with React.memo
 * - Domain data fetched via polling or on-demand API calls
 *
 * LatestActivityTable (WebSocket + REST):
 * - Multi-campaign dashboard with limited WebSocket for campaign progress only
 * - Complex getRichCampaignDataBatch integration
 * - WebSocket used only for campaign progress, not domain data
 * - Campaign phase-aware logic with REST API domain data fetching
 *
 * Both components now share identical:
 * - Status conversion logic (convertStatus function)
 * - StatusBadge rendering with score support
 * - Domain extraction patterns (defensive programming)
 * - React.memo performance optimization
 * - REST API domain data consumption patterns
 */
export default function DomainStreamingTable({
  campaign
}: DomainStreamingTableProps) {
  // REFACTORED: Use REST API hook instead of WebSocket streaming
  const {
    domains: apiDomains,
    statusSummary,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    refresh
  } = useDomainData(campaign.id || '', {
    limit: 100,
    enablePolling: true,
    pollingInterval: 10000 // Poll every 10 seconds for updates
  });

  // Transform API domain data to enriched format
  const enrichedDomains: EnrichedDomain[] = useMemo(() => {
    if (!apiDomains || apiDomains.length === 0) {
      return [];
    }

    return apiDomains.map((domain) => {
      const dnsStatus = convertStatus(domain.dnsStatus) || 'not_validated';
      const httpStatus = convertStatus(domain.httpStatus) || 'not_validated';
      const leadStatus = convertStatus(domain.leadStatus) || 'not_validated';
      const leadScore = typeof domain.leadScore === 'string' ? parseFloat(domain.leadScore) || 0 : 0;
      
      console.log('🚀 [REST-API-DRIVEN] Domain data from API:', {
        domainName: domain.domainName,
        dnsStatus: `${domain.dnsStatus} → ${dnsStatus}`,
        httpStatus: `${domain.httpStatus} → ${httpStatus}`,
        leadStatus: `${domain.leadStatus} → ${leadStatus}`,
        leadScore: `${domain.leadScore} → ${leadScore}`
      });

      return {
        domainName: domain.domainName,
        dnsStatus,
        httpStatus,
        leadScanStatus: leadStatus,
        leadScore,
        dnsIp: domain.dnsIp,
        httpStatusCode: domain.httpStatusCode?.toString(),
        httpTitle: domain.httpTitle,
        httpKeywords: domain.httpKeywords,
        sourceKeyword: domain.sourceKeyword,
        sourcePattern: domain.sourcePattern,
        tld: domain.tld,
        generatedAt: domain.createdAt
      };
    });
  }, [apiDomains]);

  if (loading && enrichedDomains.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
        Loading domain data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">Error loading domain data: {error}</p>
        <Button onClick={refresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (enrichedDomains.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="mb-4">No domains found for this campaign</p>
        {statusSummary && (
          <div className="text-sm space-y-1">
            <p>Phase: {statusSummary.currentPhase}</p>
            <p>Status: {statusSummary.phaseStatus}</p>
          </div>
        )}
        <Button onClick={refresh} variant="outline" size="sm" className="mt-4">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold">Domain List</h3>
          {statusSummary && (
            <div className="text-sm text-muted-foreground">
              {statusSummary.summary.total} total domains
            </div>
          )}
        </div>
        <Button onClick={refresh} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <ScrollArea className="h-[400px] rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              <TableHead>Domain & Details</TableHead>
              <TableHead className="text-center">DNS Status</TableHead>
              <TableHead className="text-center">HTTP Status</TableHead>
              <TableHead>Content & Keywords</TableHead>
              <TableHead className="text-center">Lead Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrichedDomains.map(domain => (
              <DomainRow key={domain.domainName} domain={domain} />
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
      
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Showing {enrichedDomains.length} of {total} domains
        </div>
        
        {hasMore && (
          <Button onClick={loadMore} variant="outline" size="sm" disabled={loading}>
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        )}
      </div>

      {statusSummary && (
        <div className="mt-4 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2">Campaign Status</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Phase:</span> {statusSummary.currentPhase}
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span> {statusSummary.phaseStatus}
            </div>
            <div>
              <span className="text-muted-foreground">DNS Validated:</span> {statusSummary.summary.dnsValidated}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}