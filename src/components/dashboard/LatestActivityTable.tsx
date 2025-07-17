
"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CampaignViewModel, LatestDomainActivity, CampaignPhase, DomainActivityStatus, CampaignSelectedType } from '@/lib/types';
import { CAMPAIGN_PHASES_ORDERED } from '@/lib/constants';
import { ScrollArea } from '../ui/scroll-area';
import { CheckCircle, XCircle, Clock, HelpCircle, Search, ShieldQuestion, ExternalLink, Activity, Dna, AlertCircle, ChevronLeft, ChevronRight, Percent, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { campaignsApi } from '@/lib/api-client/client';
import { transformCampaignsToViewModels } from '@/lib/utils/campaignTransforms';
import { useLoadingStore, LOADING_OPERATIONS } from '@/lib/stores/loadingStore';
import { getRichCampaignDataBatch, type RichCampaignData } from '@/lib/services/unifiedCampaignService';
import { type BaseWebSocketMessage } from '@/lib/websocket/message-handlers';
import { type DashboardActivityPayload } from '@/lib/services/websocketService.simple';
import { useInfiniteScrollActivity } from '@/lib/hooks/useInfiniteScroll';
import { PaginationLoadingStates, InfiniteScrollLoader } from '@/components/ui/pagination-loading-states';
import { PaginationErrorBoundary } from '@/components/ui/pagination-error-boundary';

// Type definition for campaign leads
interface CampaignLead {
  sourceUrl?: string;
  name?: string;
  similarityScore?: number;
}

const MAX_ITEMS_DISPLAY_INITIAL_LOAD = 200; // Max items to process for the global table initially
const DEFAULT_PAGE_SIZE_GLOBAL = 50;
const GLOBAL_PAGE_SIZES = [25, 50, 100, 200];


const formatDate = (dateString: string): string => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    // Using a common, unambiguous format. Adjust locale string as needed.
    // Example: 'en-CA' gives YYYY-MM-DD. 'en-US' gives MM/DD/YYYY.
    return date.toLocaleDateString('en-CA'); // Or 'en-US', 'default'
  } catch {
    return 'Invalid Date';
  }
};

// Helper functions to safely access campaign data
const getCampaignDomains = (campaign: CampaignViewModel | RichCampaignData): string[] => {
  return Array.isArray(campaign.domains) ? campaign.domains : [];
};

const getCampaignDnsValidatedDomains = (campaign: CampaignViewModel | RichCampaignData): string[] => {
  return Array.isArray(campaign.dnsValidatedDomains) ? campaign.dnsValidatedDomains : [];
};

const getCampaignLeads = (campaign: CampaignViewModel | RichCampaignData): Array<CampaignLead> => {
  if ('leads' in campaign && Array.isArray(campaign.leads)) {
    return campaign.leads as CampaignLead[];
  }
  return [];
};

