
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { CampaignViewModel, LatestDomainActivity, CampaignPhase, DomainActivityStatus, CampaignSelectedType } from '@/lib/types';
import { CAMPAIGN_PHASES_ORDERED } from '@/lib/constants';
import { ScrollArea } from '../ui/scroll-area';
import { ExternalLink, Activity } from 'lucide-react';
import Link from 'next/link';
import { campaignsApi } from '@/lib/api-client/client';
import { transformCampaignsToViewModels } from '@/lib/utils/campaignTransforms';
// THIN CLIENT: Removed LoadingStore - backend handles loading state via WebSocket
// REMOVED: Legacy unifiedCampaignService deleted during cleanup - using standalone services
// import { getRichCampaignDataBatch, type RichCampaignData } from '@/lib/services/unifiedCampaignService';
type RichCampaignData = any; // Placeholder for legacy cleanup period
import { type BaseWebSocketMessage } from '@/lib/websocket/message-handlers';
import { type DashboardActivityPayload } from '@/lib/services/websocketService.simple';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LeadScoreDisplay } from '@/components/shared/LeadScoreDisplay';

// Type definition for campaign leads
interface CampaignLead {
  sourceUrl?: string;
  name?: string;
  similarityScore?: number;
}

const MAX_ITEMS_DISPLAY_INITIAL_LOAD = 200; // Max items to process for the global table initially


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

// Helper functions to safely access campaign data - ROBUST DATA HANDLING
const getCampaignDomains = (campaign: CampaignViewModel | RichCampaignData): string[] => {
  if (!Array.isArray(campaign.domains)) return [];
  
  return campaign.domains.map((domain: any) => {
    if (typeof domain === 'string') return domain;
    if (typeof domain === 'object' && domain && 'domainName' in domain) {
      return domain.domainName;
    }
    return String(domain); // Fallback for unexpected formats
  }).filter(Boolean); // Remove any empty/falsy values
};

const getCampaignDnsValidatedDomains = (campaign: CampaignViewModel | RichCampaignData): string[] => {
  if (!Array.isArray(campaign.dnsValidatedDomains)) return [];
  
  return campaign.dnsValidatedDomains.map((domain: any) => {
    if (typeof domain === 'string') return domain;
    if (typeof domain === 'object' && domain && 'domainName' in domain) {
      return domain.domainName;
    }
    return String(domain); // Fallback for unexpected formats
  }).filter(Boolean); // Remove any empty/falsy values
};

const getCampaignHTTPKeywordValidatedDomains = (campaign: CampaignViewModel | RichCampaignData): string[] => {
  if ('leads' in campaign && Array.isArray(campaign.leads)) {
    return campaign.leads.map((lead: any) => String(lead)).filter(Boolean);
  }
  return [];
};

const getCampaignLeads = (campaign: CampaignViewModel | RichCampaignData): Array<CampaignLead> => {
  if ('leads' in campaign && Array.isArray(campaign.leads)) {
    return campaign.leads as CampaignLead[];
  }
  return [];
};

