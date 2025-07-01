"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/shared/PageHeader';
import StrictProtectedRoute from '@/components/auth/StrictProtectedRoute';
import type { CampaignViewModel } from '@/lib/types';
import { PlusCircle, Briefcase, CheckCircle, AlertTriangle, Clock, PauseCircle, Wifi, WifiOff } from 'lucide-react';
import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiClient } from '@/lib/api-client/client';
import { normalizeStatus, isActiveStatus } from '@/lib/utils/statusMapping';
import { adaptWebSocketMessage } from '@/lib/utils/websocketMessageAdapter';
import type { WebSocketMessage } from '@/lib/services/websocketService.simple';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticUpdate, useLoadingState, useStateSubscription } from '@/lib/state/stateManager';
import { transformCampaignsToViewModels } from '@/lib/utils/campaignTransforms';

// Error serialization utility for meaningful logging
const serializeError = (obj: unknown): string => {
  if (obj === null || obj === undefined) {
    return String(obj);
  }

  // Handle Error instances - extract non-enumerable properties
  if (obj instanceof Error) {
    const errorData: Record<string, unknown> = {
      name: obj.name,
      message: obj.message,
      stack: obj.stack,
    };
    
    // Include cause if available (modern Error objects)
    if ('cause' in obj && obj.cause !== undefined) {
      errorData.cause = obj.cause;
    }
    
    // Include any custom enumerable properties
    for (const [key, value] of Object.entries(obj)) {
      if (!(key in errorData)) {
        errorData[key] = value;
      }
    }
    
    return JSON.stringify(errorData, null, 2);
  }

  // Handle Event instances - extract relevant non-enumerable properties
  if (obj instanceof Event) {
    const eventData: Record<string, unknown> = {
      type: obj.type,
      isTrusted: obj.isTrusted,
      timeStamp: obj.timeStamp,
      target: obj.target?.constructor?.name || 'Unknown',
    };
    
    // Add currentTarget if available
    if (obj.currentTarget) {
      eventData.currentTarget = obj.currentTarget.constructor?.name || 'Unknown';
    }
    
    // Include any custom enumerable properties
    for (const [key, value] of Object.entries(obj)) {
      if (!(key in eventData)) {
        eventData[key] = value;
      }
    }
    
    return JSON.stringify(eventData, null, 2);
  }

  // Handle generic objects with circular reference protection
  try {
    const seen = new WeakSet();
    const result = JSON.stringify(obj, (key, value) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular Reference]';
        }
        seen.add(value);
      }
      return value;
    }, 2);
    
    // If JSON.stringify returns '{}' for an object, try to extract some properties manually
    if (result === '{}' && typeof obj === 'object' && obj !== null) {
      const keys = Object.getOwnPropertyNames(obj);
      if (keys.length > 0) {
        const extractedProps: Record<string, unknown> = {};
        keys.slice(0, 10).forEach(key => { // Limit to first 10 properties
          try {
            const descriptor = Object.getOwnPropertyDescriptor(obj, key);
            if (descriptor) {
              extractedProps[key] = descriptor.value;
            }
          } catch {
            extractedProps[key] = '[Unable to access]';
          }
        });
        return JSON.stringify(extractedProps, null, 2);
      }
    }
    
    return result;
  } catch (error) {
    // Fallback for objects that can't be serialized
    return `[Object: ${obj.constructor?.name || 'Unknown'}]`;
  }
};

// PERFORMANCE: Lazy load campaign components for better bundle splitting
const CampaignListItem = lazy(() => import('@/components/campaigns/CampaignListItem'));
const CampaignProgressMonitor = lazy(() => import('@/components/campaigns/CampaignProgressMonitor'));

// PERFORMANCE: Loading component for lazy-loaded components
const ComponentLoader = () => (
  <div className="space-y-4">
    <Skeleton className="h-24 w-full" />
  </div>
);