// Helper function to determine domain status for the consolidated table
const getGlobalDomainStatusForPhase = (
  domainName: string,
  phase: CampaignPhase,
  campaign: CampaignViewModel | RichCampaignData
): DomainActivityStatus => {
  const selectedType = campaign.selectedType || campaign.campaignType;
  const phasesForType = selectedType ? CAMPAIGN_PHASES_ORDERED[selectedType] : undefined;
  if (!phasesForType || !phase || !phasesForType.includes(phase)) return 'n_a'; // Phase not applicable to this campaign type

  const phaseIndexInType = phasesForType.indexOf(phase);
  const currentCampaignPhaseIndexInType = campaign.currentPhase ? phasesForType.indexOf(campaign.currentPhase) : -1;

  // Check if this domain was validated in this phase
  let validatedInThisPhase = false;
  if (phase === 'dns_validation') {
    const dnsValidatedDomains = getCampaignDnsValidatedDomains(campaign);
    validatedInThisPhase = dnsValidatedDomains.includes(domainName);
  }
  else if (phase === 'http_validation') {
    // For HTTP validation, we check if this domain has successful HTTP keyword results
    const dnsValidatedDomains = getCampaignDnsValidatedDomains(campaign);
    validatedInThisPhase = dnsValidatedDomains.includes(domainName);
  }

  // If validated in this phase, it's validated
  if (validatedInThisPhase) return 'validated' as any;
  // If campaign status is completed, and this phase was part of its flow
  if (campaign.status === 'completed' && phasesForType.includes(phase)) {
     // If it reached here, it means it wasn't in the validated list for this phase
     return 'not_validated' as any;
  }

  // If current campaign phase is past the phase we're checking for this domain,
  // and it wasn't validated, then it's 'Not Validated' for that phase.
  if (currentCampaignPhaseIndexInType > phaseIndexInType || (campaign.currentPhase === phase && campaign.phaseStatus === 'failed')) {
    // Check if this domain *should* have been processed by this phase
    const domains = getCampaignDomains(campaign);
    const dnsValidatedDomains = getCampaignDnsValidatedDomains(campaign);
    
    if (phase === 'dns_validation' && domains.includes(domainName)) return 'not_validated' as any;
    if (phase === 'http_validation' && dnsValidatedDomains.includes(domainName)) return 'not_validated' as any;
    return 'n_a'; // Not applicable or filtered out before even reaching this phase's potential input
  }
  
  // If current campaign phase IS the phase we're checking and it's active
  if (campaign.currentPhase === phase && (campaign.phaseStatus === 'in_progress' || campaign.phaseStatus === 'paused' || campaign.phaseStatus === 'not_started')) {
    return 'Pending' as any;
  }
  
  // If current campaign phase is before the phase we're checking, or campaign is in setup
  if (currentCampaignPhaseIndexInType < phaseIndexInType || campaign.currentPhase === 'setup') {
    const domains = getCampaignDomains(campaign);
    const dnsValidatedDomains = getCampaignDnsValidatedDomains(campaign);
    
    // If the domain was generated (in `campaign.domains`) but not yet DNS validated, it's pending for DNS
    if (phase === 'dns_validation' && domains.includes(domainName)) return 'Pending' as any;
     // If DNS validated but not yet HTTP validated, it's pending for HTTP
    if (phase === 'http_validation' && dnsValidatedDomains.includes(domainName)) return 'Pending' as any;
    return 'Pending'; // General pending for phases not yet reached
  }

  return 'Pending'; // Default catch-all
};


const getGlobalLeadStatusAndScore = (
  domainName: string,
  campaign: CampaignViewModel | RichCampaignData
): { status: DomainActivityStatus; score?: number } => {
    const selectedType = campaign.selectedType || campaign.campaignType;
    const phasesForType = selectedType ? CAMPAIGN_PHASES_ORDERED[selectedType] : undefined;
    if (!phasesForType || !phasesForType.includes('analysis')) return { status: 'n_a' };

    const leadGenPhaseIndex = phasesForType.indexOf('analysis');
    const currentPhaseOrderInType = campaign.currentPhase ? phasesForType.indexOf(campaign.currentPhase) : -1;

    const relevantLeads = getCampaignLeads(campaign).filter(lead => lead.sourceUrl?.includes(domainName) || lead.name?.includes(domainName));
    const hasLeads = relevantLeads.length > 0;
    const score = hasLeads ? relevantLeads[0]?.similarityScore : undefined;


    if (campaign.currentPhase === 'analysis' && campaign.phaseStatus === 'completed') {
        return { status: hasLeads ? 'scanned' : 'no_leads', score };
    }
    // If campaign status is completed, and lead generation was part of its flow
    if (campaign.status === 'completed' && phasesForType && phasesForType.includes('analysis')) {
        // Check if leads exist for this domain from when the LeadGen phase was active
        return { status: hasLeads ? 'scanned' : 'no_leads', score };
    }
    if (campaign.currentPhase === 'analysis' && (campaign.phaseStatus === 'in_progress' || campaign.phaseStatus === 'not_started' || campaign.phaseStatus === 'paused')) {
        return { status: 'Pending', score };
    }
    if (campaign.currentPhase === 'analysis' && campaign.phaseStatus === 'failed') {
        return { status: 'Failed', score };
    }
    // If current campaign phase is before Lead Generation
    if (currentPhaseOrderInType < leadGenPhaseIndex || campaign.currentPhase === 'setup') {
        return { status: 'Pending', score };
    }
    // If current phase is HTTPValidation Succeeded, and LeadGen is next applicable phase
    if (phasesForType && phasesForType[currentPhaseOrderInType] === 'http_keyword_validation' && campaign.phaseStatus === 'completed' && phasesForType[leadGenPhaseIndex] === 'analysis' && leadGenPhaseIndex > currentPhaseOrderInType) {
        return { status: 'Pending', score };
    }


    return { status: 'Pending', score }; // Default if phase not yet active for this domain
};

