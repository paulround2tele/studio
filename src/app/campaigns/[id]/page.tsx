"use client";

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import CampaignProgress from '@/components/campaigns/CampaignProgress';
import ContentSimilarityView from '@/components/campaigns/ContentSimilarityView';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Campaign, CampaignViewModel, CampaignStatus, StartCampaignPhasePayload, CampaignDomainDetail, DomainActivityStatus, CampaignValidationItem, GeneratedDomain, CampaignType } from '@/lib/types';
import { CAMPAIGN_PHASES_ORDERED, getFirstPhase } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Briefcase, Dna, Network, Globe, Play, RefreshCw, CheckCircle, Download, PauseCircle, PlayCircle, StopCircle, HelpCircle, Search, ShieldQuestion, ExternalLink, XCircle, Clock, Loader2, ChevronLeft, ChevronRight, Percent } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  getCampaignById,
  getGeneratedDomainsForCampaign,
  getDnsCampaignDomains,
  getHttpCampaignItems,
  startCampaignPhase,
  pauseCampaign,
  resumeCampaign,
  stopCampaign
} from '@/lib/api-client/client';
import { transformCampaignToViewModel } from '@/lib/utils/campaignTransforms';
import { websocketService } from '@/lib/services/websocketService.simple';
import PhaseGateButton from '@/components/campaigns/PhaseGateButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLoadingStore } from '@/lib/stores/loadingStore';


const phaseIcons: Record<CampaignType, LucideIcon> = {
  domain_generation: Dna,
  dns_validation: Network,
  http_keyword_validation: Globe,
};

const phaseDisplayNames: Record<CampaignType, string> = {
  domain_generation: "Domain Generation",
  dns_validation: "DNS Validation",
  http_keyword_validation: "HTTP Validation",
};

// Updated helper to get status based on item data
const getDomainStatusFromItem = (itemStatus: CampaignStatus | string | undefined): DomainActivityStatus => {
  switch (itemStatus?.toLowerCase()) {
    case 'resolved': // For DNS
    case 'validated': // General term, or from HTTP if it uses this
    case 'lead_valid': // For HTTP/Keyword
    case 'http_valid_no_keywords': // For HTTP/Keyword
    case 'succeeded': // General completion from item
      return 'validated';
    case 'scanned': // Specific for LeadGen if leads were found
        return 'scanned';
    case 'no_leads': // Specific for LeadGen
        return 'no_leads';
    case 'unresolved': // For DNS
    case 'invalid_http_response_error': // For HTTP/Keyword
    case 'invalid_http_code': // For HTTP/Keyword
    case 'failed': // General failure
      return 'failed';
    case 'not found': // DNS
      return 'not_validated';
    case 'pending':
    case 'processing':
    case 'queued':
    case 'active':
      return 'pending';
    default:
      return 'n_a';
  }
};


const StatusBadge: React.FC<{ status: DomainActivityStatus; score?: number }> = ({ status, score }) => {
  let IconCmp;
  let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';
  let displayText: string = status;

  switch (status) {
    case 'validated': IconCmp = CheckCircle; variant = 'default'; displayText = 'Validated'; break;
    case 'generating': IconCmp = Dna; variant = 'secondary'; displayText = 'Generating'; break;
    case 'scanned': IconCmp = Search; variant = 'default'; displayText = 'Scanned'; break;
    case 'not_validated': IconCmp = XCircle; variant = 'destructive'; displayText = 'Not Validated'; break;
    case 'failed': IconCmp = AlertCircle; variant = 'destructive'; displayText = 'Failed'; break;
    case 'no_leads': IconCmp = ShieldQuestion; variant = 'secondary'; displayText = 'No Leads'; break;
    case 'pending': IconCmp = Clock; variant = 'secondary'; displayText = 'Pending'; break;
    case 'n_a': IconCmp = HelpCircle; variant = 'outline'; displayText = 'N/A'; break;
    default: IconCmp = HelpCircle; displayText = 'Unknown';
  }

  return (
    <Badge variant={variant} className="text-xs whitespace-nowrap">
      <IconCmp className="mr-1 h-3.5 w-3.5" />
      {displayText}
      {score !== undefined && status === 'scanned' && (
        <span className="ml-1.5 flex items-center">
            <Percent className="h-3 w-3 mr-0.5"/> {score}%
        </span>
      )}
    </Badge>
  );
};