function CampaignsPageContent() {
  const [campaigns, setCampaigns] = useState<CampaignViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "completed" | "failed" | "paused">("all");
  const [wsConnected, setWsConnected] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  
  const { toast } = useToast();
  const { applyUpdate, confirmUpdate, rollbackUpdate } = useOptimisticUpdate();
  const { setLoading: setGlobalLoading, isLoading: isGlobalLoading } = useLoadingState();

  // MEMORY LEAK FIX: Add AbortController for API request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);


  // MEMORY LEAK FIX: WebSocket connection management with proper cleanup
  useEffect(() => {
    let wsCleanup: (() => void) | null = null;

    const connectWebSocket = async () => {
      try {
        // Import the WebSocket service dynamically to avoid SSR issues
        const { websocketService } = await import('@/lib/services/websocketService.simple');
        
        if (!isMountedRef.current) return;
        
        console.log('[CampaignsPage] Connecting to WebSocket...');
        
        // Connect to all campaigns updates
        wsCleanup = websocketService.connectToAllCampaigns(
          (standardMessage: WebSocketMessage) => {
            if (!isMountedRef.current) return;
            
            console.log('[CampaignsPage] WebSocket message received - connection established');
            setWsConnected(true);
            
            // Convert to legacy format for backward compatibility
            const message = adaptWebSocketMessage(standardMessage);
            
            // Handle different message types
            switch (message.type) {
              case 'progress':
                // Update campaign progress
                if (message.campaignId) {
                  setCampaigns(prev => prev.map(campaign =>
                    campaign.id === message.campaignId
                      ? {
                          ...campaign,
                          progressPercentage: typeof message.data.progress === 'number'
                            ? message.data.progress
                            : campaign.progressPercentage
                        }
                      : campaign
                  ));
                }
                break;
                
              case 'phase_complete':
                // Update campaign status and phase
                if (message.campaignId && message.data.status) {
                  setCampaigns(prev => prev.map(campaign =>
                    campaign.id === message.campaignId
                      ? { 
                          ...campaign, 
                          status: normalizeStatus(message.data.status),
                          currentPhase: message.data.phase as CampaignViewModel['currentPhase']
                        }
                      : campaign
                  ));
                }
                break;
                
              case 'error':
                // Handle campaign errors
                if (message.campaignId && message.data && typeof message.data === 'object' && 'error' in message.data) {
                  setCampaigns(prev => prev.map(campaign =>
                    campaign.id === message.campaignId
                      ? { ...campaign, errorMessage: String((message.data as { error: unknown }).error) }
                      : campaign
                  ));
                }
                break;
            }
          },
          (error) => {
            // ENHANCED DIAGNOSTIC: Classify WebSocket error types
            const isEvent = error instanceof Event;
            const isNetworkError = error instanceof Error && (
              error.message.includes('Failed to connect') ||
              error.message.includes('Connection timeout') ||
              error.message.includes('Network error')
            );
            
            // Only log as error if it's a true application error, not a connection attempt
            if (isEvent) {
              console.warn('[CampaignsPage] WebSocket connection event (normal):', {
                type: error.type,
                target: error.target?.constructor?.name,
                timeStamp: error.timeStamp,
                isTrusted: error.isTrusted
              });
            } else if (isNetworkError) {
              console.warn('[CampaignsPage] WebSocket network issue (will retry):', error.message);
            } else {
              console.error('[CampaignsPage] WebSocket application error:', serializeError(error));
            }
            
            if (isMountedRef.current) {
              setWsConnected(false);
            }
          }
        );
        
        console.log('[CampaignsPage] WebSocket connection attempt completed');
        
        // Fallback connection status check - provides resilience against race conditions
        setTimeout(() => {
          if (!isMountedRef.current) return;
          
          const connectionStatus = websocketService.getConnectionStatus();
          const isAnyConnected = Object.values(connectionStatus).some(Boolean);
          
          if (isAnyConnected && !wsConnected) {
            console.log('[CampaignsPage] Fallback: Detected active connection, updating status');
            setWsConnected(true);
          }
        }, 1000);

      } catch (error) {
        console.error('Failed to connect WebSocket:', error);
        if (isMountedRef.current) {
          setWsConnected(false);
        }
      }
    };

    connectWebSocket();

    return () => {
      if (wsCleanup) {
        wsCleanup();
      }
    };
  }, []);

  // MEMORY LEAK FIX: Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Subscribe to campaign state changes
  useStateSubscription('campaigns', (updatedCampaigns) => {
    console.log('[CampaignsPage] State subscription triggered with:', updatedCampaigns);
    if (Array.isArray(updatedCampaigns)) {
      setCampaigns(updatedCampaigns);
    }
  });

  const loadCampaignsData = useCallback(async (showLoadingSpinner = true, signal?: AbortSignal) => {
    console.log(`[CampaignsPage] loadCampaignsData called with showLoadingSpinner: ${showLoadingSpinner}`);
    
    // MEMORY LEAK FIX: Check if component is still mounted
    if (!isMountedRef.current) {
      console.log('[CampaignsPage] Component unmounted, skipping load');
      return;
    }
    
    // INFINITE LOOP PREVENTION: Check if already loading to prevent concurrent calls
    if (isGlobalLoading('campaigns_load')) {
      console.log('[CampaignsPage] Already loading campaigns, skipping duplicate call');
      return;
    }
    
    if (showLoadingSpinner && isMountedRef.current) setLoading(true);
    setGlobalLoading('campaigns_load', true, 'Loading campaigns');
    
    try {
      // MEMORY LEAK FIX: Pass AbortSignal to API call (if getCampaigns supports it)
      const response = await apiClient.listCampaigns();
      
      // MEMORY LEAK FIX: Check if request was aborted or component unmounted
      if (signal?.aborted || !isMountedRef.current) {
        console.log('[CampaignsPage] Request aborted or component unmounted');
        return;
      }

      if (response.status === 'success' && Array.isArray(response.data)) {
        console.log(`[CampaignsPage] Successfully loaded ${response.data.length} campaigns`);
        if (isMountedRef.current) {
          setCampaigns(transformCampaignsToViewModels(response.data));
        }
      } else {
        console.warn('[CampaignsPage] Failed to load campaigns');
        if (isMountedRef.current) {
          setCampaigns([]);
          toast({
            title: "Error Loading Campaigns",
            description: "Failed to load campaigns.",
            variant: "destructive"
          });
        }
      }
    } catch (error: unknown) {
      // MEMORY LEAK FIX: Don't update state if component unmounted or request aborted
      if (signal?.aborted || !isMountedRef.current) {
        console.log('[CampaignsPage] Request aborted or component unmounted during error handling');
        return;
      }
      
      console.error('[CampaignsPage] Error loading campaigns:', error);
      if (isMountedRef.current) {
        setCampaigns([]);
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } finally {
      if (isMountedRef.current) {
        if (showLoadingSpinner) setLoading(false);
        setGlobalLoading('campaigns_load', false);
      }
    }
  }, [toast, setGlobalLoading]); // INFINITE LOOP FIX: Remove isGlobalLoading dependency as it's stable


  useEffect(() => {
    console.log('[CampaignsPage] Initial load effect triggered');
    
    // MEMORY LEAK FIX: Create AbortController for this effect
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Initial load
    loadCampaignsData(true, abortController.signal);
    
    // MEMORY LEAK FIX: Set up interval with proper cleanup - reduced frequency for better performance
    const intervalId = setInterval(() => {
      if (!isMountedRef.current || abortController.signal.aborted) {
        console.log('[CampaignsPage] Interval stopped due to unmount or abort');
        clearInterval(intervalId);
        return;
      }
      console.log('[CampaignsPage] Interval refresh triggered');
      loadCampaignsData(false, abortController.signal);
    }, 30000); // FIXED: Changed from 5 seconds to 30 seconds to reduce refresh frequency
    
    intervalRef.current = intervalId;
    
    return () => {
      console.log('[CampaignsPage] Cleaning up interval and aborting requests');
      // MEMORY LEAK FIX: Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      // MEMORY LEAK FIX: Abort ongoing requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []); // INFINITE LOOP FIX: Remove loadCampaignsData dependency to prevent re-creation

  // MEMORY LEAK FIX: Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel any ongoing API requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      // Clear any running intervals
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);


  const handleDeleteCampaign = async (campaignId: string) => {
    setActionLoading(prev => ({ ...prev, [`delete-${campaignId}`]: true }));
    setGlobalLoading(`delete_campaign_${campaignId}`, true, 'Deleting campaign');

    // Apply optimistic update
    const campaign = campaigns.find(c => c.id === campaignId);
    const updateId = await applyUpdate({
      type: 'DELETE',
      entityType: 'campaigns',
      entityId: campaignId,
      optimisticData: null,
      originalData: campaign,
      rollbackFn: () => {
        if (campaign) {
          setCampaigns(prev => [...prev, campaign]);
        }
      },
      retryFn: () => handleDeleteCampaign(campaignId)
    });

    // Apply optimistic UI update
    setCampaigns(prev => prev.filter(c => c.id !== campaignId));

    try {
      // Call deleteCampaign with just campaignId
      await apiClient.deleteCampaign(campaignId);
      await confirmUpdate(updateId);
      toast({
        title: "Campaign Deleted",
        description: "Campaign successfully deleted."
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Could not delete campaign.";
      await rollbackUpdate(updateId, errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${campaignId}`]: false }));
      setGlobalLoading(`delete_campaign_${campaignId}`, false);
    }
  };

  const handleCampaignControl = async (campaignId: string, action: 'pause' | 'resume' | 'stop') => {
    const actionKey = `${action}-${campaignId}`;
    setActionLoading(prev => ({ ...prev, [actionKey]: true }));
    setGlobalLoading(`${action}_campaign_${campaignId}`, true, `${action}ing campaign`);

    // Apply optimistic update
    const campaign = campaigns.find(c => c.id === campaignId);
    const optimisticStatus = action === 'pause' ? 'paused' : action === 'resume' ? 'running' : 'cancelled';
    const optimisticData = campaign ? { ...campaign, status: normalizeStatus(optimisticStatus) } : null;

    const updateId = await applyUpdate({
      type: 'UPDATE',
      entityType: 'campaigns',
      entityId: campaignId,
      optimisticData,
      originalData: campaign,
      rollbackFn: () => {
        if (campaign) {
          setCampaigns(prev => prev.map(c => c.id === campaignId ? campaign : c));
        }
      },
      retryFn: () => handleCampaignControl(campaignId, action)
    });

    // Apply optimistic UI update
    if (optimisticData) {
      setCampaigns(prev => prev.map(c => c.id === campaignId ? optimisticData : c));
    }

    try {
      // Call the appropriate API method directly
      if (action === 'pause') {
        await apiClient.pauseCampaign(campaignId);
      } else if (action === 'resume') {
        await apiClient.resumeCampaign(campaignId);
      } else {
        await apiClient.cancelCampaign(campaignId);
      }
      
      await confirmUpdate(updateId);
      toast({ title: `Campaign ${action}ed`, description: `Campaign ${action}ed successfully` });
      // Refresh campaigns to get latest state
      loadCampaignsData(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} campaign`;
      await rollbackUpdate(updateId, errorMessage);
      toast({ title: `Error ${action}ing campaign`, description: errorMessage, variant: "destructive"});
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
      setGlobalLoading(`${action}_campaign_${campaignId}`, false);
    }
  };


  const filteredCampaigns = campaigns.filter(campaign => {
    // Normalize campaign status to ensure consistency
    const status = normalizeStatus(campaign.status);
    
    if (activeTab === "active") return isActiveStatus(status);
    if (activeTab === "paused") return status === "paused";
    if (activeTab === "completed") return status === "completed";
    if (activeTab === "failed") return status === "failed";
    return true; // 'all'
  });

  const countActive = campaigns.filter(c => isActiveStatus(normalizeStatus(c.status))).length;
  const countPaused = campaigns.filter(c => normalizeStatus(c.status) === "paused").length;
  const countCompleted = campaigns.filter(c => normalizeStatus(c.status) === "completed").length;
  const countFailed = campaigns.filter(c => normalizeStatus(c.status) === "failed").length;


  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Oversee all your domain intelligence and lead generation initiatives."
        icon={Briefcase}
        actionButtons={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {wsConnected ? (
                <Badge variant="secondary" className="text-xs">
                  <Wifi className="mr-1 h-3 w-3" />
                  Live Updates
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  <WifiOff className="mr-1 h-3 w-3" />
                  Offline
                </Badge>
              )}
            </div>
            <Button asChild>
              <Link href="/campaigns/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Campaign
              </Link>
            </Button>
          </div>
        }
      />

      {!wsConnected && (
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Real-time updates are currently unavailable. Campaign data may not reflect the latest changes.
          </AlertDescription>
        </Alert>
      )}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "all" | "active" | "completed" | "failed" | "paused")} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">All ({campaigns.length})</TabsTrigger>
          <TabsTrigger value="active"> <Clock className="mr-2 h-4 w-4 text-blue-500"/> Active ({countActive}) </TabsTrigger>
          <TabsTrigger value="paused"> <PauseCircle className="mr-2 h-4 w-4 text-orange-500"/> Paused ({countPaused}) </TabsTrigger>
          <TabsTrigger value="completed"> <CheckCircle className="mr-2 h-4 w-4 text-green-500"/> Completed ({countCompleted}) </TabsTrigger>
          <TabsTrigger value="failed"> <AlertTriangle className="mr-2 h-4 w-4 text-destructive"/> Failed ({countFailed}) </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
         <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="shadow-md">
              <CardHeader><Skeleton className="h-6 w-3/4 mb-2" /><Skeleton className="h-4 w-1/2" /></CardHeader>
              <CardContent className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-10 w-2/3" /></CardContent>
              <CardFooter><Skeleton className="h-4 w-1/4" /></CardFooter>
            </Card>
          ))}
        </div>
      ) :
      filteredCampaigns.length === 0 ? (
         <div className="text-center py-10 border-2 border-dashed rounded-lg mt-6">
            <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-lg font-medium">
                {activeTab === "all" ? "No campaigns found" : `No ${activeTab} campaigns found`}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
                {activeTab === "all" ? "Get started by creating your first campaign." : `There are no campaigns currently in the "${activeTab}" state.`}
            </p>
            <div className="mt-6">
              <Button asChild><Link href="/campaigns/new"><PlusCircle className="mr-2 h-4 w-4" /> Create New Campaign</Link></Button>
            </div>
          </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCampaigns.map(campaign => (
            <Suspense key={campaign.id} fallback={<ComponentLoader />}>
              <CampaignListItem
                  campaign={campaign}
                  onDeleteCampaign={() => campaign.id && handleDeleteCampaign(campaign.id)}
                  onPauseCampaign={() => campaign.id && handleCampaignControl(campaign.id, 'pause')}
                  onResumeCampaign={() => campaign.id && handleCampaignControl(campaign.id, 'resume')}
                  onStopCampaign={() => campaign.id && handleCampaignControl(campaign.id, 'stop')}
                  isActionLoading={actionLoading}
              />
            </Suspense>
          ))}
        </div>
      )}
     {/* Campaign Progress Monitors for active campaigns */}
     {campaigns.filter(c => isActiveStatus(normalizeStatus(c.status))).map(campaign => {
       console.log(`[CampaignsPage] Rendering progress monitor for campaign ${campaign.id}`);
       return (
         <div key={`monitor-${campaign.id}`} className="mb-4">
           <Suspense fallback={<ComponentLoader />}>
             <CampaignProgressMonitor
               campaign={campaign}
               onCampaignUpdate={(updates) => {
                 console.log(`[CampaignsPage] Progress monitor update for ${campaign.id}:`, updates);
                 // INFINITE LOOP PREVENTION: Avoid triggering state updates that cause re-renders
                 setCampaigns(prev => prev.map(c =>
                   c.id === campaign.id ? { ...c, ...updates } : c
                 ));
               }}
             />
           </Suspense>
         </div>
       );
     })}
   </>
 );
}

export default function CampaignsPage() {
 return (
   <StrictProtectedRoute
     redirectTo="/login"
   >
     <CampaignsPageContent />
   </StrictProtectedRoute>
 );
}