const getSimilarityBadgeVariant = (score: number | undefined) => {
  if (score === undefined) return "outline"; // For 'N/A' or '-' when score isn't applicable
  if (score > 75) return "default"; // Using ShadCN 'default' which is primary color
  if (score > 50) return "secondary" as any;
  if (score > 25) return "outline"; // More muted for lower scores
  return "destructive"; // For very low scores or if needed
};


const StatusBadge: React.FC<{ status: DomainActivityStatus; score?: number }> = ({ status }) => {
  let Icon;
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  let text: string = status;
  let className = '';

  switch (status) {
    case 'validated':
      Icon = CheckCircle;
      variant = 'default';
      text = 'Validated';
      className = 'bg-green-500 text-white hover:bg-green-600';
      break;
    case 'generating':
      Icon = Dna;
      variant = 'secondary';
      text = 'Generating';
      className = 'bg-blue-500 text-white hover:bg-blue-600';
      break;
    case 'scanned':
      Icon = Search;
      variant = 'default';
      text = 'Scanned';
      className = 'bg-emerald-500 text-white hover:bg-emerald-600';
      break;
    case 'not_validated':
      Icon = XCircle;
      variant = 'destructive';
      text = 'Not Validated';
      className = 'bg-red-500 text-white hover:bg-red-600';
      break;
    case 'Failed':
      Icon = AlertCircle;
      variant = 'destructive';
      text = 'Failed';
      className = 'bg-red-600 text-white hover:bg-red-700';
      break;
    case 'no_leads':
      Icon = ShieldQuestion;
      variant = 'secondary';
      text = 'No Leads';
      className = 'bg-gray-500 text-white hover:bg-gray-600';
      break;
    case 'Pending':
      Icon = Clock;
      variant = 'secondary';
      text = 'Pending';
      className = 'bg-yellow-500 text-black hover:bg-yellow-600';
      break;
    case 'n_a':
      Icon = HelpCircle;
      variant = 'outline';
      text = 'N/A';
      className = 'bg-gray-200 text-gray-600 border-gray-300';
      break;
    default:
      Icon = HelpCircle;
      text = 'Unknown';
      className = 'bg-gray-200 text-gray-600 border-gray-300';
  }

  return (
    <Badge variant={variant} className={`text-xs whitespace-nowrap ${className}`}>
      <Icon className="mr-1 h-3.5 w-3.5" />
      {text}
    </Badge>
  );
};


