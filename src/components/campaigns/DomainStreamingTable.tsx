"use client";

import React, { useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink } from 'lucide-react';
import type {
  CampaignViewModel,
  CampaignValidationItem
} from '@/lib/types';
import type { GeneratedDomain } from '@/lib/api-client';
import { ScrollArea } from '../ui/scroll-area';
import { StatusBadge, type DomainActivityStatus } from '@/components/shared/StatusBadge';
import { LeadScoreDisplay } from '@/components/shared/LeadScoreDisplay';

interface DomainStreamingTableProps {
  campaign: CampaignViewModel;
  generatedDomains: GeneratedDomain[];
  dnsCampaignItems: CampaignValidationItem[];
  httpCampaignItems: CampaignValidationItem[];
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
  // Rich domain data from GeneratedDomain
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
const getCampaignDomainsPhaseAware = (campaign: CampaignViewModel): string[] => {
  console.log('🚨 [AGGRESSIVE DEBUG] Full campaign object inspection:', {
    campaignId: campaign.id,
    campaignName: campaign.name,
    currentPhase: campaign.currentPhase,
    phaseStatus: campaign.phaseStatus,
    allKeys: Object.keys(campaign),
    domainsProperty: campaign.domains,
    domainsType: typeof campaign.domains,
    domainsIsArray: Array.isArray(campaign.domains),
    domainsLength: Array.isArray(campaign.domains) ? campaign.domains.length : 'not array',
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
  campaign: CampaignViewModel,
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
  campaign: CampaignViewModel,
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
 * ARCHITECTURAL NOTE: DomainStreamingTable vs LatestActivityTable
 *
 * DomainStreamingTable:
 * - Single campaign focus with prop-based data
 * - Uses generatedDomains + campaign.domains fallback
 * - Simplified lead processing (mock logic)
 * - No real-time updates (static display)
 * - Performance optimized with React.memo
 *
 * LatestActivityTable:
 * - Multi-campaign dashboard with API + WebSocket
 * - Complex getRichCampaignDataBatch integration
 * - Full getGlobalLeadStatusAndScore processing
 * - Real-time WebSocket updates with fallback polling
 * - Campaign phase-aware logic with CAMPAIGN_PHASES_ORDERED
 *
 * Both components now share identical:
 * - Status conversion logic (convertStatus function)
 * - StatusBadge rendering with score support
 * - Domain extraction patterns (defensive programming)
 * - React.memo performance optimization
 */
export default function DomainStreamingTable({
  campaign,
  generatedDomains,
  dnsCampaignItems,
  httpCampaignItems
}: DomainStreamingTableProps) {

  const enrichedDomains = useMemo((): EnrichedDomain[] => {
    // 🚀 TRULY BACKEND-DRIVEN: Use API response exactly as provided
    console.log('🚀 [BACKEND-DRIVEN] Using API response directly:', {
      count: generatedDomains?.length || 0,
      firstDomain: generatedDomains?.[0]
    });
    
    if (!Array.isArray(generatedDomains) || generatedDomains.length === 0) {
      console.log('🚀 [BACKEND-DRIVEN] No domains in API response');
      return [];
    }

    // Use domain objects directly from API - no extraction, no helper functions
    return generatedDomains.map((domainObject: any) => {
      console.log('🚀 [BACKEND-DRIVEN] Processing domain object from API:', domainObject);
      
      // Use API fields directly - trust the backend completely
      const domainName = domainObject.domainName || 'Unknown';
      const dnsStatus = convertStatus(domainObject.dnsStatus) || 'Unknown';
      const httpStatus = convertStatus(domainObject.httpStatus) || 'Unknown';
      const leadStatus = convertStatus(domainObject.leadStatus) || 'Unknown';
      const leadScore = typeof domainObject.leadScore === 'number' ? domainObject.leadScore : 0;
      
      console.log('🚀 [BACKEND-DRIVEN] Direct API mapping:', {
        domainName,
        dnsStatus: `${domainObject.dnsStatus} → ${dnsStatus}`,
        httpStatus: `${domainObject.httpStatus} → ${httpStatus}`,
        leadStatus: `${domainObject.leadStatus} → ${leadStatus}`,
        leadScore: `${domainObject.leadScore} → ${leadScore}`
      });

      return {
        domainName,
        dnsStatus,
        httpStatus,
        leadScanStatus: leadStatus,
        leadScore
      };
    });
  }, [generatedDomains]); // Only depend on API data

  if (enrichedDomains.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        No domains found for this campaign
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
      
      <div className="text-sm text-muted-foreground">
        Total domains: {enrichedDomains.length}
      </div>
    </div>
  );
}