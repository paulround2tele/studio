
"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { CampaignViewModel, LatestDomainActivity, CampaignPhase, DomainActivityStatus, CampaignSelectedType } from '@/lib/types';
import { CAMPAIGN_PHASES_ORDERED } from '@/lib/constants';
import { ScrollArea } from '../ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, HelpCircle, Search, ShieldQuestion, ExternalLink, Activity, Dna, AlertCircle, ChevronLeft, ChevronRight, Percent } from 'lucide-react';
import Link from 'next/link';
import { campaignsApi } from '@/lib/api-client/client';
import { transformCampaignsToViewModels } from '@/lib/utils/campaignTransforms';
import { useLoadingStore, LOADING_OPERATIONS } from '@/lib/stores/loadingStore';
import { getRichCampaignDataBatch, type RichCampaignData } from '@/lib/services/campaignDataService';
import { type BaseWebSocketMessage } from '@/lib/websocket/message-handlers';
import { type DashboardActivityPayload } from '@/lib/services/websocketService.simple';

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
  if (!phasesForType || !phasesForType.includes(phase)) return 'n_a'; // Phase not applicable to this campaign type

  const phaseIndexInType = phasesForType.indexOf(phase);
  const currentCampaignPhaseIndexInType = campaign.currentPhase ? phasesForType.indexOf(campaign.currentPhase) : -1;

  // Check if this domain was validated in this phase
  let validatedInThisPhase = false;
  if (phase === 'DNSValidation') {
    const dnsValidatedDomains = getCampaignDnsValidatedDomains(campaign);
    validatedInThisPhase = dnsValidatedDomains.includes(domainName);
  }
  else if (phase === 'HTTPValidation') {
    // For HTTP validation, we check if this domain has successful HTTP keyword results
    const dnsValidatedDomains = getCampaignDnsValidatedDomains(campaign);
    validatedInThisPhase = dnsValidatedDomains.includes(domainName);
  }

  // If validated in this phase, it's validated
  if (validatedInThisPhase) return 'validated';

  // If campaign is fully completed, and this phase was part of its flow
  if (campaign.currentPhase === 'Completed' && phasesForType.includes(phase)) {
     // If it reached here, it means it wasn't in the validated list for this phase
     return 'not_validated';
  }

  // If current campaign phase is past the phase we're checking for this domain,
  // and it wasn't validated, then it's 'Not Validated' for that phase.
  if (currentCampaignPhaseIndexInType > phaseIndexInType || (campaign.currentPhase === phase && campaign.phaseStatus === 'Failed')) {
    // Check if this domain *should* have been processed by this phase
    const domains = getCampaignDomains(campaign);
    const dnsValidatedDomains = getCampaignDnsValidatedDomains(campaign);
    
    if (phase === 'DNSValidation' && domains.includes(domainName)) return 'not_validated';
    if (phase === 'HTTPValidation' && dnsValidatedDomains.includes(domainName)) return 'not_validated';
    return 'n_a'; // Not applicable or filtered out before even reaching this phase's potential input
  }
  
  // If current campaign phase IS the phase we're checking and it's active
  if (campaign.currentPhase === phase && (campaign.phaseStatus === 'InProgress' || campaign.phaseStatus === 'Paused' || campaign.phaseStatus === 'Pending')) {
    return 'pending';
  }
  
  // If current campaign phase is before the phase we're checking, or campaign is Idle
  if (currentCampaignPhaseIndexInType < phaseIndexInType || campaign.currentPhase === 'Idle') {
    const domains = getCampaignDomains(campaign);
    const dnsValidatedDomains = getCampaignDnsValidatedDomains(campaign);
    
    // If the domain was generated (in `campaign.domains`) but not yet DNS validated, it's pending for DNS
    if (phase === 'DNSValidation' && domains.includes(domainName)) return 'pending';
     // If DNS validated but not yet HTTP validated, it's pending for HTTP
    if (phase === 'HTTPValidation' && dnsValidatedDomains.includes(domainName)) return 'pending';

    return 'pending'; // General pending for phases not yet reached
  }

  return 'pending'; // Default catch-all
};