// Helper function to determine domain status for the consolidated table - AUTHORITATIVE SOURCE
const getGlobalDomainStatusForPhase = (
  domainName: string,
  phase: CampaignPhase,
  campaign: CampaignViewModel | RichCampaignData
): DomainActivityStatus => {
  // Primary: Read actual domain status from GeneratedDomain objects
  const generatedDomains = (campaign as any).domains;
  if (generatedDomains && Array.isArray(generatedDomains)) {
    const domainObject = generatedDomains.find((d: any) =>
      (typeof d === 'object' && d.domainName === domainName) ||
      (typeof d === 'string' && d === domainName)
    );
    
    if (domainObject && typeof domainObject === 'object') {
      // Convert backend status to frontend format - COMPLETE STATUS MAPPING
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
          case 'n_a':
          case 'na':
          case '':
            return 'n_a' as any;
          default:
            return 'not_validated' as any;
        }
      };
      
      // Return the actual status from the domain object
      if (phase === 'dns_validation' && domainObject.dnsStatus) {
        return convertStatus(domainObject.dnsStatus);
      }
      if (phase === 'http_keyword_validation' && domainObject.httpStatus) {
        return convertStatus(domainObject.httpStatus);
      }
    }
  }
  
  // Fallback: Use campaign phase logic
  const domains = getCampaignDomains(campaign);
  const selectedType = campaign.selectedType || campaign.currentPhase;
  const phasesForType = selectedType ? CAMPAIGN_PHASES_ORDERED[selectedType] : undefined;
  if (!phasesForType || !phase || !phasesForType.includes(phase)) return 'n_a';

  const phaseIndexInType = phasesForType.indexOf(phase);
  const currentCampaignPhaseIndexInType = campaign.currentPhase ? phasesForType.indexOf(campaign.currentPhase) : -1;

  // Check if this domain was validated in this phase
  let validatedInThisPhase = false;
  if (phase === 'dns_validation') {
    const dnsValidatedDomains = getCampaignDnsValidatedDomains(campaign);
    validatedInThisPhase = dnsValidatedDomains.includes(domainName);
  } else if (phase === 'http_keyword_validation') {
    const dnsValidatedDomains = getCampaignDnsValidatedDomains(campaign);
    validatedInThisPhase = dnsValidatedDomains.includes(domainName);
  }

  if (validatedInThisPhase) return 'validated' as any;
  
  if (campaign.currentPhase === phase && (campaign.phaseStatus === 'in_progress' || campaign.phaseStatus === 'paused' || campaign.phaseStatus === 'not_started')) {
    return 'Pending' as any;
  }
  
  if (currentCampaignPhaseIndexInType < phaseIndexInType) {
    if (domains.includes(domainName)) return 'Pending' as any;
    return 'n_a';
  }

  if (currentCampaignPhaseIndexInType > phaseIndexInType || (campaign.currentPhase === phase && campaign.phaseStatus === 'failed')) {
    if (domains.includes(domainName)) return 'not_validated' as any;
    return 'n_a';
  }
  
  if (campaign.phaseStatus === 'completed' && phasesForType.includes(phase)) {
     return 'not_validated' as any;
  }

  return 'Pending';
};


// Backend-driven status lookup for LatestActivityTable - no fallbacks
const getDomainStatusForLatestActivity = (
  domainName: string,
  generatedDomains: any[],
  statusType: 'dns' | 'http' | 'lead'
): DomainActivityStatus => {
  console.log(`🚀 [LAT BACKEND-DRIVEN] Getting ${statusType} status for domain: ${domainName}`);
  
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
      
      console.log(`🚀 [LAT BACKEND-DRIVEN] Found ${fieldName} in API data:`, {
        domainName,
        fieldName,
        statusValue,
        domainObject: domainObject
      });
      
      if (statusValue !== undefined && statusValue !== null) {
        // Convert backend status to frontend format
        const convertStatus = (backendStatus?: string): DomainActivityStatus => {
          if (!backendStatus) return 'Unknown' as any;
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
            case 'match':
              return 'validated' as any; // Lead found/keywords matched
            case 'no match':
            case 'no_match':
              return 'no_leads' as any; // No keywords found
            default:
              return 'Unknown' as any;
          }
        };
        return convertStatus(statusValue);
      }
    }
  }
  
  console.log(`🚀 [LAT BACKEND-DRIVEN] No ${statusType} status found in API data for ${domainName}`);
  return 'Unknown' as any; // Backend-driven: if API doesn't provide it, it's unknown
};