export default function CampaignDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const campaignId = params.id as string;
  const campaignTypeFromQuery = searchParams.get('type') as Campaign['campaignType'] | null;
  const isSequenceMode = searchParams.get('sequence') === '1';

  const [campaign, setCampaign] = useState<CampaignViewModel | null>(null);
  const [generatedDomains, setGeneratedDomains] = useState<GeneratedDomain[]>([]);
  const [dnsCampaignItems, setDnsCampaignItems] = useState<CampaignValidationItem[]>([]);
  const [httpCampaignItems, setHttpCampaignItems] = useState<CampaignValidationItem[]>([]);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [campaignChain, setCampaignChain] = useState<CampaignViewModel[]>([]);
  const chainTriggerRef = useRef(false);

  // Use centralized loading state instead of local loading
  const { startLoading, stopLoading, isOperationLoading } = useLoadingStore();
  const loadingOperationId = `campaign_details_${campaignId}`;
  const loading = isOperationLoading(loadingOperationId);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const pageSizes = [25, 50, 100, 250];

  const streamCleanupRef = useRef<(() => void) | null>(null);
  const isMountedRef = useRef(true);
  const aggregatedCampaign = useMemo(() => {
    if (!isSequenceMode) return campaign;
    if (campaignChain.length === 0) return campaign;
    const last = campaignChain[campaignChain.length - 1];
    if (!last) return campaign;
    return { ...last, selectedType: 'domain_generation' } as CampaignViewModel;
  }, [campaign, campaignChain, isSequenceMode]);

  // Helper functions - moved to top for proper hoisting
  const getGlobalLeadStatusAndScore = (domainName: string, campaign: CampaignViewModel): { status: DomainActivityStatus; score?: number } => {
        if (!campaign) {
            return { status: 'n_a' };
        }


        return { status: 'n_a' };
  };

  const getGlobalDomainStatusForPhase = useCallback((domainName: string, phase: 'dns_validation' | 'http_keyword_validation', campaign: CampaignViewModel): DomainActivityStatus => {
        if (!campaign) {
            return 'n_a';
        }

        if (phase === 'dns_validation' && dnsCampaignItems.find(item => item.domainName === domainName)?.validationStatus === 'valid') {
            return 'validated';
        }
        if (phase === 'http_keyword_validation' && httpCampaignItems.find(item => item.domainName === domainName)?.validationStatus === 'valid') {
            return 'validated';
        }
        return 'not_validated';
    }, [dnsCampaignItems, httpCampaignItems]);

  // Helper to convert response headers from Record<string, unknown> to Record<string, string[]>
  const convertResponseHeaders = (headers?: Record<string, unknown>): Record<string, string[]> | undefined => {
    if (!headers) return undefined;
    const converted: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (Array.isArray(value)) {
        converted[key] = value.map(v => String(v));
      } else if (typeof value === 'string') {
        converted[key] = [value];
      } else if (value != null) {
        converted[key] = [String(value)];
      }
    }
    return converted;
  };



  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (streamCleanupRef.current) {
        console.log(`[${campaignId}] Dashboard unmounting, cleaning up stream.`);
        streamCleanupRef.current();
      }
    };
  }, [campaignId]);


  const loadCampaignData = useCallback(async (showLoadingSpinner = true) => {
    // 🔍 DIAGNOSTIC: Enhanced logging for campaign details issue
    const loadStartTime = Date.now();
    console.log('🔍 [RELOAD_LOOP_DEBUG] loadCampaignData called - TRACKING RELOAD BEHAVIOR:', {
      campaignId,
      campaignTypeFromQuery,
      hasValidCampaignId: !!campaignId,
      hasValidCampaignType: !!campaignTypeFromQuery,
      currentUrl: window.location.href,
      searchParamsString: window.location.search,
      allSearchParams: Object.fromEntries(searchParams.entries()),
      currentCampaignState: campaign ? {
        id: campaign.id,
        name: campaign.name,
        status: campaign.status,
        campaignType: campaign.campaignType
      } : 'NULL',
      callStack: new Error().stack?.split('\n').slice(1, 4).join(' | '),
      timestamp: new Date().toISOString(),
      loadStartTime,
      isReloadLoop: loadStartTime - (window as any).__lastLoadTime < 5000,
      timeSinceLastLoad: loadStartTime - ((window as any).__lastLoadTime || 0)
    });
    
    // Track load times to detect reload loops
    (window as any).__lastLoadTime = loadStartTime;
    
    if (!campaignId || !campaignTypeFromQuery) { // campaignTypeFromQuery check added
      console.error('❌ [RELOAD_LOOP_DEBUG] VALIDATION FAILED - This could cause reload loops!:', {
        campaignId: campaignId || 'MISSING',
        campaignTypeFromQuery: campaignTypeFromQuery || 'MISSING',
        allAvailableParams: Object.fromEntries(searchParams.entries()),
        urlBreakdown: {
          pathname: window.location.pathname,
          search: window.location.search,
          hash: window.location.hash,
          href: window.location.href
        },
        possibleCauses: [
          'Campaign creation redirect missing type parameter',
          'URL malformed after campaign creation',
          'Race condition in navigation'
        ],
        willShowError: true,
        willStopLoading: true,
        CRITICAL: 'This validation failure could trigger reload loops if parent component keeps retrying'
      });
      
      toast({ title: "Error", description: "Campaign ID or Type missing from URL.", variant: "destructive" });
      if(isMountedRef.current) stopLoading(loadingOperationId);
      return;
    }
    if(showLoadingSpinner && isMountedRef.current) startLoading(loadingOperationId, "Loading campaign details");
    
    console.log('🚀 [CAMPAIGN_DETAILS_DEBUG] Starting API call to getCampaignById:', {
      campaignId,
      apiCallStartTime: Date.now(),
      timeSinceLoadStart: Date.now() - loadStartTime
    });
    
    try {
        // 🔧 FIX: Handle backend response structure for getCampaignById
        const apiCallStartTime = Date.now();
        const rawResponse = await getCampaignById(campaignId);
        const apiCallDuration = Date.now() - apiCallStartTime;
        
        console.log('📥 [CAMPAIGN_DETAILS_DEBUG] Raw getCampaignById response received:', {
          campaignId,
          rawResponse,
          responseType: typeof rawResponse,
          isArray: Array.isArray(rawResponse),
          responseKeys: rawResponse ? Object.keys(rawResponse) : null,
          responseLength: Array.isArray(rawResponse) ? rawResponse.length : undefined,
          apiCallDuration,
          totalTimeSinceLoadStart: Date.now() - loadStartTime,
          timestamp: new Date().toISOString()
        });
        
        // 🔧 FIX: Extract campaign from different possible response structures
        let campaignDetailsResponse;
        
        if (Array.isArray(rawResponse)) {
          console.log('🔧 [CAMPAIGN_DETAILS_DEBUG] getCampaignById returned array, extracting campaign:', {
            arrayLength: rawResponse.length,
            elements: rawResponse.map((item, index) => ({
              index,
              type: typeof item,
              hasId: !!(item && typeof item === 'object' && 'id' in item),
              keys: item && typeof item === 'object' ? Object.keys(item) : null
            }))
          });
          
          // Look for the campaign object in the array
          const campaign = rawResponse.find(item =>
            item &&
            typeof item === 'object' &&
            'id' in item &&
            item.id === campaignId
          ) || rawResponse[0]; // Fallback to first element
          
          console.log('🔧 [CAMPAIGN_DETAILS_DEBUG] Extracted campaign from array for details:', {
            selectedIndex: rawResponse.indexOf(campaign),
            extractedCampaign: campaign,
            hasValidId: !!(campaign && campaign.id)
          });
          
          // Wrap it in the expected structure
          campaignDetailsResponse = campaign ? { campaign } : null;
        } else if (rawResponse && typeof rawResponse === 'object') {
          // Check if it's already wrapped or a direct campaign object
          if ('campaign' in rawResponse) {
            // Already wrapped
            campaignDetailsResponse = rawResponse;
            console.log('🔧 [CAMPAIGN_DETAILS_DEBUG] Using already-wrapped campaign object');
          } else if ('id' in rawResponse) {
            // Direct campaign object, wrap it
            campaignDetailsResponse = { campaign: rawResponse };
            console.log('🔧 [CAMPAIGN_DETAILS_DEBUG] Wrapping direct campaign object');
          } else {
            // 🔧 NEW: Check for nested campaign in data/result/payload properties
            console.log('🔧 [CAMPAIGN_DETAILS_DEBUG] Checking for nested campaign structure...');
            
            const possibleKeys = ['data', 'campaign', 'result', 'payload', 'campaign_data'];
            let foundCampaign = null;
            
            for (const key of possibleKeys) {
              // 🔧 FIX: Add proper type assertion for dynamic property access
              const rawResponseAny = rawResponse as Record<string, any>;
              if (key in rawResponseAny && rawResponseAny[key] && typeof rawResponseAny[key] === 'object') {
                if ('id' in rawResponseAny[key] && rawResponseAny[key].id) {
                  foundCampaign = rawResponseAny[key];
                  console.log(`🔧 [CAMPAIGN_DETAILS_DEBUG] Found campaign in rawResponse.${key}:`, {
                    id: foundCampaign.id,
                    name: foundCampaign.name,
                    keys: Object.keys(foundCampaign)
                  });
                  break;
                }
              }
            }
            
            if (foundCampaign) {
              campaignDetailsResponse = { campaign: foundCampaign };
              console.log('✅ [CAMPAIGN_DETAILS_DEBUG] Successfully extracted nested campaign');
            } else {
              console.error('🔧 [CAMPAIGN_DETAILS_DEBUG] No valid campaign found in response structure');
              campaignDetailsResponse = null;
            }
          }
        } else {
          console.error('🔧 [CAMPAIGN_DETAILS_DEBUG] Invalid response type');
          campaignDetailsResponse = null;
        }
        
        console.log('📥 [CAMPAIGN_DETAILS_DEBUG] Final processed response:', {
          campaignId,
          responseReceived: !!campaignDetailsResponse,
          hasCampaign: !!(campaignDetailsResponse && campaignDetailsResponse.campaign),
          campaignData: campaignDetailsResponse?.campaign ? {
            id: campaignDetailsResponse.campaign.id,
            name: campaignDetailsResponse.campaign.name,
            campaignType: campaignDetailsResponse.campaign.campaignType,
            status: campaignDetailsResponse.campaign.status
          } : null,
          processingSuccess: true,
          timestamp: new Date().toISOString()
        });

        if (campaignDetailsResponse && campaignDetailsResponse.campaign) {
            console.log('✅ [RELOAD_LOOP_DEBUG] Campaign data found - checking for problematic status:', {
              campaignId: campaignDetailsResponse.campaign.id,
              campaignName: campaignDetailsResponse.campaign.name,
              campaignType: campaignDetailsResponse.campaign.campaignType,
              campaignStatus: campaignDetailsResponse.campaign.status,
              statusAnalysis: {
                isPending: campaignDetailsResponse.campaign.status === 'pending',
                isCompleted: campaignDetailsResponse.campaign.status === 'completed',
                isRunning: campaignDetailsResponse.campaign.status === 'running',
                isFailed: campaignDetailsResponse.campaign.status === 'failed',
                isPaused: campaignDetailsResponse.campaign.status === 'paused',
                willTriggerPolling: !['completed', 'failed', 'paused', 'pending'].includes(campaignDetailsResponse.campaign.status)
              },
              progressPercentage: campaignDetailsResponse.campaign.progressPercentage,
              totalItems: campaignDetailsResponse.campaign.totalItems,
              processingStartTime: Date.now()
            });
            
            if(isMountedRef.current) {
              setCampaign(transformCampaignToViewModel(campaignDetailsResponse.campaign));
              // Domain generation stream will update streamedDomains, which is then merged here.
              // For other campaign types, their items are fetched separately.
              if (campaignDetailsResponse.campaign.campaignType === 'domain_generation') {
                // Initial load of domains if not streaming
                if(campaignDetailsResponse.campaign.status === 'completed') {
                    try {
                      const rawGenDomainsResp = await getGeneratedDomainsForCampaign(campaignId, { limit: 1000, cursor: 0 }); // Fetch a large batch
                      
                      // 🔧 FIX: Comprehensive response parsing for generated domains - same strategy as campaign details
                      console.log('🔍 [GENERATED_DOMAINS_DEBUG] Raw getGeneratedDomainsForCampaign response:', {
                        campaignId,
                        responseReceived: !!rawGenDomainsResp,
                        responseType: typeof rawGenDomainsResp,
                        responseKeys: rawGenDomainsResp ? Object.keys(rawGenDomainsResp) : null,
                        isArray: Array.isArray(rawGenDomainsResp),
                        responseLength: Array.isArray(rawGenDomainsResp) ? rawGenDomainsResp.length : undefined,
                        rawValue: rawGenDomainsResp,
                        location: 'loadCampaignData - initial domains load'
                      });
                      
                      // 🔧 FIX: Extract domains from different possible response structures
                      let processedDomains: GeneratedDomain[] = [];
                      
                      if (Array.isArray(rawGenDomainsResp)) {
                        // Direct array response
                        processedDomains = rawGenDomainsResp as GeneratedDomain[];
                        console.log('✅ [GENERATED_DOMAINS_DEBUG] Direct array response processed:', processedDomains.length);
                      } else if (rawGenDomainsResp && typeof rawGenDomainsResp === 'object') {
                        // Object response - check for data property first
                        if ('data' in rawGenDomainsResp && Array.isArray(rawGenDomainsResp.data)) {
                          processedDomains = rawGenDomainsResp.data as GeneratedDomain[];
                          console.log('✅ [GENERATED_DOMAINS_DEBUG] Extracted from response.data:', processedDomains.length);
                        } else if ('domains' in rawGenDomainsResp && Array.isArray((rawGenDomainsResp as any).domains)) {
                          processedDomains = (rawGenDomainsResp as any).domains as GeneratedDomain[];
                          console.log('✅ [GENERATED_DOMAINS_DEBUG] Extracted from response.domains:', processedDomains.length);
                        } else if ('generated_domains' in rawGenDomainsResp && Array.isArray((rawGenDomainsResp as any).generated_domains)) {
                          processedDomains = (rawGenDomainsResp as any).generated_domains as GeneratedDomain[];
                          console.log('✅ [GENERATED_DOMAINS_DEBUG] Extracted from response.generated_domains:', processedDomains.length);
                        } else {
                          // Check for nested data structures
                          const possibleKeys = ['data', 'domains', 'generated_domains', 'results', 'items'];
                          let foundDomains = null;
                          
                          for (const key of possibleKeys) {
                            const rawResponseAny = rawGenDomainsResp as Record<string, any>;
                            if (key in rawResponseAny && rawResponseAny[key]) {
                              // Check if it's an array directly
                              if (Array.isArray(rawResponseAny[key])) {
                                foundDomains = rawResponseAny[key];
                                console.log(`✅ [GENERATED_DOMAINS_DEBUG] Found domains in rawGenDomainsResp.${key}:`, foundDomains.length);
                                break;
                              }
                              // Check if it's a nested object with domains
                              else if (typeof rawResponseAny[key] === 'object' && rawResponseAny[key] !== null) {
                                const nestedKeys = ['data', 'domains', 'generated_domains', 'items'];
                                for (const nestedKey of nestedKeys) {
                                  if (nestedKey in rawResponseAny[key] && Array.isArray(rawResponseAny[key][nestedKey])) {
                                    foundDomains = rawResponseAny[key][nestedKey];
                                    console.log(`✅ [GENERATED_DOMAINS_DEBUG] Found domains in rawGenDomainsResp.${key}.${nestedKey}:`, foundDomains.length);
                                    break;
                                  }
                                }
                                if (foundDomains) break;
                              }
                            }
                          }
                          
                          if (foundDomains) {
                            processedDomains = foundDomains as GeneratedDomain[];
                          } else {
                            console.error('❌ [GENERATED_DOMAINS_DEBUG] No valid domains array found in response structure');
                            processedDomains = [];
                          }
                        }
                      } else {
                        console.error('❌ [GENERATED_DOMAINS_DEBUG] Invalid response type');
                        processedDomains = [];
                      }
                      
                      console.log('📋 [GENERATED_DOMAINS_DEBUG] Final processed domains:', {
                        domainsFound: processedDomains.length,
                        sampleDomains: processedDomains.slice(0, 3).map(d => d.domainName || d.id || 'unknown'),
                        willSetToState: processedDomains.length > 0
                      });
                      
                      if (isMountedRef.current) {
                        setGeneratedDomains(processedDomains);
                      }
                    } catch (error) {
                      console.error('❌ [GENERATED_DOMAINS_DEBUG] Error fetching generated domains:', error);
                      if (isMountedRef.current) {
                        setGeneratedDomains([]);
                      }
                    }
                }
              }
            }
            
            console.log('✅ [CAMPAIGN_DETAILS_DEBUG] Campaign state updated successfully:', {
              totalProcessingTime: Date.now() - loadStartTime,
              campaignLoaded: true
            });
        } else {
            console.log('❌ [CAMPAIGN_DETAILS_DEBUG] Campaign not found in response:', {
              campaignId,
              responseStructure: campaignDetailsResponse ? Object.keys(campaignDetailsResponse) : 'null/undefined',
              fullResponse: campaignDetailsResponse,
              possibleCause: 'Campaign may not exist or API returned unexpected structure',
              totalTimeSinceLoadStart: Date.now() - loadStartTime
            });
            
            toast({ title: "Error Loading Campaign", description: "Failed to load campaign data.", variant: "destructive"});
            if(isMountedRef.current) setCampaign(null);
        }
    } catch (error: unknown) {
        const apiErrorTime = Date.now() - loadStartTime;
        console.error('❌ [CAMPAIGN_DETAILS_DEBUG] API call failed:', {
          campaignId,
          error: error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: error.stack
          } : error,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
          apiErrorTime,
          possibleCauses: [
            'Campaign does not exist in database',
            'Race condition - campaign creation not yet committed',
            'API endpoint error',
            'Network connectivity issue',
            'Authentication/authorization issue'
          ]
        });
        
        const errorMessage = error instanceof Error ? error.message : "An unexpected network error occurred.";
        toast({ title: "Error", description: errorMessage, variant: "destructive"});
        if(isMountedRef.current) setCampaign(null);
    } finally {
        if(showLoadingSpinner && isMountedRef.current) stopLoading(loadingOperationId);
        
        console.log('🏁 [CAMPAIGN_DETAILS_DEBUG] loadCampaignData completed:', {
          campaignId,
          totalDuration: Date.now() - loadStartTime,
          success: !!campaign,
          timestamp: new Date().toISOString()
        });
    }
  }, [campaignId, campaignTypeFromQuery, toast, startLoading, stopLoading, loadingOperationId, searchParams, campaign]);

  useEffect(() => {
    loadCampaignData();
  }, [campaignId, campaignTypeFromQuery]); // 🔧 FIX: Remove loadCampaignData dependency to prevent infinite loop

  useEffect(() => {
    if (isSequenceMode && campaign) {
      setCampaignChain(prev => {
        const existing = prev.find(c => c.id === campaign.id);
        if (existing) {
          return prev.map(c => c.id === campaign.id ? campaign : c);
        }
        return [...prev, campaign];
      });
    }
  }, [campaign, isSequenceMode]);

  // Polling for non-streaming updates (e.g., overall campaign status, progress for non-DG phases)
  useEffect(() => {
    if (!campaign || campaign.status === 'completed' || campaign.status === 'failed' || campaign.status === 'paused' || campaign.status === 'pending' || (campaign.campaignType === 'domain_generation' && campaign.status === 'running')) {
      console.log('🔍 [POLLING_DEBUG] Polling conditions NOT met - no polling will occur:', {
        campaignExists: !!campaign,
        campaignStatus: campaign?.status,
        campaignType: campaign?.campaignType,
        skipReasons: {
          isCompleted: campaign?.status === 'completed',
          isFailed: campaign?.status === 'failed',
          isPaused: campaign?.status === 'paused',
          isPending: campaign?.status === 'pending',
          isDomainGenRunning: campaign?.campaignType === 'domain_generation' && campaign?.status === 'running'
        }
      });
      return;
    }
    
    console.log('🚨 [POLLING_DEBUG] POLLING WILL START - This could cause rate limiting!:', {
      campaignId: campaign.id,
      campaignStatus: campaign.status,
      campaignType: campaign.campaignType,
      pollingInterval: '30 seconds',
      WARNING: 'This polling will continue until campaign status changes to completed/failed/paused/pending'
    });
    
    // RATE LIMIT FIX: Reduced from 3s to 30s to prevent "Too Many Requests" errors
    const intervalId = setInterval(() => {
      console.log('🔄 [POLLING_DEBUG] Executing scheduled poll for campaign:', {
        campaignId: campaign.id,
        currentStatus: campaign.status,
        timestamp: new Date().toISOString()
      });
      loadCampaignData(false);
    }, 30000);
    
    return () => {
      console.log('🛑 [POLLING_DEBUG] Cleaning up polling interval for campaign:', campaign.id);
      clearInterval(intervalId);
    };
  }, [campaign, loadCampaignData]);

  // Fetch campaign items (DNS or HTTP) based on actual campaign type
  useEffect(() => {
    if (!campaign || !campaign.campaignType) return; // Use campaign.campaignType now

    const fetchItems = async () => {
      if (!isMountedRef.current) return;
      try {
        // 🔧 PHASE 2 FIX: Implement proper backend offset-based pagination
        if (campaign.campaignType === 'dns_validation') {
          const offset = (currentPage - 1) * pageSize;
          console.log('🔧 [BACKEND_PAGINATION] DNS validation - using proper offset:', {
            currentPage,
            pageSize,
            calculatedOffset: offset,
            campaignId: campaign.id
          });
          
          const dnsItemsResponse = await getDnsCampaignDomains(campaign.id!, {
            limit: pageSize,
            cursor: String(offset) // Use calculated offset instead of fixed cursor
          });
          
          console.log('🔧 [BACKEND_PAGINATION] DNS response with offset:', {
            campaignId: campaign.id,
            requestedOffset: offset,
            requestedLimit: pageSize,
            responseReceived: !!dnsItemsResponse,
            responseType: typeof dnsItemsResponse,
            dataLength: dnsItemsResponse?.data ? Array.isArray(dnsItemsResponse.data) ? dnsItemsResponse.data.length : 'not array' : 'no data'
          });
          
          if (dnsItemsResponse && dnsItemsResponse.data) {
           const dnsData = Array.isArray(dnsItemsResponse.data) ? dnsItemsResponse.data : [];
           console.log('✅ [BACKEND_PAGINATION] DNS data processed with offset:', {
             processedLength: dnsData.length,
             offset: offset,
             noDuplicationExpected: true
           });
           if(isMountedRef.current) setDnsCampaignItems(dnsData as unknown as CampaignValidationItem[]);
          } else {
            toast({ title: "Error Loading DNS Items", description: "Failed to load DNS validation items", variant: "destructive" });
          }
        } else if (campaign.campaignType === 'http_keyword_validation') {
          const offset = (currentPage - 1) * pageSize;
          console.log('🔧 [BACKEND_PAGINATION] HTTP validation - using proper offset:', {
            currentPage,
            pageSize,
            calculatedOffset: offset,
            campaignId: campaign.id
          });
          
          const httpItemsResponse = await getHttpCampaignItems(campaign.id!, {
            limit: pageSize,
            cursor: String(offset) // Use calculated offset instead of fixed cursor
          });
          
          console.log('🔧 [BACKEND_PAGINATION] HTTP response with offset:', {
            campaignId: campaign.id,
            requestedOffset: offset,
            requestedLimit: pageSize,
            responseReceived: !!httpItemsResponse,
            responseType: typeof httpItemsResponse,
            dataLength: httpItemsResponse?.data ? Array.isArray(httpItemsResponse.data) ? httpItemsResponse.data.length : 'not array' : 'no data'
          });
          
          if (httpItemsResponse && httpItemsResponse.data) {
            const httpData = Array.isArray(httpItemsResponse.data) ? httpItemsResponse.data : [];
            console.log('✅ [BACKEND_PAGINATION] HTTP data processed with offset:', {
              processedLength: httpData.length,
              offset: offset,
              noDuplicationExpected: true
            });
            if(isMountedRef.current) setHttpCampaignItems(httpData as unknown as CampaignValidationItem[]);
          } else {
            toast({ title: "Error Loading HTTP Items", description: "Failed to load HTTP validation items", variant: "destructive" });
          }
        } else if (campaign.campaignType === 'domain_generation' && campaign.status !== 'running') {
            // 🔧 PHASE 2 FIX: Use proper backend pagination for domain generation results
            try {
              const offset = (currentPage - 1) * pageSize;
              console.log('🔧 [BACKEND_PAGINATION] Domain generation - using backend offset:', {
                currentPage,
                pageSize,
                calculatedOffset: offset,
                campaignId: campaign.id,
                avoidingLargeBatches: true
              });
              
              const rawGenDomainsResp = await getGeneratedDomainsForCampaign(campaign.id!, {
                limit: pageSize,
                cursor: offset // Use proper offset for pagination
              });
              
              // 🔧 PHASE 2 FIX: Process paginated domain response (no large batches)
              console.log('🔧 [BACKEND_PAGINATION] Domain generation response with offset:', {
                campaignId: campaign.id,
                requestedOffset: offset,
                requestedLimit: pageSize,
                responseReceived: !!rawGenDomainsResp,
                responseType: typeof rawGenDomainsResp,
                avoidingDuplication: true
              });
              
              // Extract domains using same logic but expect smaller, paginated results
              let processedDomains: GeneratedDomain[] = [];
              
              if (Array.isArray(rawGenDomainsResp)) {
                processedDomains = rawGenDomainsResp as GeneratedDomain[];
                console.log('✅ [BACKEND_PAGINATION] Direct array response processed:', processedDomains.length);
              } else if (rawGenDomainsResp && typeof rawGenDomainsResp === 'object') {
                if ('data' in rawGenDomainsResp && Array.isArray(rawGenDomainsResp.data)) {
                  processedDomains = rawGenDomainsResp.data as GeneratedDomain[];
                  console.log('✅ [BACKEND_PAGINATION] Extracted from response.data:', processedDomains.length);
                } else if ('domains' in rawGenDomainsResp && Array.isArray((rawGenDomainsResp as any).domains)) {
                  processedDomains = (rawGenDomainsResp as any).domains as GeneratedDomain[];
                  console.log('✅ [BACKEND_PAGINATION] Extracted from response.domains:', processedDomains.length);
                } else {
                  // Check for standard backend response structure
                  const possibleKeys = ['data', 'domains', 'generated_domains', 'results', 'items'];
                  let foundDomains = null;
                  
                  for (const key of possibleKeys) {
                    const rawResponseAny = rawGenDomainsResp as Record<string, any>;
                    if (key in rawResponseAny && Array.isArray(rawResponseAny[key])) {
                      foundDomains = rawResponseAny[key];
                      console.log(`✅ [BACKEND_PAGINATION] Found domains in response.${key}:`, foundDomains.length);
                      break;
                    }
                  }
                  
                  processedDomains = foundDomains || [];
                }
              }
              
              console.log('✅ [BACKEND_PAGINATION] Domain generation pagination complete:', {
                domainsForThisPage: processedDomains.length,
                offset: offset,
                limit: pageSize,
                currentPage: currentPage,
                noDuplicationExpected: true,
                serverSidePagination: true
              });
              
              if (isMountedRef.current) {
                setGeneratedDomains(processedDomains);
              }
            } catch (error) {
              console.error('❌ [BACKEND_PAGINATION] Error fetching paginated domains:', error);
              if (isMountedRef.current) {
                setGeneratedDomains([]);
                toast({ title: "Error Loading Generated Domains", description: "Failed to load generated domains", variant: "destructive" });
              }
            }
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to load campaign items";
        toast({ title: "Error Loading Campaign Items", description: errorMessage, variant: "destructive" });
      }
    };
    
    // Fetch items if the campaign phase relevant to item display is active or completed
    // Use campaignType to determine which campaign type we have, status for execution state
    const selectedType = campaign.campaignType;
    const executionStatus = campaign.status; // pending, running, completed, failed, etc.
    
    // For determining which phases/items to show, we use the campaign type and status
    // Not comparing status with campaign type values - that's the bug we're fixing
    const isDNSCampaign = selectedType === 'dns_validation';
    const isHTTPCampaign = selectedType === 'http_keyword_validation';
    const isDomainGenCampaign = selectedType === 'domain_generation';
    
    // Show items if the campaign type matches and it's not just pending
    const shouldShowItems = (isDNSCampaign || isHTTPCampaign || isDomainGenCampaign) && executionStatus !== 'pending';

    if (shouldShowItems) {
      fetchItems();
      // Simple poll for items if campaign is still running
      if (executionStatus === 'running') {
          // RATE LIMIT FIX: Reduced from 5s to 30s to prevent "Too Many Requests" errors
          const itemPollInterval = setInterval(fetchItems, 30000);
          return () => clearInterval(itemPollInterval);
      }
    }
    
    // Return undefined for other code paths
    return undefined;
  }, [campaign?.id, campaign?.campaignType, campaign?.status, campaignTypeFromQuery]); // 🔧 FIX: Remove pageSize and currentPage dependencies for domain generation to prevent refetching on pagination


  // 🔧 FIX: Enhanced WebSocket for Real-Time Domain Streaming
  useEffect(() => {
    // 🔧 FIX: Connect WebSocket for domain generation campaigns in multiple states
    if (!campaign || campaign.campaignType !== 'domain_generation' || !isMountedRef.current) {
      if(streamCleanupRef.current) {
        console.log(`[${campaignId}] Stopping stream because conditions not met`);
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
      return;
    }
    
    // 🔧 FIX: Connect WebSocket for pending, running, and recently completed campaigns
    const shouldConnectWebSocket = ['pending', 'running'].includes(campaign.status || '');
    
    if (!shouldConnectWebSocket) {
      if(streamCleanupRef.current) {
        console.log(`[${campaignId}] Stopping stream - campaign status: ${campaign.status}`);
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
      return;
    }
    
    if (streamCleanupRef.current) {
        console.log(`[${campaignId}] Stream already active. Status: ${campaign.status}`);
        return;
    }

    console.log(`✅ [BACKEND_REALTIME] Connecting WebSocket for Go backend domain generation. Campaign status: ${campaign.status}`);
    
    const handleDomainReceived = (domain: string, backendMetadata?: any) => {
        if (!isMountedRef.current) return;
        
        console.log(`📥 [BACKEND_REALTIME] New domain received from Go backend:`, {
          domain,
          backendMetadata,
          campaignId,
          timestamp: new Date().toISOString(),
          frontendState: {
            currentDomainsCount: generatedDomains.length,
            campaignStatus: campaign.status
          }
        });
        
        // 🔧 BACKEND-ALIGNED: Real-time domain addition with Go backend state sync
        setGeneratedDomains(prev => {
            // Check if domain already exists
            const existingDomain = prev.find(d => d.domainName === domain);
            if (existingDomain) {
              console.log(`🔄 [BACKEND_REALTIME] Domain ${domain} already exists in frontend state, validating backend sync:`, {
                existingDomain,
                backendMetadata,
                possibleCause: 'Backend re-sent duplicate or frontend missed removal event'
              });
              return prev; // Don't add duplicates
            }
            
            // 🔧 BACKEND-ALIGNED: Create domain with backend-compatible structure
            const newDomain: GeneratedDomain = {
                id: backendMetadata?.id || `${domain}-${Date.now()}`, // Use backend ID if provided
                generationCampaignId: campaignId,
                domainName: domain,
                offsetIndex: backendMetadata?.offsetIndex ?? prev.length, // Backend-provided index
                generatedAt: backendMetadata?.generatedAt || new Date().toISOString(),
                createdAt: backendMetadata?.createdAt || new Date().toISOString(),
                // Additional backend fields if provided
                ...(backendMetadata?.additionalFields || {})
            };
            
            const updatedDomains = [newDomain, ...prev]; // Add to beginning for immediate visibility
            console.log(`✅ [BACKEND_REALTIME] Added domain ${domain} from Go backend. Frontend state updated:`, {
              newTotal: updatedDomains.length,
              addedDomain: newDomain,
              backendSyncSuccess: true
            });
            return updatedDomains;
        });
    };

    const handleStreamComplete = (phaseCompleted: CampaignStatus, error?: Error) => {
        if (!isMountedRef.current) {
          console.log(`[${campaignId}] Stream onComplete (WS) called but component unmounted.`);
          return;
        }
        console.log(`✅ [REALTIME_STREAMING] Domain Generation completed. Final status: ${phaseCompleted}. Error: ${error ? error.message : 'none'}`);
        
        setActionLoading(prev => {
            const newLoading = { ...prev };
            delete newLoading[`phase-${phaseCompleted}`];
            return newLoading;
        });
        
        // 🔧 BACKEND-ALIGNED: Load final domain list from Go backend after completion
        setTimeout(() => {
          if (isMountedRef.current) {
            console.log(`🔄 [BACKEND_REALTIME] Loading final domain list from Go backend after completion:`, {
              campaignId,
              finalStatus: phaseCompleted,
              willSyncWithBackend: true
            });
            loadCampaignData(false);
          }
        }, 1000); // Small delay to ensure Go backend completion processing
        
        streamCleanupRef.current = null;
    };
    
    // 🔧 PHASE 3 FIX: Real-time individual domain streaming from Go backend
    const cleanup = websocketService.connectToAllCampaigns(
      (message: unknown) => {
        const msg = message as {
          type?: string;
          data?: unknown;
          campaignId?: string;
          timestamp?: string;
          messageId?: string;
          sequenceNumber?: number;
        };
        
        // Filter messages for this specific campaign
        if (msg.campaignId && msg.campaignId !== campaignId) {
          return; // Ignore messages for other campaigns
        }
        
        console.log(`📨 [REALTIME_STREAMING] Individual WebSocket event from Go backend:`, {
          type: msg.type,
          campaignId: msg.campaignId,
          timestamp: msg.timestamp,
          messageId: msg.messageId,
          sequenceNumber: msg.sequenceNumber,
          processingTime: new Date().toISOString(),
          expectingIndividualDomain: msg.type === 'domain_generated'
        });
        
        // 🔧 PHASE 3 FIX: Handle individual domain_generated events (NOT batches)
        if (msg.type === 'domain_generated' && msg.data && typeof msg.data === 'object') {
          const data = msg.data as {
            domain?: string;
            domainName?: string;
            id?: string;
            offsetIndex?: number;
            generatedAt?: string;
            campaignId?: string;
            batchSize?: number; // Should be 1 for individual events
          };
          
          const domainName = data.domain || data.domainName;
          const batchSize = data.batchSize || 1;
          
          if (domainName) {
            console.log(`🔧 [REALTIME_STREAMING] Processing INDIVIDUAL domain event:`, {
              domainName,
              offsetIndex: data.offsetIndex,
              batchSize: batchSize,
              isIndividualEvent: batchSize === 1,
              realTimeStreaming: true,
              backendId: data.id,
              generatedAt: data.generatedAt
            });
            
            // Ensure this is truly an individual domain event
            if (batchSize === 1 || !data.batchSize) {
              handleDomainReceived(domainName, data);
            } else {
              console.warn(`⚠️ [REALTIME_STREAMING] Received batch event (size: ${batchSize}) - expecting individual events`);
              // Still process but log the issue
              handleDomainReceived(domainName, data);
            }
          } else {
            console.error(`❌ [REALTIME_STREAMING] domain_generated event missing domain name:`, data);
          }
        }
        // Handle campaign completion with real-time finalization
        else if (msg.type === 'campaign_completed' || msg.type === 'campaign_complete') {
          console.log(`✅ [REALTIME_STREAMING] Campaign completed - individual streaming finished`);
          handleStreamComplete('completed');
        }
        else if (msg.type === 'campaign_failed' || msg.type === 'campaign_error') {
          const data = msg.data as { reason?: string; error?: string } | undefined;
          const errorReason = data?.reason || data?.error || 'Campaign failed via WebSocket';
          console.log(`❌ [REALTIME_STREAMING] Campaign failed - individual streaming stopped:`, errorReason);
          handleStreamComplete('failed', new Error(errorReason));
        }
        // 🔧 PHASE 3 FIX: Handle real-time progress updates (individual, not batched)
        else if (msg.type === 'domain_generation_progress') {
          const data = msg.data as {
            domainsGenerated?: number;
            targetCount?: number;
            progressPercentage?: number;
            estimatedTimeRemaining?: number;
          };
          
          console.log(`📊 [REALTIME_STREAMING] Individual progress update:`, {
            generated: data.domainsGenerated,
            target: data.targetCount,
            progress: data.progressPercentage,
            realTimeUpdate: true
          });
          
          // Update campaign progress in real-time
          if (isMountedRef.current && data.progressPercentage !== undefined) {
            setCampaign(prev => prev ? {
              ...prev,
              progressPercentage: data.progressPercentage || 0
            } : null);
          }
        }
        // Handle connection acknowledgment from Go backend
        else if (msg.type === 'connection_ack' || msg.type === 'subscription_ack') {
          console.log(`🔗 [REALTIME_STREAMING] Go backend connection acknowledged:`, {
            type: msg.type,
            readyForIndividualEvents: true
          });
        }
        else {
          console.log(`📝 [REALTIME_STREAMING] Unhandled event type:`, {
            type: msg.type,
            data: msg.data,
            notCritical: true
          });
        }
      },
      (error: unknown) => {
        console.error(`❌ [BACKEND_REALTIME] WebSocket error from Go backend:`, {
          error,
          campaignId,
          willRetryAutomatically: true,
          timestamp: new Date().toISOString()
        });
        if (isMountedRef.current) {
          // Don't mark as failed for connection errors - Go backend will retry
          console.log(`🔄 [BACKEND_REALTIME] WebSocket will retry connection to Go backend automatically`);
        }
      }
    );

    if (isMountedRef.current) {
      streamCleanupRef.current = cleanup;
      console.log(`🔗 [REALTIME_STREAMING] WebSocket connected for campaign ${campaignId}`);
    } else {
      cleanup();
    }

    return () => {
      if (streamCleanupRef.current) {
        console.log(`🧹 [REALTIME_STREAMING] Cleaning up WebSocket stream (status: ${campaign?.status})`);
        streamCleanupRef.current();
        streamCleanupRef.current = null;
      }
    };
  }, [campaign, campaignId, loadCampaignData]);


  const submitStartPhase = async (payload: StartCampaignPhasePayload) => {
    if (!campaign || !campaign.campaignType || actionLoading[`phase-${payload.phaseToStart}`]) return;
    setActionLoading(prev => ({...prev, [`phase-${payload.phaseToStart}`]: true }));
    try {
      // The campaignService.startCampaignPhase now uses the V2 /start endpoint
      if (!campaign.id) return;
      const response = await startCampaignPhase(campaign.id);
      if (response && response.campaign_id) {
        if(isMountedRef.current) {
            // 🔧 FIX: Force immediate refresh to sync status
            console.log('🔄 [STATUS_SYNC_DEBUG] Campaign phase started successfully - forcing status refresh');
            loadCampaignData(false);
        }
        toast({
          title: `${phaseDisplayNames[payload.phaseToStart] || payload.phaseToStart} Started`,
          description: response.message || `Phase for campaign "${campaign.name}" is now in progress.`,
        });
      } else {
        toast({ title: "Error Starting Phase", description: "Failed to start campaign phase", variant: "destructive"});
      }
    } catch (error: unknown) {
      // 🔧 FIX: Handle status mismatch errors specifically
      const errorMessage = error instanceof Error ? error.message : "Failed to start phase";
      
      if (errorMessage.includes('not pending') || errorMessage.includes('completed')) {
        console.log('🔄 [STATUS_SYNC_DEBUG] Backend says campaign already completed - forcing frontend refresh');
        // Force refresh to sync status with backend
        if(isMountedRef.current) {
          loadCampaignData(false);
        }
        toast({
          title: "Campaign Already Completed",
          description: "This campaign has already been completed. Refreshing status...",
          variant: "default"
        });
      } else {
        toast({ title: "Error Starting Phase", description: errorMessage, variant: "destructive"});
      }
    } finally {
      // For DomainGeneration, loading state is managed by stream start/end.
      // For other phases, reset it here.
      if (payload.phaseToStart !== 'domain_generation' && isMountedRef.current) {
        setActionLoading(prev => ({...prev, [`phase-${payload.phaseToStart}`]: false }));
      }
    }
  };

  const handlePhaseActionTrigger = async (phaseToStart: CampaignType) => {
    if (!campaign || !campaign.campaignType || actionLoading[`phase-${phaseToStart}`]) return;

    // 🔧 FIX: Add proactive status validation before starting
    console.log('🔄 [STATUS_SYNC_DEBUG] Checking current campaign status before start action...');
    
    // Refresh campaign status first to ensure we have latest state
    try {
      await loadCampaignData(false);
      
      // Re-check status after refresh
      const refreshedResponse = await getCampaignById(campaign.id!);
      let refreshedCampaign = null;
      
      if (refreshedResponse && typeof refreshedResponse === 'object') {
        if ('data' in refreshedResponse && refreshedResponse.data) {
          refreshedCampaign = (refreshedResponse as any).data;
        } else if ('id' in refreshedResponse) {
          refreshedCampaign = refreshedResponse;
        }
      }
      
      if (refreshedCampaign && refreshedCampaign.status === 'completed') {
        console.log('✅ [STATUS_SYNC_DEBUG] Campaign is actually completed - updating UI state');
        setCampaign(transformCampaignToViewModel(refreshedCampaign));
        toast({
          title: "Campaign Already Completed",
          description: "This campaign has already finished. The page will update to reflect the current status.",
          variant: "default"
        });
        return;
      }
      
      if (refreshedCampaign && refreshedCampaign.status !== 'pending') {
        console.log('⚠️ [STATUS_SYNC_DEBUG] Campaign is not pending - current status:', refreshedCampaign.status);
        setCampaign(transformCampaignToViewModel(refreshedCampaign));
        toast({
          title: "Campaign Not Ready",
          description: `Campaign status is "${refreshedCampaign.status}". Only pending campaigns can be started.`,
          variant: "destructive"
        });
        return;
      }
      
    } catch (error) {
      console.error('❌ [STATUS_SYNC_DEBUG] Failed to validate campaign status:', error);
    }

    // V2 API uses simple campaignId, not complex payload
    const actionKey = `phase-${phaseToStart}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));

    const payload: StartCampaignPhasePayload = {
      campaignId: campaign.id || '',
      phaseToStart,
      // Note: V2 API /start endpoint just needs campaignId
      // Domain source and other configs are stored in campaign already
      domainSource: campaign.dnsValidationParams?.sourceGenerationCampaignId ? "campaign_output" : undefined,
      numberOfDomainsToProcess: campaign.totalItems ? Number(campaign.totalItems) : undefined
    };
    
    // Use the simplified V2 API call
    submitStartPhase(payload);
  };

  
  const handleCampaignControl = async (action: 'pause' | 'resume' | 'stop') => {
    if (!campaign || !campaign.campaignType || actionLoading[`control-${action}`]) return;
    setActionLoading(prev => ({...prev, [`control-${action}`]: true }));
    try {
        let response: { campaign_id?: string; message?: string };
        
        if (action === 'pause') {
            if (!campaign.id) return;
            response = await pauseCampaign(campaign.id);
        } else if (action === 'resume') {
            if (!campaign.id) return;
            response = await resumeCampaign(campaign.id);
        } else if (action === 'stop') {
            if (!campaign.id) return;
            response = await stopCampaign(campaign.id); // Mapped to /cancel
        } else {
            throw new Error(`Unknown action: ${action}`);
        }

        if (response && response.campaign_id) {
            // Refresh campaign data after control action
            if(isMountedRef.current) loadCampaignData(false);
            toast({ title: `Campaign ${action}ed`, description: response.message || `Campaign ${action}ed successfully` });
        } else {
            toast({ title: `Error ${action}ing campaign`, description: "Failed to control campaign", variant: "destructive"});
        }
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : `Failed to ${action} campaign`;
        toast({ title: `Error ${action}ing campaign`, description: errorMessage, variant: "destructive"});
    } finally {
        if(isMountedRef.current) setActionLoading(prev => ({...prev, [`control-${action}`]: false }));
    }
  };

  useEffect(() => {
    if (!isSequenceMode || !campaign) return;
    if (campaign.status === 'completed' && !chainTriggerRef.current) {
      chainTriggerRef.current = true;
      if (campaign.id) {
        // Note: chainCampaign not yet implemented in API client
        // This is placeholder logic for campaign chaining
        chainTriggerRef.current = false;
        toast({
          title: "Campaign Chaining",
          description: "Campaign chaining functionality is not yet implemented",
          variant: "info"
        });
      }
    }
  }, [campaign, isSequenceMode, router, toast]);


  const handleDownloadDomains = (domainsToDownload: string[] | undefined, fileNamePrefix: string) => {
    if (!domainsToDownload || domainsToDownload.length === 0) {
      toast({ title: "No Domains", description: "There are no domains in this list to export.", variant: "destructive"});
      return;
    }
    const textContent = domainsToDownload.join('\n');
    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileNamePrefix}_${(campaign?.name || 'campaign').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Export Started", description: `${domainsToDownload.length} domains are being downloaded.`});
  };

  const campaignDomainDetails = useMemo((): CampaignDomainDetail[] => {
    if (!campaign || !campaign.campaignType) return []; // Use campaign.campaignType
    
    // 🔍 DIAGNOSTIC: Add comprehensive logging for itemsToMap debugging
    console.log('🔍 [ITEMS_TO_MAP_DEBUG] campaignDomainDetails useMemo called:', {
      campaignId: campaign.id,
      campaignType: campaign.campaignType,
      campaignStatus: campaign.status,
      generatedDomainsState: {
        type: typeof generatedDomains,
        isArray: Array.isArray(generatedDomains),
        length: Array.isArray(generatedDomains) ? generatedDomains.length : 'N/A',
        value: generatedDomains
      },
      dnsCampaignItemsState: {
        type: typeof dnsCampaignItems,
        isArray: Array.isArray(dnsCampaignItems),
        length: Array.isArray(dnsCampaignItems) ? dnsCampaignItems.length : 'N/A',
        value: dnsCampaignItems
      },
      httpCampaignItemsState: {
        type: typeof httpCampaignItems,
        isArray: Array.isArray(httpCampaignItems),
        length: Array.isArray(httpCampaignItems) ? httpCampaignItems.length : 'N/A',
        value: httpCampaignItems
      },
      timestamp: new Date().toISOString()
    });
    
    let itemsToMap: Array<GeneratedDomain | CampaignValidationItem | { domainName: string; id: string }> = [];
    let itemType: 'dns' | 'http' | 'domain_gen' | 'lead_gen_base' = 'domain_gen'; // Default assumption

    if (campaign.campaignType === 'domain_generation') {
        // 🔧 FIX: Ensure generatedDomains is always an array
        itemsToMap = Array.isArray(generatedDomains) ? generatedDomains : [];
        itemType = 'domain_gen';
        console.log('🔧 [ITEMS_TO_MAP_DEBUG] domain_generation - itemsToMap assigned:', {
          isArray: Array.isArray(itemsToMap),
          length: itemsToMap.length,
          sourceIsArray: Array.isArray(generatedDomains)
        });
    } else if (campaign.campaignType === 'dns_validation') {
        // 🔧 FIX: Ensure dnsCampaignItems is always an array
        itemsToMap = Array.isArray(dnsCampaignItems) ? dnsCampaignItems : [];
        itemType = 'dns';
        console.log('🔧 [ITEMS_TO_MAP_DEBUG] dns_validation - itemsToMap assigned:', {
          isArray: Array.isArray(itemsToMap),
          length: itemsToMap.length,
          sourceIsArray: Array.isArray(dnsCampaignItems)
        });
    } else if (campaign.campaignType === 'http_keyword_validation') {
        // 🔧 FIX: Ensure httpCampaignItems is always an array
        itemsToMap = Array.isArray(httpCampaignItems) ? httpCampaignItems : [];
        itemType = 'http';
        console.log('🔧 [ITEMS_TO_MAP_DEBUG] http_keyword_validation - itemsToMap assigned:', {
          isArray: Array.isArray(itemsToMap),
          length: itemsToMap.length,
          sourceIsArray: Array.isArray(httpCampaignItems)
        });
    } else if (campaign.campaignType === 'http_keyword_validation') {
        // For Lead Gen, the "base" list of domains might come from its HTTP validated input
        // or its own generation if that was the source.
        // This needs more specific handling based on how Lead Gen sources its domains.
        // For now, assume it operates on httpValidatedDomains if available, or campaign.domains if internal gen.
        // 🔧 FIX: Ensure httpCampaignItems is an array before mapping
        const httpItems = Array.isArray(httpCampaignItems) ? httpCampaignItems : [];
        itemsToMap = httpItems.map(d => ({domainName: d.domainName, id: d.id})) || [];
        itemType = 'lead_gen_base'; // Indicates we're showing base domains, lead status applied
        console.log('🔧 [ITEMS_TO_MAP_DEBUG] http_keyword_validation (duplicate) - itemsToMap assigned:', {
          isArray: Array.isArray(itemsToMap),
          length: itemsToMap.length,
          sourceIsArray: Array.isArray(httpCampaignItems),
          sourceLength: httpItems.length
        });
    }
    
    // 🔍 FINAL VALIDATION: Check itemsToMap before proceeding
    if (!Array.isArray(itemsToMap)) {
      console.error('❌ [ITEMS_TO_MAP_DEBUG] CRITICAL: itemsToMap is not an array!', {
        campaignType: campaign.campaignType,
        itemType,
        itemsToMapType: typeof itemsToMap,
        itemsToMapValue: itemsToMap,
        willReturnEmptyArray: true
      });
      return []; // Return empty array to prevent crash
    }
    
    console.log('✅ [ITEMS_TO_MAP_DEBUG] itemsToMap validation passed:', {
      campaignType: campaign.campaignType,
      itemType,
      isArray: Array.isArray(itemsToMap),
      length: itemsToMap.length,
      proceedingWithMapping: true
    });

    if (itemType === 'dns' || itemType === 'http') {
        return itemsToMap.map((item: GeneratedDomain | CampaignValidationItem | { domainName: string; id: string }): CampaignDomainDetail => {
            const domainName = ('domainName' in item && typeof item.domainName === 'string' && item.domainName) || 
                              ('domainOrUrl' in item && typeof item.domainOrUrl === 'string' && item.domainOrUrl) || 
                              ('id' in item && typeof item.id === 'string' && item.id) || 
                              'unknown-domain';
            const leadInfo = getGlobalLeadStatusAndScore(domainName, campaign);
            
            // Type guards for proper property access
            const isDnsItem = itemType === 'dns' && 'validationStatus' in item;
            const isHttpItem = itemType === 'http' && 'validationStatus' in item;
            
            return {
                id: ('id' in item && typeof item.id === 'string' && item.id) || domainName,
                domainName,
                generatedDate: campaign.createdAt,
                dnsStatus: isDnsItem ? getDomainStatusFromItem((item as CampaignValidationItem).validationStatus) : getGlobalDomainStatusForPhase(domainName, 'dns_validation', campaign),
                dnsError: isDnsItem ? (item as CampaignValidationItem).errorDetails : undefined,
                dnsResultsByPersona: undefined, // TODO: Only populate with real backend data, not synthetic objects

                httpStatus: isHttpItem ? getDomainStatusFromItem((item as CampaignValidationItem).validationStatus) : getGlobalDomainStatusForPhase(domainName, 'http_keyword_validation', campaign),
                httpError: isHttpItem ? (item as CampaignValidationItem).errorDetails : undefined,
                httpStatusCode: isHttpItem ? (item as CampaignValidationItem).httpStatusCode : undefined,
                httpFinalUrl: isHttpItem ? (item as CampaignValidationItem).finalUrl : undefined,
                httpContentHash: isHttpItem ? (item as CampaignValidationItem).contentHash : undefined,
                httpTitle: isHttpItem ? (item as CampaignValidationItem).extractedTitle : undefined,
                httpResponseHeaders: isHttpItem ? convertResponseHeaders((item as CampaignValidationItem).responseHeaders) : undefined,
                
                leadScanStatus: leadInfo.status,
                leadDetails: undefined,
            };
        }).sort((a,b) => a.domainName.localeCompare(b.domainName));
    } else { // For Domain Generation or Lead Gen base domains
        return itemsToMap.map((item: GeneratedDomain | CampaignValidationItem | { domainName: string; id: string }): CampaignDomainDetail => {
            const domainName = ('domainName' in item && item.domainName) || '';
            const leadInfo = getGlobalLeadStatusAndScore(domainName, campaign);
            return {
                id: ('id' in item && item.id) || domainName,
                domainName,
                generatedDate: ('generatedAt' in item && item.generatedAt) || campaign.createdAt,
                dnsStatus: getGlobalDomainStatusForPhase(domainName, 'dns_validation', campaign),
                httpStatus: getGlobalDomainStatusForPhase(domainName, 'http_keyword_validation', campaign),
                leadScanStatus: leadInfo.status,
                leadDetails: undefined,
            };
        }).sort((a,b) => a.domainName.localeCompare(b.domainName));
    }
  }, [campaign, generatedDomains, dnsCampaignItems, httpCampaignItems, getGlobalDomainStatusForPhase]);

  // 🔧 FIX: Backend-driven pagination logic for real-time domain streaming
  const totalDomains = campaignDomainDetails.length;
  const totalPages = Math.ceil(totalDomains / pageSize);
  
  const paginatedDomains = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const slicedDomains = campaignDomainDetails.slice(startIndex, endIndex);
    
    // 🔧 BACKEND-ALIGNED: Real-time streaming logs for Go backend integration
    if (campaign?.campaignType === 'domain_generation') {
      console.log('📊 [BACKEND_REALTIME] Table pagination update (Go backend source):', {
        totalDomains,
        currentPage,
        pageSize,
        startIndex,
        endIndex,
        domainsOnThisPage: slicedDomains.length,
        isFirstPage: currentPage === 1,
        streamingActive: campaign?.status === 'running',
        backendSync: {
          wsConnected: !!streamCleanupRef.current,
          lastWebSocketMessage: Date.now(),
          expectedFromBackend: 'domain_generated events via WebSocket'
        },
        frontendState: {
          generatedDomainsLength: generatedDomains.length,
          campaignStatus: campaign?.status,
          realTimeUpdatesActive: campaign?.status === 'running'
        }
      });
    }
    
    return slicedDomains;
  }, [campaignDomainDetails, currentPage, pageSize, campaign?.campaignType, campaign?.status, totalDomains, generatedDomains.length]);

  const handlePageSizeChange = (value: string) => {
    setPageSize(Number(value));
    setCurrentPage(1);
  };

  const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));


  if (loading && !campaign) {
    return (
      <div className="space-y-6">
        <PageHeader title="Loading Campaign..." icon={Briefcase} />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!campaign || !campaign.campaignType) { // Use campaign.campaignType
    return (
      <div className="text-center py-10">
        <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
        <PageHeader title="Campaign Not Found" description="The requested campaign could not be loaded, does not exist, or type is missing from URL." icon={Briefcase} />
        <Button onClick={() => router.push('/campaigns')} className="mt-6">Back to Campaigns</Button>
      </div>
    );
  }

  const phasesForSelectedType = CAMPAIGN_PHASES_ORDERED[campaign.campaignType] || [];
  const currentPhaseIndexInType = (campaign.status === "pending" || campaign.status === "completed" || campaign.status === "failed" || campaign.status === "paused")
    ? -1
    : campaign.status ? phasesForSelectedType.indexOf(campaign.status) : -1;

  const renderPhaseButtons = () => {
    // 🔧 FIX: Check completed status first and log state mismatch
    if ((campaign as Campaign)?.status === "completed") {
      console.log('✅ [STATUS_SYNC_DEBUG] Campaign marked as completed - hiding start button:', {
        campaignId: campaign.id,
        status: campaign.status,
        shouldShowCompleted: true
      });
      return <p className="text-lg font-semibold text-green-500 flex items-center gap-2"><CheckCircle className="h-6 w-6"/>Campaign Completed!</p>;
    }
    
    if ((campaign as Campaign)?.status === "failed") {
       const failedPhaseName = campaign.campaignType ? (phaseDisplayNames[campaign.campaignType] || campaign.campaignType) : 'Unknown Phase';
       // Retry for failed phase should use the StartCampaignPhase logic
       return (
         <div className="text-center">
           <p className="text-lg font-semibold text-destructive mb-2">Failed: {failedPhaseName}</p>
           {campaign.errorMessage && <p className="text-sm text-muted-foreground mb-3">Error: {campaign.errorMessage}</p>}
           {campaign.status && (
             <PhaseGateButton
               label={`Retry ${failedPhaseName}`}
               onClick={() => handlePhaseActionTrigger(campaign.campaignType!)}
               Icon={RefreshCw}
               variant="destructive"
               isLoading={actionLoading[`phase-${campaign.campaignType}`]}
               disabled={!!actionLoading[`phase-${campaign.campaignType}`]}
             />
           )}
         </div>
       );
    }
    if (campaign.status === "paused") {
        const pausedPhaseName = campaign.campaignType ? (phaseDisplayNames[campaign.campaignType] || campaign.campaignType) : 'Unknown Phase';
        return <PhaseGateButton label={`Resume ${pausedPhaseName}`} onClick={() => handleCampaignControl('resume')} Icon={PlayCircle} isLoading={actionLoading['control-resume']} disabled={!!actionLoading['control-resume']} />;
    }
    if (campaign.status === "pending") {
        // 🔧 FIX: Add logging for status mismatch detection
        console.log('🚨 [STATUS_SYNC_DEBUG] Campaign showing as pending - will show start button:', {
          campaignId: campaign.id,
          frontendStatus: campaign.status,
          campaignType: campaign.campaignType,
          warning: 'If backend says completed but frontend says pending, this is a sync issue'
        });
        
        // Start the very first phase of this campaign type from the V2 spec
        const selectedType = campaign.campaignType;
        if (selectedType) {
          const firstPhase = getFirstPhase(selectedType);
          if (firstPhase) {
            const phaseDisplayName = phaseDisplayNames[firstPhase as CampaignType] || firstPhase;
            const phaseIcon = phaseIcons[firstPhase as CampaignType] || Play;
            return <PhaseGateButton
              label={`Start ${phaseDisplayName}`}
              onClick={() => {
                console.log('🔄 [STATUS_SYNC_DEBUG] Start button clicked - will refresh status after action');
                handlePhaseActionTrigger(firstPhase as CampaignType);
              }}
              Icon={phaseIcon}
              isLoading={actionLoading[`phase-${firstPhase}`]}
              disabled={!!actionLoading[`phase-${firstPhase}`]}
            />;
          }
        }
    }
    if (campaign.status === "running") {
        let progressText = `(${campaign.progressPercentage}%)`;
        if(campaign.campaignType === 'domain_generation') {
             const generatedCount = generatedDomains.length; // Use length of fetched/streamed domains
             const campaignTarget = campaign.domainGenerationParams?.numDomainsToGenerate || 'all possible';
             progressText = `(${generatedCount} / ${campaignTarget} - ${campaign.progressPercentage}%)`;
        }
        const currentPhaseName = campaign.campaignType ? (phaseDisplayNames[campaign.campaignType] || campaign.campaignType) : 'Unknown Phase';
        return <p className="text-sm text-muted-foreground text-center">Current phase: {currentPhaseName} is in progress {progressText}... <RefreshCw className="inline-block ml-2 h-4 w-4 animate-spin" /></p>;
    }
    
    // This logic might be simplified if backend drives all phase transitions after /start
    if ((campaign as Campaign)?.status === "completed") {
        const selectedType = campaign.campaignType;
        if (selectedType) {
          // For now, just show completion - proper phase tracking should come from backend
          return <p className="text-lg font-semibold text-green-500 flex items-center gap-2"><CheckCircle className="h-6 w-6"/>Campaign Completed!</p>;
        }
    }
    
    // For failed campaigns
    if ((campaign as Campaign)?.status === "failed") {
        return <p className="text-lg font-semibold text-red-500 flex items-center gap-2"><XCircle className="h-6 w-6"/>Campaign Failed</p>;
    }
    
    return null;
  };

  const renderCampaignControlButtons = () => {
    if (!campaign || campaign.status === 'completed' || campaign.status === 'pending' || campaign.status === 'failed') return null;
    return (
      <div className="flex gap-2 justify-center">
        {campaign.status === 'running' && (
          <Button variant="outline" size="sm" onClick={() => handleCampaignControl('pause')} disabled={actionLoading['control-pause']} isLoading={actionLoading['control-pause']}>
            <PauseCircle className="mr-2 h-4 w-4" /> Pause <span className="text-xs ml-1 text-muted-foreground">(API: /pause)</span>
          </Button>
        )}
        {campaign.status === 'paused' && (
          <Button variant="outline" size="sm" onClick={() => handleCampaignControl('resume')} disabled={actionLoading['control-resume']} isLoading={actionLoading['control-resume']}>
            <PlayCircle className="mr-2 h-4 w-4" /> Resume <span className="text-xs ml-1 text-muted-foreground">(API: /resume)</span>
          </Button>
        )}
        {(campaign.status === 'running' || campaign.status === 'paused') && (
          <Button variant="destructive" size="sm" onClick={() => handleCampaignControl('stop')} disabled={actionLoading['control-stop']} isLoading={actionLoading['control-stop']}>
            <StopCircle className="mr-2 h-4 w-4" /> Cancel <span className="text-xs ml-1 text-muted-foreground">(API: /cancel)</span>
          </Button>
        )}
      </div>
    );
  };


  const getSimilarityBadgeVariant = (score: number) => {
    if (score >= 85) return "default";
    else if (score >= 70) return "secondary";
    else return "outline";
  };

  const renderConsolidatedResultsTable = () => {
    if (campaignDomainDetails.length === 0 && campaign.campaignType !== 'domain_generation' && !(campaign.status === 'running' && (campaign.campaignType === 'dns_validation' || campaign.campaignType === 'http_keyword_validation'))) {
        return <p className="text-center text-muted-foreground py-6">No domains processed or generated yet for this campaign.</p>;
    }
    if (campaignDomainDetails.length === 0 && (campaign.status === 'running' && (campaign.campaignType === 'domain_generation' || campaign.campaignType === 'dns_validation' || campaign.campaignType === 'http_keyword_validation'))) {
        return <p className="text-center text-muted-foreground py-6 flex items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Waiting for domain results...</p>;
    }

    const startItem = (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalDomains);

    return (
        <Card className="mt-6 shadow-lg">
            <CardHeader>
                <CardTitle>Campaign Domain Details ({totalDomains})</CardTitle>
                <CardDescription>Real-time status of domains processed in this campaign.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[400px] border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[35%]">Domain</TableHead>
                                <TableHead className="text-center">DNS Status</TableHead>
                                <TableHead className="text-center">HTTP Status</TableHead>
                                <TableHead className="text-center">Lead Status</TableHead>
                                <TableHead className="text-center">Lead Score</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedDomains.map((detail) => (
                                <TableRow key={detail.id}>
                                    <TableCell className="font-medium truncate" title={detail.domainName}>
                                      <a href={`http://${detail.domainName}`} target="_blank" rel="noopener noreferrer" className="hover:underline text-primary">
                                        {detail.domainName} <ExternalLink className="inline-block ml-1 h-3 w-3 opacity-70"/>
                                      </a>
                                    </TableCell>
                                    <TableCell className="text-center"><StatusBadge status={detail.dnsStatus} /></TableCell>
                                    <TableCell className="text-center"><StatusBadge status={detail.httpStatus} /></TableCell>
                                    <TableCell className="text-center"><StatusBadge status={detail.leadScanStatus} /></TableCell>
                                    <TableCell className="text-center">
                                      {detail.leadDetails?.similarityScore !== undefined ? (
                                          <Badge variant={getSimilarityBadgeVariant(detail.leadDetails.similarityScore)} className="text-xs">
                                              <Percent className="mr-1 h-3 w-3"/> {detail.leadDetails.similarityScore}%
                                          </Badge>
                                      ) : (detail.leadScanStatus !== 'pending' && detail.leadScanStatus !== 'n_a') ? <span className="text-xs text-muted-foreground">-</span> : null}
                                    </TableCell>
                                </TableRow>
                            ))}
                             {paginatedDomains.length === 0 && totalDomains > 0 && (
                                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No domains on this page.</TableCell></TableRow>
                            )}
                            {paginatedDomains.length === 0 && totalDomains === 0 && (
                                 <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No domains to display yet.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
                 <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Rows per page:</span>
                        <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
                            <SelectTrigger className="w-[70px] h-8 text-xs">
                                <SelectValue placeholder={pageSize} />
                            </SelectTrigger>
                            <SelectContent>
                                {pageSizes.map(size => (
                                    <SelectItem key={size} value={String(size)} className="text-xs">{size}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <span>Showing {totalDomains > 0 ? startItem : 0}-{endItem} of {totalDomains}</span>
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
                 <div className="mt-6 flex flex-wrap justify-end space-x-0 sm:space-x-2 space-y-2 sm:space-y-0">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            // For V2, initial/generated domains for DG campaign are fetched via results endpoint
                            // For other types, depends on how source domains are stored/accessed.
                            // This needs to be type-aware.
                            let domainsToDownload: string[] | undefined = undefined;
                            if (campaign.campaignType === 'domain_generation') {
                                domainsToDownload = generatedDomains.map(d => d.domainName);
                            } else if (campaign.dnsValidationParams?.sourceGenerationCampaignId) {
                                // Need to fetch the domains from the source campaign
                            }
                            handleDownloadDomains(domainsToDownload, 'initial_or_generated_domains');
                        }}
                        disabled={
                            (campaign.campaignType === 'domain_generation' && generatedDomains.length === 0)
                        }
                    >
                        <Download className="mr-2 h-4 w-4" /> Export Initial/Generated ({
                           campaign.campaignType === 'domain_generation' ? generatedDomains.length : 0
                        })
                         <span className="text-xs ml-1 text-muted-foreground">(API: /results/generated-domains)</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDomains(dnsCampaignItems.map(d => d.domainName), 'dns_validated_domains')}
                        disabled={dnsCampaignItems.length === 0}
                    >
                        <Download className="mr-2 h-4 w-4" /> Export DNS Valid ({dnsCampaignItems.length})
                        <span className="text-xs ml-1 text-muted-foreground">(API: /results/dns-validation)</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadDomains(httpCampaignItems.map(item => item.domainName).filter(Boolean), 'http_validated_domains')}
                        disabled={httpCampaignItems.length === 0}
                    >
                        <Download className="mr-2 h-4 w-4" /> Export HTTP Valid ({httpCampaignItems.length})
                        <span className="text-xs ml-1 text-muted-foreground">(API: /results/http-keyword)</span>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
  };

  const renderTuningSummary = () => {
    if (campaign.campaignType !== 'dns_validation' && campaign.campaignType !== 'http_keyword_validation') {
      return null;
    }

    const params = campaign.campaignType === 'dns_validation'
      ? campaign.dnsValidationParams
      : campaign.httpKeywordValidationParams;

    if (!params) return null;

    const rotation = params.rotationIntervalSeconds !== undefined
      ? typeof params.rotationIntervalSeconds === 'bigint'
        ? Number(params.rotationIntervalSeconds)
        : params.rotationIntervalSeconds
      : undefined;
    const speed = params.processingSpeedPerMinute !== undefined
      ? typeof params.processingSpeedPerMinute === 'bigint'
        ? Number(params.processingSpeedPerMinute)
        : params.processingSpeedPerMinute
      : undefined;
    const batch = params.batchSize !== undefined
      ? typeof params.batchSize === 'bigint'
        ? Number(params.batchSize)
        : params.batchSize
      : undefined;
    const retries = params.retryAttempts !== undefined
      ? typeof params.retryAttempts === 'bigint'
        ? Number(params.retryAttempts)
        : params.retryAttempts
      : undefined;

    if (rotation === undefined && speed === undefined && batch === undefined && retries === undefined) {
      return null;
    }

    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Tuning Parameters</CardTitle>
          <CardDescription>Worker settings for this phase</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {rotation !== undefined && (
            <div className="flex justify-between">
              <span>Rotation Interval</span>
              <span>{rotation}s</span>
            </div>
          )}
          {speed !== undefined && (
            <div className="flex justify-between">
              <span>Processing Speed / Minute</span>
              <span>{speed}</span>
            </div>
          )}
          {batch !== undefined && (
            <div className="flex justify-between">
              <span>Batch Size</span>
              <span>{batch}</span>
            </div>
          )}
          {retries !== undefined && (
            <div className="flex justify-between">
              <span>Retry Attempts</span>
              <span>{retries}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };


  return (
    <div className="space-y-6">
      <PageHeader
        title={campaign.name || 'Campaign'}
        description={`Dashboard for ${campaign.campaignType} campaign.`}
        icon={Briefcase}
        actionButtons={<Button variant="outline" onClick={() => loadCampaignData(true)} disabled={loading || Object.values(actionLoading).some(v=>v)}><RefreshCw className={cn("mr-2 h-4 w-4", (loading || Object.values(actionLoading).some(v=>v)) && "animate-spin")}/> Refresh</Button>}
      />

      <Card className="shadow-lg">
        <CardHeader><CardTitle>Campaign Progress</CardTitle><CardDescription>Current status for &quot;{aggregatedCampaign?.selectedType}&quot;.</CardDescription></CardHeader>
        <CardContent><CampaignProgress campaign={aggregatedCampaign || campaign} /></CardContent>
      </Card>

      {isSequenceMode && campaignChain.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader><CardTitle>Sequence Progress</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {campaignChain.map(c => (
                <li key={c.id} className="flex justify-between">
                  <span>{phaseDisplayNames[c.campaignType as CampaignType]}</span>
                  <span>{c.status}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {renderTuningSummary()}

      <Card className="shadow-lg">
        <CardHeader><CardTitle>Campaign Actions</CardTitle></CardHeader>
        <CardContent className="flex flex-col items-center justify-center min-h-[80px] space-y-3">
            {renderPhaseButtons()}
            {renderCampaignControlButtons()}
             {/* V2 API endpoint for starting is POST /api/v2/v2/campaigns/{campaignId}/start */}
            <p className="text-xs text-muted-foreground pt-2">
                Phase Trigger API: POST /api/v2/v2/campaigns/{campaign.id}/start
            </p>
        </CardContent>
      </Card>
      
      {renderConsolidatedResultsTable()}

      {(phasesForSelectedType.includes("LeadGeneration") &&
        (currentPhaseIndexInType >= phasesForSelectedType.indexOf("http_keyword_validation") || campaign.status === "completed")
        ) && (
        <ContentSimilarityView campaign={campaign} />
      )}
      
    </div>
  );
}