const getGlobalLeadStatusAndScore = (
  domainName: string,
  campaign: CampaignViewModel | RichCampaignData
): { status: DomainActivityStatus; score?: number } => {
    const selectedType = campaign.selectedType || campaign.campaignType;
    const phasesForType = selectedType ? CAMPAIGN_PHASES_ORDERED[selectedType] : undefined;
    if (!phasesForType || !phasesForType.includes('LeadGeneration')) return { status: 'n_a' };

    const leadGenPhaseIndex = phasesForType.indexOf('LeadGeneration');
    const currentPhaseOrderInType = campaign.currentPhase ? phasesForType.indexOf(campaign.currentPhase) : -1;

    const relevantLeads = getCampaignLeads(campaign).filter(lead => lead.sourceUrl?.includes(domainName) || lead.name?.includes(domainName));
    const hasLeads = relevantLeads.length > 0;
    const score = hasLeads ? relevantLeads[0]?.similarityScore : undefined;


    if (campaign.currentPhase === 'LeadGeneration' && campaign.phaseStatus === 'Succeeded') {
        return { status: hasLeads ? 'scanned' : 'no_leads', score };
    }
    // If campaign is fully completed, and lead generation was part of its flow
    if (campaign.currentPhase === 'Completed' && phasesForType && phasesForType.includes('LeadGeneration')) {
        // Check if leads exist for this domain from when the LeadGen phase was active
        return { status: hasLeads ? 'scanned' : 'no_leads', score };
    }
    if (campaign.currentPhase === 'LeadGeneration' && (campaign.phaseStatus === 'InProgress' || campaign.phaseStatus === 'Pending' || campaign.phaseStatus === 'Paused')) {
        return { status: 'pending', score };
    }
    if (campaign.currentPhase === 'LeadGeneration' && campaign.phaseStatus === 'Failed') {
        return { status: 'failed', score };
    }
    // If current campaign phase is before Lead Generation
    if (currentPhaseOrderInType < leadGenPhaseIndex || campaign.currentPhase === 'Idle') {
        return { status: 'pending', score };
    }
    // If current phase is HTTPValidation Succeeded, and LeadGen is next applicable phase
    if (phasesForType && phasesForType[currentPhaseOrderInType] === 'HTTPValidation' && campaign.phaseStatus === 'Succeeded' && phasesForType[leadGenPhaseIndex] === 'LeadGeneration' && leadGenPhaseIndex > currentPhaseOrderInType) {
        return { status: 'pending', score };
    }


    return { status: 'pending', score }; // Default if phase not yet active for this domain
};