// Backend-driven lead score lookup for LatestActivityTable - no fallbacks
const getLeadScoreForLatestActivity = (
  domainName: string,
  generatedDomains: any[]
): number => {
  console.log(`🚀 [LAT LEAD SCORE] Getting lead score for domain: ${domainName}`);
  
  // Only use generatedDomains from API - no fallbacks
  if (generatedDomains && Array.isArray(generatedDomains)) {
    const domainObject = generatedDomains.find((d: any) => {
      if (typeof d === 'object' && d && 'domainName' in d) {
        return d.domainName === domainName;
      }
      return false;
    });

    if (domainObject && typeof domainObject === 'object') {
      // Use only the camelCase field name that matches API response
      const leadScore = domainObject.leadScore;
      
      console.log(`🚀 [LAT LEAD SCORE] Found leadScore in API data:`, {
        domainName,
        leadScore,
        domainObject: domainObject
      });
      
      if (leadScore !== undefined && leadScore !== null) {
        const score = Number(leadScore);
        const validScore = !isNaN(score) && score >= 0 && score <= 100 ? score : 0;
        console.log(`🚀 [LAT LEAD SCORE] Converted score:`, leadScore, '→', validScore);
        return validScore;
      }
    }
  }

  console.log(`🚀 [LAT LEAD SCORE] No lead score found in API data for ${domainName}`);
  return 0; // Backend-driven: if API doesn't provide it, score is 0
};

const getGlobalLeadStatusAndScore = (
  domainName: string,
  campaign: CampaignViewModel | RichCampaignData
): { status: DomainActivityStatus; score?: number } => {
    // Use the working logic from DomainStreamingTable
    const generatedDomains = (campaign as any).domains;
    const status = getDomainStatusForLatestActivity(domainName, generatedDomains, 'lead');
    const score = getLeadScoreForLatestActivity(domainName, generatedDomains);
    
    return {
      status,
      score: score > 0 ? score : undefined
    };
};

const getSimilarityBadgeVariant = (score: number | undefined) => {
  if (score === undefined) return "outline"; // For 'N/A' or '-' when score isn't applicable
  if (score > 75) return "default"; // Using ShadCN 'default' which is primary color
  if (score > 50) return "secondary" as any;
  if (score > 25) return "outline"; // More muted for lower scores
  return "destructive"; // For very low scores or if needed
};