export default function LatestActivityTable() {
  const [allActivityData, setAllActivityData] = useState<LatestDomainActivity[]>([]);

  // Use centralized loading state
  const { startLoading, stopLoading, isOperationLoading } = useLoadingStore();
  const loading = isOperationLoading(LOADING_OPERATIONS.DATA_FETCH);

  // Infinite scroll load function
  const loadMoreActivity = useCallback(async (page: number, pageSize: number) => {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = allActivityData.slice(startIndex, endIndex);
    
    return {
      data: pageData,
      hasMore: endIndex < allActivityData.length,
      totalCount: allActivityData.length,
    };
  }, [allActivityData]);

  // Use infinite scroll hook for activity feed
  const {
    items: displayedActivities,
    isLoading: infiniteLoading,
    isLoadingMore,
    hasMore,
    error: infiniteError,
    observerRef,
    reset: resetInfiniteScroll,
    retry: retryInfiniteScroll,
    isEmpty,
  } = useInfiniteScrollActivity(loadMoreActivity, [allActivityData]);


  const fetchAndProcessData = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) startLoading(LOADING_OPERATIONS.DATA_FETCH, "Loading dashboard activity");
    try {
      // Use context-aware pagination parameters for activity loading
      const response = await campaignsApi.listCampaigns(50, 0); // Dashboard context uses 50 items
      const processedActivities: LatestDomainActivity[] = [];

      // Handle the Axios response structure: response.data.data.data contains the campaigns array
      // Cast to any to handle the type mismatch between expected array and actual AxiosResponse
      const axiosResponse = response as any;
      
      if (axiosResponse &&
          axiosResponse.data &&
          axiosResponse.data.data &&
          axiosResponse.data.data.data &&
          Array.isArray(axiosResponse.data.data.data)) {
        
        const campaignsArray = transformCampaignsToViewModels(axiosResponse.data.data.data as Parameters<typeof transformCampaignsToViewModels>[0]);
        
        // Get campaign IDs for rich data fetching
        const campaignIds = campaignsArray
          .filter(campaign => campaign.id && campaign.name && campaign.createdAt)
          .map(campaign => campaign.id!)
          .slice(0, 50); // BULK-ONLY STRATEGY: Use enhanced bulk batch sizing for dashboard context

        // Fetch rich data for all campaigns using enhanced BulkCampaignService
        console.log(`[LatestActivityTable] BULK-ONLY: Loading ${campaignIds.length} campaigns via enhanced bulk operations`);
        const richCampaignDataMap = await getRichCampaignDataBatch(campaignIds);

        // Process campaigns with rich data - enhanced for completed campaigns
        campaignsArray.forEach(campaign => {
          if (!campaign.id || !campaign.name || !campaign.createdAt) return;
          
          const richCampaign = richCampaignDataMap.get(campaign.id);
          
          // Enhanced domain extraction - check multiple sources
          let domains: string[] = [];
          
          // Try rich campaign data first
          if (richCampaign?.domains && Array.isArray(richCampaign.domains)) {
            domains = richCampaign.domains;
            console.log(`[LatestActivity] Campaign ${campaign.id} has ${domains.length} domains from rich data`);
          }
          // Fallback to base campaign data
          else if (campaign.domains && Array.isArray(campaign.domains)) {
            domains = campaign.domains;
            console.log(`[LatestActivity] Campaign ${campaign.id} has ${domains.length} domains from base data`);
          }
          // For completed campaigns, try DNS validated domains as another source
          else if (campaign.dnsValidatedDomains && Array.isArray(campaign.dnsValidatedDomains)) {
            domains = campaign.dnsValidatedDomains;
            console.log(`[LatestActivity] Campaign ${campaign.id} has ${domains.length} DNS validated domains`);
          }
          
          console.log(`[LatestActivity] Processing campaign ${campaign.name} (${campaign.currentPhase}): ${domains.length} domains found`);
          
          if (domains.length === 0) {
            // Still show campaign entry even without domains for completed campaigns
            if (campaign.status === 'completed') {
              processedActivities.push({
                id: `${campaign.id}-placeholder`,
                domain: 'No domains found',
                domainName: 'No domains found',
                campaignId: campaign.id!,
                campaignName: campaign.name!,
                phase: campaign.currentPhase || 'Pending',
                status: 'n_a' as const,
                timestamp: campaign.createdAt!,
                activity: 'Campaign completed',
                generatedDate: campaign.createdAt!,
                dnsStatus: 'n_a' as const,
                httpStatus: 'n_a' as const,
                leadScanStatus: 'n_a' as const,
                leadScore: undefined,
                sourceUrl: '#',
              });
            }
            return;
          }

          domains.forEach(domainName => {
            const leadInfo = getGlobalLeadStatusAndScore(domainName, richCampaign || campaign);
            processedActivities.push({
              id: `${campaign.id}-${domainName}`, // Unique ID for the activity row
              domain: domainName,
              domainName,
              campaignId: campaign.id!,
              campaignName: campaign.name!,
              phase: campaign.currentPhase || 'Pending',
              status: getGlobalDomainStatusForPhase(domainName, 'dns_validation', richCampaign || campaign),
              timestamp: campaign.createdAt!,
              activity: 'Domain processing',
              generatedDate: campaign.createdAt!, // Or a more specific date if available per domain
              dnsStatus: getGlobalDomainStatusForPhase(domainName, 'dns_validation', richCampaign || campaign),
              httpStatus: getGlobalDomainStatusForPhase(domainName, 'http_validation', richCampaign || campaign),
              leadScanStatus: leadInfo.status,
              leadScore: leadInfo.score, // Store the score here
              sourceUrl: `http://${domainName}`, // Assuming HTTP for direct link
            });
          });
        });
        
        // Note: Empty array is a valid response, not an error
        if (campaignsArray.length === 0) {
          console.log("No campaigns found - this is normal when no campaigns exist yet");
        }
      } else {
        // Handle valid empty response (axiosResponse.data.data.data exists but is empty array)
        if (axiosResponse &&
            axiosResponse.data &&
            axiosResponse.data.data &&
            axiosResponse.data.data.data &&
            Array.isArray(axiosResponse.data.data.data) &&
            axiosResponse.data.data.data.length === 0) {
          console.log("No campaigns found - this is normal when no campaigns exist yet");
        } else {
          // Only log actual errors, not valid empty responses
          console.error("Invalid response format from campaigns API:", {
            responseType: typeof axiosResponse,
            hasData: !!(axiosResponse && 'data' in axiosResponse),
            hasNestedData: !!(axiosResponse && axiosResponse.data && 'data' in axiosResponse.data),
            hasTripleNestedData: !!(axiosResponse && axiosResponse.data && axiosResponse.data.data && 'data' in axiosResponse.data.data),
            actualStructure: axiosResponse
          });
        }
      }

      // Sort by date, then slice for initial load cap
      const sortedData = processedActivities
        .sort((a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime())
        .slice(0, MAX_ITEMS_DISPLAY_INITIAL_LOAD); // Apply cap after sorting all potential activities

      setAllActivityData(sortedData);
    } catch (error) {
      console.error("Failed to load or process activity data:", error);
       setAllActivityData([]); // Clear on major error
    } finally {
      if (showLoadingSpinner) stopLoading(LOADING_OPERATIONS.DATA_FETCH);
    }
  }, [startLoading, stopLoading]);

  // Handle real-time dashboard activity updates via WebSocket
  const handleDashboardActivity = useCallback((message: BaseWebSocketMessage) => {
    const data = message.data as DashboardActivityPayload;
    if (data && data.campaignId && data.domainName) {
      console.log('[Dashboard] Received real-time activity:', data);
      
      // Create new activity entry
      const newActivity: LatestDomainActivity = {
        id: `${data.campaignId}-${data.domainName}-${Date.now()}`,
        domain: data.domainName,
        domainName: data.domainName,
        campaignId: data.campaignId,
        campaignName: 'Unknown Campaign', // Campaign name not in payload, would need lookup
        phase: data.phase || 'Unknown',
        status: (data.status as DomainActivityStatus) || 'Pending',
        timestamp: data.timestamp || new Date().toISOString(),
        activity: data.activity || 'Domain processing',
        generatedDate: data.timestamp || new Date().toISOString(),
        dnsStatus: (data.phase === 'dns_validation' ? data.status : 'Pending') as DomainActivityStatus,
        httpStatus: (data.phase === 'http_keyword_validation' ? data.status : 'Pending') as DomainActivityStatus,
        leadScanStatus: 'Pending' as DomainActivityStatus, // Lead info not in this payload
        leadScore: undefined, // Lead score not in this payload
        sourceUrl: `http://${data.domainName}`,
      };

      // Update activity data - add new activity and sort by timestamp
      setAllActivityData(prevData => {
        const updatedData = [newActivity, ...prevData]
          .sort((a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime())
          .slice(0, MAX_ITEMS_DISPLAY_INITIAL_LOAD); // Keep within limit
        return updatedData;
      });
    }
  }, []);

  useEffect(() => {
    fetchAndProcessData(); // Initial fetch
    
    let wsCleanup: (() => void) | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const connectWebSocket = async () => {
      try {
        // Import the WebSocket service dynamically to avoid SSR issues
        const { websocketService } = await import('@/lib/services/websocketService.simple');
        
        console.log('[DashboardActivity] Connecting to WebSocket for dashboard activity updates...');
        
        // Connect to WebSocket for dashboard activity updates
        wsCleanup = websocketService.connect('dashboard-activity', {
          onMessage: (message: any) => {
            console.log('[DashboardActivity] WebSocket message received:', message);
            
            // Route dashboard activity messages
            if (message.type === 'dashboard_activity' || message.type === 'campaign_update') {
              handleDashboardActivity(message);
            }
          },
          onConnect: () => {
            console.log('[DashboardActivity] WebSocket connected for dashboard activity push updates');
            // Clear fallback polling when WebSocket connects
            if (fallbackInterval) {
              clearInterval(fallbackInterval);
              fallbackInterval = null;
            }
          },
          onError: (error: any) => {
            console.warn('[DashboardActivity] WebSocket error, implementing fallback polling:', error);
            // Start fallback polling when WebSocket fails
            if (!fallbackInterval) {
              fallbackInterval = setInterval(() => {
                console.log('[DashboardActivity] Fallback: Refreshing data via REST API');
                fetchAndProcessData(false); // Don't show loading spinner for background refresh
              }, 30000); // Poll every 30 seconds
            }
          },
          onDisconnect: () => {
            console.log('[DashboardActivity] WebSocket disconnected, starting fallback polling');
            // Start fallback polling when WebSocket disconnects
            if (!fallbackInterval) {
              fallbackInterval = setInterval(() => {
                console.log('[DashboardActivity] Fallback: Refreshing data via REST API');
                fetchAndProcessData(false); // Don't show loading spinner for background refresh
              }, 30000); // Poll every 30 seconds
            }
          }
        });
        
      } catch (error) {
        console.warn('[DashboardActivity] Failed to connect WebSocket, using fallback polling:', error);
        // Start fallback polling immediately if WebSocket setup fails
        fallbackInterval = setInterval(() => {
          console.log('[DashboardActivity] Fallback: Refreshing data via REST API');
          fetchAndProcessData(false); // Don't show loading spinner for background refresh
        }, 30000); // Poll every 30 seconds
      }
    };

    // Connect WebSocket for real-time updates with fallback
    connectWebSocket();
    
    return () => {
      // Cleanup WebSocket connection
      if (wsCleanup) {
        wsCleanup();
      }
      // Cleanup fallback polling
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [fetchAndProcessData, handleDashboardActivity]);

  // Reset infinite scroll when data changes
  useEffect(() => {
    resetInfiniteScroll();
  }, [allActivityData, resetInfiniteScroll]);

  return (
    <PaginationErrorBoundary>
      <Card className="shadow-xl col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Activity className="mr-2 h-6 w-6 text-primary" /> Latest Domain Activity</CardTitle>
          <CardDescription>
            Overview of the most recently processed domains across your campaigns with infinite scrolling.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaginationLoadingStates
            isLoading={loading}
            error={infiniteError}
            isEmpty={isEmpty && !loading}
            itemName="domain activities"
            onRetry={retryInfiniteScroll}
          >
            <ScrollArea className="h-[400px] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead className="text-center">DNS</TableHead>
                    <TableHead className="text-center">HTTP</TableHead>
                    <TableHead className="text-center">Leads Status</TableHead>
                    <TableHead className="text-center">Lead Score</TableHead>
                    <TableHead>Campaign</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedActivities.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium hover:underline text-primary flex items-center"
                          title={`Visit ${item.domainName}`}
                        >
                          {item.domainName}
                          <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-70" />
                        </a>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(item.generatedDate)}
                      </TableCell>
                      <TableCell className="text-center"><StatusBadge status={item.dnsStatus} /></TableCell>
                      <TableCell className="text-center"><StatusBadge status={item.httpStatus} /></TableCell>
                      <TableCell className="text-center"><StatusBadge status={item.leadScanStatus} /></TableCell>
                      <TableCell className="text-center">
                        {item.leadScore !== undefined ? (
                          <Badge variant={getSimilarityBadgeVariant(item.leadScore)} className="text-xs">
                            <Percent className="mr-1 h-3 w-3" />
                            {item.leadScore}%
                          </Badge>
                        ) : (
                          item.leadScanStatus !== 'n_a' && item.leadScanStatus !== 'Pending' ? <span className="text-xs text-muted-foreground">-</span> : null
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/campaigns/${item.campaignId}?type=${getCampaignTypeFromActivity(item, [])}`} className="text-xs hover:underline text-muted-foreground">
                          {item.campaignName}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Infinite scroll sentinel */}
                  {hasMore && (
                    <TableRow ref={observerRef}>
                      <TableCell colSpan={7} className="text-center py-4">
                        <InfiniteScrollLoader
                          isLoading={isLoadingMore}
                          hasMore={hasMore}
                          error={infiniteError}
                          onRetry={retryInfiniteScroll}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {!hasMore && displayedActivities.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        <InfiniteScrollLoader
                          isLoading={false}
                          hasMore={false}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
            
            {/* Activity count */}
            <div className="mt-4 text-sm text-muted-foreground text-center">
              Showing {displayedActivities.length} of {allActivityData.length} activities
            </div>
          </PaginationLoadingStates>
        </CardContent>
      </Card>
    </PaginationErrorBoundary>
  );
}

// Helper function to determine campaign type from activity, might need refinement based on how you store full campaign objects
// For now, it assumes the activity's campaignName or other properties can help infer it,
// or you might need to cross-reference with a list of all campaigns if available.
function getCampaignTypeFromActivity(activity: LatestDomainActivity, allCampaigns: CampaignViewModel[]): CampaignSelectedType | string {
    // A more robust way would be to have allCampaigns passed in or fetched and then look up by activity.campaignId
    // For simplicity, this is a placeholder. You'd look up campaign.selectedType.
    const campaign = allCampaigns.find(c => c.id === activity.campaignId);
    return campaign?.selectedType || "Unknown";
}