const getSimilarityBadgeVariant = (score: number | undefined) => {
  if (score === undefined) return "outline"; // For 'N/A' or '-' when score isn't applicable
  if (score > 75) return "default"; // Using ShadCN 'default' which is primary color
  if (score > 50) return "secondary";
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
    case 'failed':
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
    case 'pending':
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
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE_GLOBAL);

  // Use centralized loading state
  const { startLoading, stopLoading, isOperationLoading } = useLoadingStore();
  const loading = isOperationLoading(LOADING_OPERATIONS.DATA_FETCH);


  const fetchAndProcessData = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) startLoading(LOADING_OPERATIONS.DATA_FETCH, "Loading dashboard activity");
    try {
      const response = await campaignsApi.listCampaigns();
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
          .slice(0, 10); // Limit to first 10 campaigns for performance

        // Fetch rich data for all campaigns
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
            if (campaign.currentPhase === 'Completed') {
              processedActivities.push({
                id: `${campaign.id}-placeholder`,
                domain: 'No domains found',
                domainName: 'No domains found',
                campaignId: campaign.id!,
                campaignName: campaign.name!,
                phase: campaign.currentPhase || 'Idle',
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
              phase: campaign.currentPhase || 'Idle',
              status: getGlobalDomainStatusForPhase(domainName, 'DNSValidation', richCampaign || campaign),
              timestamp: campaign.createdAt!,
              activity: 'Domain processing',
              generatedDate: campaign.createdAt!, // Or a more specific date if available per domain
              dnsStatus: getGlobalDomainStatusForPhase(domainName, 'DNSValidation', richCampaign || campaign),
              httpStatus: getGlobalDomainStatusForPhase(domainName, 'HTTPValidation', richCampaign || campaign),
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
        status: (data.status as DomainActivityStatus) || 'pending',
        timestamp: data.timestamp || new Date().toISOString(),
        activity: data.activity || 'Domain processing',
        generatedDate: data.timestamp || new Date().toISOString(),
        dnsStatus: (data.phase === 'DNSValidation' ? data.status : 'pending') as DomainActivityStatus,
        httpStatus: (data.phase === 'HTTPValidation' ? data.status : 'pending') as DomainActivityStatus,
        leadScanStatus: 'pending' as DomainActivityStatus, // Lead info not in this payload
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

  // Pagination logic
  const totalActivities = allActivityData.length; // This is now the length of the capped & sorted list
  const totalPages = Math.ceil(totalActivities / pageSize);
  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return allActivityData.slice(startIndex, startIndex + pageSize);
  }, [allActivityData, currentPage, pageSize]);

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1); // Reset to first page when page size changes
  };

  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  if (loading) {
    return (
      <Card className="shadow-lg col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Activity className="mr-2 h-6 w-6 text-primary" /> Latest Domain Activity</CardTitle>
          <CardDescription>Loading recent domain intelligence updates...</CardDescription>
        </CardHeader>
        <CardContent>
          {/* You can use a Skeleton loader here for better UX */}
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            <Clock className="mr-2 h-5 w-5 animate-spin" /> Loading data...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (allActivityData.length === 0) {
     return (
      <Card className="shadow-lg col-span-1 md:col-span-2 lg:col-span-3">
        <CardHeader>
          <CardTitle className="text-xl flex items-center"><Activity className="mr-2 h-6 w-6 text-primary" /> Latest Domain Activity</CardTitle>
          <CardDescription>Overview of the most recently processed domains across your campaigns.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No domain activity to display yet. Start a campaign!</p>
        </CardContent>
      </Card>
    );
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalActivities);

  return (
    <Card className="shadow-xl col-span-1 md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-xl flex items-center"><Activity className="mr-2 h-6 w-6 text-primary" /> Latest Domain Activity</CardTitle>
        <CardDescription>
          Overview of the most recently processed domains across your campaigns (showing up to {MAX_ITEMS_DISPLAY_INITIAL_LOAD} most recent).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[350px] w-full"> {/* Adjust height as needed */}
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
              {paginatedActivities.map((item) => (
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
                      // Show a dash if lead scan was attempted but no score (e.g., No Leads, Failed, or N/A from lead scan)
                      // but not if it's still Pending for lead scan
                      item.leadScanStatus !== 'n_a' && item.leadScanStatus !== 'pending' ? <span className="text-xs text-muted-foreground">-</span> : null
                    )}
                  </TableCell>
                  <TableCell>
                    <Link href={`/campaigns/${item.campaignId}?type=${getCampaignTypeFromActivity(item, [])}`} className="text-xs hover:underline text-muted-foreground">
                      {item.campaignName}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
               {paginatedActivities.length === 0 && totalActivities > 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">No domains on this page.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
        {/* Pagination Controls */}
        <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Rows per page:</span>
                <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                    <SelectTrigger className="w-[70px] h-8 text-xs">
                        <SelectValue placeholder={pageSize} />
                    </SelectTrigger>
                    <SelectContent>
                        {GLOBAL_PAGE_SIZES.map(size => (
                            <SelectItem key={size} value={String(size)} className="text-xs">{size}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                 <span>Showing {totalActivities > 0 ? startItem : 0}-{endItem} of {totalActivities}</span>
            </div>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                    className="h-8"
                >
                    <ChevronLeft className="h-4 w-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Previous</span>
                </Button>
                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages > 0 ? totalPages : 1}</span>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="h-8"
                >
                   <span className="hidden sm:inline">Next</span> <ChevronRight className="h-4 w-4 ml-1 sm:ml-2" />
                </Button>
            </div>
        </div>
      </CardContent>
    </Card>
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