export default function LatestActivityTable() {
  const [allActivityData, setAllActivityData] = useState<LatestDomainActivity[]>([]);

  // Use centralized loading state
  // THIN CLIENT: Removed LoadingStore - simple loading states only
  const [loading, setLoading] = useState(false);

  // Simple pagination - show all activities
  const displayedActivities = allActivityData;


  const fetchAndProcessData = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      // Use context-aware pagination parameters for activity loading
      // TEMPORARY: Dashboard disabled during legacy cleanup - only standalone services remain
      // const response = await campaignsApi.listCampaigns(50, 0); // Dashboard context uses 50 items
      const response = { data: { data: { data: [] } } }; // Mock empty response for cleanup period
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
        // TEMPORARY: Legacy getRichCampaignDataBatch disabled during cleanup - using empty data
        const richCampaignDataMap = new Map(); // Mock empty data for cleanup period

        // Process campaigns with rich data - enhanced for completed campaigns
        campaignsArray.forEach(campaign => {
          if (!campaign.id || !campaign.name || !campaign.createdAt) return;
          
          const richCampaign = richCampaignDataMap.get(campaign.id);
          
          // 🚀 TRULY BACKEND-DRIVEN: Use unified API response directly
          console.log(`🚀 [LAT BACKEND-DRIVEN] Processing campaign ${campaign.name}:`, {
            hasRichData: !!richCampaign,
            richCampaign: richCampaign
          });
          
          // Use domains directly from unified API response (richCampaign.domains)
          const apiDomains = richCampaign?.domains || [];
          
          if (!Array.isArray(apiDomains) || apiDomains.length === 0) {
            console.log(`🚀 [LAT BACKEND-DRIVEN] No domains in API response for campaign ${campaign.id}`);
            // Only show placeholder for completed campaigns if no API data
            if (campaign.phaseStatus === 'completed') {
              processedActivities.push({
                id: `${campaign.id}-placeholder`,
                domain: 'No domains found',
                domainName: 'No domains found',
                campaignId: campaign.id!,
                campaignName: campaign.name!,
                phase: campaign.currentPhase || 'Pending',
                status: 'not_validated' as const,
                timestamp: campaign.createdAt!,
                activity: 'Campaign completed',
                generatedDate: campaign.createdAt!,
                dnsStatus: 'not_validated' as const,
                httpStatus: 'not_validated' as const,
                leadScanStatus: 'not_validated' as const,
                leadScore: undefined,
                sourceUrl: '#',
              });
            }
            return;
          }

          // Process each domain object directly from API
          apiDomains.forEach((domainObject: any) => {
            console.log(`🚀 [LAT BACKEND-DRIVEN] Processing domain object:`, domainObject);
            
            // Convert backend status to frontend format - using function from DomainStreamingTable
            const convertBackendStatus = (backendStatus?: string): DomainActivityStatus => {
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
                case 'match':
                  return 'validated' as any; // Lead found/keywords matched
                case 'no match':
                case 'no_match':
                  return 'no_leads' as any; // No keywords found
                default:
                  return 'not_validated' as any;
              }
            };
            
            const domainName = domainObject.domainName || 'Unknown';
            const dnsStatus = convertBackendStatus(domainObject.dnsStatus);
            const httpStatus = convertBackendStatus(domainObject.httpStatus);
            const leadStatus = convertBackendStatus(domainObject.leadStatus);
            const leadScore = typeof domainObject.leadScore === 'number' ? domainObject.leadScore : 0;
            
            console.log(`🚀 [LAT BACKEND-DRIVEN] Direct API field mapping:`, {
              domainName,
              dnsStatus: `${domainObject.dnsStatus} → ${dnsStatus}`,
              httpStatus: `${domainObject.httpStatus} → ${httpStatus}`,
              leadStatus: `${domainObject.leadStatus} → ${leadStatus}`,
              leadScore: `${domainObject.leadScore} → ${leadScore}`
            });
            
            processedActivities.push({
              id: `${campaign.id}-${domainName}`,
              domain: domainName,
              domainName,
              campaignId: campaign.id!,
              campaignName: campaign.name!,
              phase: campaign.currentPhase || 'Pending',
              status: dnsStatus, // Use API data directly
              timestamp: campaign.createdAt!,
              activity: 'Domain processing',
              generatedDate: campaign.createdAt!,
              dnsStatus: dnsStatus, // Use API data directly
              httpStatus: httpStatus, // Use API data directly
              leadScanStatus: leadStatus, // Use API data directly
              leadScore: leadScore, // Use API data directly
              sourceUrl: `http://${domainName}`,
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
      if (showLoadingSpinner) setLoading(false);
    }
  }, []);

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

  return (
    <Card className="shadow-xl col-span-1 md:col-span-2 lg:col-span-3">
      <CardHeader>
        <CardTitle className="text-xl flex items-center"><Activity className="mr-2 h-6 w-6 text-primary" /> Latest Domain Activity</CardTitle>
        <CardDescription>
          Overview of the most recently processed domains across your campaigns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground">Loading domain activities...</div>
          </div>
        ) : displayedActivities.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-sm text-muted-foreground">No domain activities found</div>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[400px] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Generated</TableHead>
                    <TableHead className="text-center">DNS</TableHead>
                    <TableHead className="text-center">HTTP</TableHead>
                    <TableHead className="text-center">Lead Status</TableHead>
                    <TableHead className="text-center">Lead Score</TableHead>
                    <TableHead>Campaign</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedActivities.map((item: LatestDomainActivity) => (
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
                        <LeadScoreDisplay score={item.leadScore} />
                      </TableCell>
                      <TableCell>
                        <Link href={`/campaigns/${item.campaignId}?type=${getCampaignTypeFromActivity(item, [])}`} className="text-xs hover:underline text-muted-foreground">
                          {item.campaignName}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
            
            {/* Activity count */}
            <div className="mt-4 text-sm text-muted-foreground text-center">
              Showing {displayedActivities.length} activities
            </div>
          </>
        )}
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
