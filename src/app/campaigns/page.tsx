"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/shared/PageHeader';
import type { CampaignViewModel } from '@/lib/types';
import { PlusCircle, Briefcase, CheckCircle, AlertTriangle, Clock, PauseCircle, Wifi, WifiOff, Trash2, Loader2 } from 'lucide-react';

// WebSocket message interfaces
interface _WebSocketCampaignMessage {
  type: string;
  campaignId: string;
  data: {
    progress?: number;
    phase?: string;
    status?: string;
    error?: unknown;
  };
  timestamp?: string;
}
import { useEffect, useState, useCallback, useRef, lazy, Suspense, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { normalizeStatus, isActiveStatus } from '@/lib/utils/statusMapping';
import { adaptWebSocketMessage } from '@/lib/utils/websocketMessageAdapter';
import type { WebSocketMessage } from '@/lib/services/websocketService.simple';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticUpdate, useLoadingState } from '@/lib/state/stateManager';
import { unifiedCampaignService } from '@/lib/services/unifiedCampaignService';
import { useCampaignPagination } from '@/lib/hooks/usePagination';

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
      stack: obj.stack
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
      target: obj.target?.constructor?.name || 'Unknown'
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
  } catch (_error) {
    // Fallback for objects that can't be serialized
    return `[Object: ${obj.constructor?.name || 'Unknown'}]`;
  }
};

// PERFORMANCE: Lazy load enhanced campaign list component - NO MORE LEGACY COMPONENTS
const EnhancedCampaignsList = lazy(() => import('@/components/campaigns/EnhancedCampaignsList'));

// PERFORMANCE: Loading component for lazy-loaded components
const ComponentLoader = () => (
  <div className="space-y-4">
    <Skeleton className="h-24 w-full" />
  </div>
);

function CampaignsPageContent() {
  // 🔥 DIAGNOSTIC: Check if component function even starts
  console.log('🔥 [CRITICAL] CampaignsPageContent function started executing');
  
  const [campaigns, setCampaigns] = useState<CampaignViewModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "completed" | "failed" | "paused">("all");
  const [wsConnected, setWsConnected] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  
  const { toast } = useToast();
  const { applyUpdate, confirmUpdate, rollbackUpdate } = useOptimisticUpdate();
  const { setLoading: setGlobalLoading, isLoading: isGlobalLoading } = useLoadingState();

  // MEMORY LEAK FIX: Add AbortController for API request cancellation
  const abortControllerRef = useRef<AbortController | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Use standardized campaign pagination with dashboard context (50 campaigns per page)
  const paginationHook = useCampaignPagination(campaigns.length, 'dashboard');
  const { params: paginationParams } = paginationHook;


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
              case 'campaign_list_update':
                // 🚀 NEW: Handle real-time campaign list updates (eliminates polling)
                console.log('[CampaignsPage] Received campaign list update:', message.data);
                if (message.data?.action && message.data?.campaignId) {
                  const { action, campaignId, campaign } = message.data;
                  
                  switch (action) {
                    case 'create':
                      if (campaign) {
                        console.log('[CampaignsPage] Adding new campaign via WebSocket');
                        setCampaigns(prev => [...prev, campaign as CampaignViewModel]);
                      }
                      break;
                      
                    case 'update':
                      if (campaign) {
                        console.log('[CampaignsPage] Updating campaign via WebSocket');
                        setCampaigns(prev => prev.map(c =>
                          c.id === campaignId ? { ...c, ...(campaign as CampaignViewModel) } : c
                        ));
                      }
                      break;
                      
                    case 'delete':
                      console.log('[CampaignsPage] Removing campaign via WebSocket');
                      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
                      break;
                  }
                }
                break;
                
              case 'campaign_progress':
              case 'progress':
                // Update campaign progress
                if (message.campaignId) {
                  const progressData = message.data as { progress?: number; phase?: string; status?: string };
                  setCampaigns(prev => prev.map((campaign: CampaignViewModel) =>
                    campaign.id === message.campaignId
                      ? {
                          ...campaign,
                          progressPercentage: typeof progressData.progress === 'number'
                            ? progressData.progress
                            : campaign.progressPercentage,
                          currentPhase: progressData.phase || campaign.currentPhase  as any,
phaseStatus: progressData.status || campaign.phaseStatus as any
}
                      : campaign
                  ));
                }
                break;
                
              case 'phase_complete':
                // Update campaign status and phase
                if (message.campaignId && message.data.status) {
                  const phaseData = message.data as { phase?: string; status?: string; progress?: number };
                  setCampaigns(prev => prev.map((campaign: CampaignViewModel) =>
                    campaign.id === message.campaignId
                      ? {
                          ...campaign,
                          status: phaseData.status === 'completed' ? 'completed' as const : normalizeStatus(phaseData.status),
                          currentPhase: phaseData.phase as CampaignViewModel['currentPhase'] || campaign.currentPhase  as any,
phaseStatus: phaseData.status || campaign.phaseStatus  as any,
progressPercentage: phaseData.progress || 100
}
                      : campaign
                  ));
                }
                break;

              case 'campaign_status':
                // Handle campaign status updates
                if (message.campaignId) {
                  const statusData = message.data as { status?: string };
                  setCampaigns(prev => prev.map((campaign: CampaignViewModel) =>
                    campaign.id === message.campaignId
                      ? { ...campaign, phaseStatus: statusData.status ? normalizeStatus(statusData.status) : campaign.phaseStatus }
                      : campaign
                  ));
                }
                break;
                
              case 'error':
                // Handle campaign errors
                if (message.campaignId && message.data && typeof message.data === 'object' && 'error' in message.data) {
                  setCampaigns(prev => prev.map((campaign: CampaignViewModel) =>
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
  }, [wsConnected]); // Include wsConnected dependency

  // MEMORY LEAK FIX: Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // REMOVED: State subscription was causing duplicate updates and conflicts with direct API loading
  // WebSocket and API calls handle all state updates directly

  const loadCampaignsData = useCallback(async (showLoadingSpinner = true, _signal?: AbortSignal) => {
    // 🔥 DIAGNOSTIC: Add logging to debug early returns
    console.log('🔥 [DIAGNOSTIC] loadCampaignsData called, checking conditions...');
    console.log('🔥 [DIAGNOSTIC] isMountedRef.current:', isMountedRef.current);
    console.log('🔥 [DIAGNOSTIC] isGlobalLoading("campaigns_load"):', isGlobalLoading('campaigns_load'));
    
    // MEMORY LEAK FIX: Check if component is still mounted
    if (!isMountedRef.current) {
      console.log('🚨 [DIAGNOSTIC] Component unmounted, skipping load');
      return;
    }
    
    // INFINITE LOOP PREVENTION: Check if already loading to prevent concurrent calls
    if (isGlobalLoading('campaigns_load')) {
      console.log('🚨 [DIAGNOSTIC] Already loading campaigns, skipping duplicate call');
      return;
    }
    
    if (showLoadingSpinner && isMountedRef.current) setLoading(true);
    setGlobalLoading('campaigns_load', true, 'Loading campaigns with bulk enrichment');
    
    try {
      console.log('🚀 [DEBUG] CampaignsPage loadCampaignsData called - this should only happen ONCE per page load');
      console.log('🚀 [CampaignsPage] Using BULK API - Loading campaigns with enriched data in single call');
      
      // 🔥 PERFORMANCE BOOST: Use bulk enriched data API instead of N+1 queries
      // BULK-ONLY STRATEGY: Single call to get campaigns and enrichment in one operation
      // This completely eliminates the dual loading pattern (basic campaigns → enrichment)
      
      console.log('🚀 [CampaignsPage] BULK-ONLY: Loading campaigns with enhanced bulk operations');
      
      // Get campaigns using unified service with proper pagination
      const limit = paginationParams.pageSize || 50;
      const offset = ((paginationParams.current || 1) - 1) * limit;
      
      console.log(`🚀 [CampaignsPage] Using unified campaign service with pagination (limit: ${limit}, offset: ${offset})`);
      
      const campaignsResponse = await unifiedCampaignService.getCampaigns({
        limit,
        offset
      });
      
      if (!campaignsResponse.success || !campaignsResponse.data) {
        throw new Error(campaignsResponse.error || 'Failed to load campaigns');
      }
      
      console.log(`📊 [CampaignsPage] Loaded ${campaignsResponse.data.length} campaigns via unified service`);
      
      // Use campaigns from unified service response
      const compatibleCampaigns: CampaignViewModel[] = campaignsResponse.data;
      
      console.log(`✅ [CampaignsPage] Successfully loaded ${compatibleCampaigns.length} campaigns with unified service`);
      
      // Check if component is still mounted after API call
      if (!isMountedRef.current) {
        console.log('[CampaignsPage] Component unmounted during response processing');
        return;
      }
      
      if (compatibleCampaigns && compatibleCampaigns.length >= 0) {
        if (isMountedRef.current) {
          setCampaigns(compatibleCampaigns);
          console.log('📝 [CampaignsPage] BULK Campaign state updated successfully:', {
            newStateCount: compatibleCampaigns.length,
            stateUpdateSuccess: true,
            bulkApiUsed: true,
            performanceImprovement: 'N+1 queries eliminated'
          });
        }
      } else {
        if (isMountedRef.current) {
          setCampaigns([]);
          toast({
            title: "Error Loading Campaigns",
            description: "Failed to load campaigns with bulk API. Please check your connection and try again.",
            variant: "destructive"
          });
        }
      }
    } catch (error: unknown) {
      if (!isMountedRef.current) {
        console.log('[CampaignsPage] Component unmounted during error handling');
        return;
      }
      
      console.error('[CampaignsPage] Error loading campaigns with bulk API:', error);
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
  }, [paginationParams, unifiedCampaignService, isMountedRef, setLoading, setGlobalLoading, isGlobalLoading, setCampaigns, toast]); // FIXED: Added necessary dependencies


  useEffect(() => {
    console.log('[CampaignsPage] Initial load effect triggered');
    
    // MEMORY LEAK FIX: Create AbortController for this effect
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    
    // Initial load
    loadCampaignsData(true, abortController.signal);
    
    // 🚀 WEBSOCKET PUSH MODEL: Completely eliminate polling - backend will push updates
    console.log('[CampaignsPage] Using WebSocket push model - no polling needed');
    // No more setInterval - all updates will come via WebSocket events
    
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // CRITICAL RATE LIMIT FIX: Remove loadCampaignsData dependency to prevent infinite loop

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
      // Use unified campaign service for delete
      const result = await unifiedCampaignService.deleteCampaign(campaignId);
      if (result.success) {
        await confirmUpdate(updateId);
        toast({
          title: "Campaign Deleted",
          description: result.message || "Campaign successfully deleted."
        });
      } else {
        throw new Error(result.error || "Could not delete campaign.");
      }
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
    const optimisticStatus = action === 'pause' ? 'paused' : action === 'resume' ? 'InProgress' : 'cancelled';
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
      // Use unified campaign service for control operations
      let result;
      if (action === 'pause') {
        result = await unifiedCampaignService.pauseCampaign(campaignId);
      } else if (action === 'resume') {
        result = await unifiedCampaignService.resumeCampaign(campaignId);
      } else {
        result = await unifiedCampaignService.cancelCampaign(campaignId);
      }
      
      if (result.success) {
        await confirmUpdate(updateId);
        toast({ title: `Campaign ${action}ed`, description: result.message || `Campaign ${action}ed successfully` });
      } else {
        throw new Error(result.error || `Failed to ${action} campaign`);
      }
      // REMOVED: Redundant refresh - WebSocket updates handle state changes
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : `Failed to ${action} campaign`;
      await rollbackUpdate(updateId, errorMessage);
      toast({ title: `Error ${action}ing campaign`, description: errorMessage, variant: "destructive"});
    } finally {
      setActionLoading(prev => ({ ...prev, [actionKey]: false }));
      setGlobalLoading(`${action}_campaign_${campaignId}`, false);
    }
  };

  // FIXED: Add debugging and null-safe filtering logic
  const filteredCampaigns = campaigns.filter(campaign => {
    // DEBUGGING: Log campaign statuses to identify filtering issues
    if (campaigns.length > 0 && Math.random() < 0.1) { // Sample logging
      console.log('[CAMPAIGNS_FILTER_DEBUG] Campaign filtering:', {
campaignId: campaign.id,
        rawStatus: campaign.phaseStatus,
        normalizedStatus: normalizeStatus(campaign.phaseStatus),
        activeTab,
        isActiveStatusResult: isActiveStatus(normalizeStatus(campaign.phaseStatus)),
        willBeFiltered: activeTab === "all" ? true :
          activeTab === "active" ? isActiveStatus(normalizeStatus(campaign.phaseStatus)) :
          activeTab === "paused" ? normalizeStatus(campaign.phaseStatus) === "paused" :
          activeTab === "completed" ? normalizeStatus(campaign.phaseStatus) === "completed" :
          activeTab === "failed" ? normalizeStatus(campaign.phaseStatus) === "failed" : true
      });
    }

    // FIXED: Null-safe status normalization
    if (!campaign || !campaign.phaseStatus) {
      console.warn('[CAMPAIGNS_FILTER_DEBUG] Campaign with missing status:', campaign);
      return activeTab === "all"; // Show invalid campaigns only on "all" tab
    }
    
    // Normalize campaign status to ensure consistency
    const status = normalizeStatus(campaign.phaseStatus);
    
    if (activeTab === "active") return isActiveStatus(status);
    if (activeTab === "paused") return status === "paused";
    if (activeTab === "completed") return status === "completed";
    if (activeTab === "failed") return status === "failed";
    return true; // 'all'
  });

  // DEBUGGING: Log filtering results
  console.log('[CAMPAIGNS_FILTER_DEBUG] Filtering results:', {
totalCampaigns: campaigns.length,
    filteredCampaigns: filteredCampaigns.length,
    activeTab,
    sampleCampaignStatuses: campaigns.slice(0, 3).map(c => ({
id: c.id,
      status: c.phaseStatus,
      normalized: normalizeStatus(c.phaseStatus)
    }))
  });

  const countActive = campaigns.filter(c => isActiveStatus(normalizeStatus(c.phaseStatus))).length;
  const countPaused = campaigns.filter(c => normalizeStatus(c.phaseStatus) === "paused").length;
  const countCompleted = campaigns.filter(c => normalizeStatus(c.phaseStatus) === "completed").length;
  const countFailed = campaigns.filter(c => normalizeStatus(c.phaseStatus) === "failed").length;


  // Bulk delete functionality
  const handleSelectCampaign = useCallback((campaignId: string, selected: boolean) => {
    setSelectedCampaigns(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(campaignId);
      } else {
        newSet.delete(campaignId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allFilteredIds = filteredCampaigns.map(c => c.id).filter(Boolean) as string[];
    const allSelected = allFilteredIds.every(id => selectedCampaigns.has(id));
    
    if (allSelected) {
      // Deselect all
      setSelectedCampaigns(new Set());
    } else {
      // Select all visible campaigns
      setSelectedCampaigns(new Set(allFilteredIds));
    }
  }, [filteredCampaigns, selectedCampaigns]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedCampaigns.size === 0) return;

    setBulkDeleteLoading(true);
    setGlobalLoading('bulk_delete_campaigns', true, `Deleting ${selectedCampaigns.size} campaigns`);

    const campaignsToDelete = Array.from(selectedCampaigns);
    const campaignNames = campaignsToDelete
      .map(id => campaigns.find(c => c.id === id)?.name)
      .filter(Boolean)
      .slice(0, 3)
      .join(', ');

    try {
      // Optimistic UI update - remove campaigns immediately
      setCampaigns(prev => prev.filter(c => !c.id || !selectedCampaigns.has(c.id)));
      
      // Use unified campaign service bulk delete for optimal performance
      const bulkDeleteResult = await unifiedCampaignService.deleteCampaignsBulk(campaignsToDelete);
      
      if (!bulkDeleteResult.success) {
        throw new Error(bulkDeleteResult.error || 'Failed to delete campaigns');
      }

      // Handle partial failures if any
      if (bulkDeleteResult.data) {
        const { successfully_deleted = 0, failed_deletions = 0, total_requested = campaignsToDelete.length } = bulkDeleteResult.data;
        
        if (failed_deletions > 0 && successfully_deleted === 0) {
          // Complete failure
          throw new Error(`Failed to delete all ${total_requested} campaigns`);
        }
        
        if (failed_deletions > 0) {
          // Partial failure - show warning but continue
          console.warn(`Partial success: ${successfully_deleted}/${total_requested} campaigns deleted, ${failed_deletions} failed`);
        }
      }

      // Clear selection
      setSelectedCampaigns(new Set());

      // Update success message based on bulk operation results
      const successCount = bulkDeleteResult.data?.successfully_deleted || campaignsToDelete.length;
      const failedCount = bulkDeleteResult.data?.failed_deletions || 0;
      
      let successTitle = "Campaigns Deleted Successfully";
      let successDescription = `${successCount} campaigns deleted successfully`;
      
      if (failedCount > 0) {
        successTitle = "Partial Success";
        successDescription = `${successCount} campaigns deleted, ${failedCount} failed`;
      }
      
      if (campaignNames) {
        successDescription += `: ${campaignNames}${campaignsToDelete.length > 3 ? '...' : ''}`;
      }

      toast({
        title: successTitle,
        description: successDescription
      });

      // REMOVED: Redundant refresh - optimistic update already handled this
    } catch (error: unknown) {
      // FIXED: Proper rollback without unnecessary API calls
      // Restore campaigns from previous state instead of making API call
      setCampaigns(prev => {
        const restoredCampaigns = [...prev];
        campaignsToDelete.forEach(id => {
          const originalCampaign = campaigns.find(c => c.id === id);
          if (originalCampaign && !restoredCampaigns.find(c => c.id === id)) {
            restoredCampaigns.push(originalCampaign);
          }
        });
        return restoredCampaigns;
      });
      
      const errorMessage = error instanceof Error ? error.message : "Failed to delete campaigns.";
      toast({
title: "Bulk Delete Failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setBulkDeleteLoading(false);
      setGlobalLoading('bulk_delete_campaigns', false);
    }
  }, [selectedCampaigns, campaigns, toast, setGlobalLoading]);

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

      {/* Bulk Actions Toolbar */}
      {filteredCampaigns.length > 0 && (
        <div className="mb-4 p-3 bg-muted/30 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={
                  filteredCampaigns.length > 0 &&
                  filteredCampaigns.every(c => c.id && selectedCampaigns.has(c.id))
                }
                onCheckedChange={handleSelectAll}
                aria-label="Select all campaigns"
              />
              <span className="text-sm font-medium">
                {selectedCampaigns.size === 0
                  ? `${filteredCampaigns.length} campaigns`
                  : `${selectedCampaigns.size} of ${filteredCampaigns.length} selected`
                }
              </span>
            </div>
            
            {selectedCampaigns.size > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCampaigns(new Set())}
                >
                  Clear Selection
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={bulkDeleteLoading || selectedCampaigns.size === 0}
                >
                  {bulkDeleteLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete {selectedCampaigns.size} Campaign{selectedCampaigns.size !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

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
      ) : (
        // ✅ BULK API INTEGRATION: Use EnhancedCampaignsList with bulk data
        filteredCampaigns.length > 0 ? (
          <Suspense fallback={<ComponentLoader />}>
            <EnhancedCampaignsList
              campaigns={filteredCampaigns}
              onDeleteCampaign={handleDeleteCampaign}
              onPauseCampaign={(id) => handleCampaignControl(id, 'pause')}
              onResumeCampaign={(id) => handleCampaignControl(id, 'resume')}
              onStopCampaign={(id) => handleCampaignControl(id, 'stop')}
              isActionLoading={actionLoading}
              selectedCampaigns={selectedCampaigns}
              onSelectCampaign={handleSelectCampaign}
            />
          </Suspense>
        ) : (
          // FIXED: Only show empty state if we definitely have no campaigns and finished loading
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
        )
      )}
     {/* TEMPORARILY DISABLED: Campaign Progress Monitors causing N+1 queries - blocking bulk delete testing */}
     {useMemo(() => {
       const activeCampaigns = campaigns.filter(c => isActiveStatus(normalizeStatus(c.phaseStatus)));
       console.log(`🚨 [DEBUG] DISABLED ${activeCampaigns.length} progress monitors to fix loading issue`);
       
       // Return empty array to disable monitors temporarily
       return [];
       
       /* ORIGINAL CODE - RE-ENABLE AFTER FIXING N+1 ISSUE:
       return activeCampaigns.map(campaign => {
         const handleCampaignUpdate = (updates: Partial<CampaignViewModel>) => {
           console.log(`[CampaignsPage] Progress monitor update for ${campaign.id}:`, updates);
           setCampaigns(prev => prev.map(c =>
             c.id === campaign.id ? { ...c, ...updates } : c
           ));
         };

         return (
           <div key={`monitor-${campaign.id}`} className="mb-4">
             <Suspense fallback={<ComponentLoader />}>
               <CampaignProgressMonitor
                 campaign={campaign}
                 onCampaignUpdate={handleCampaignUpdate}
               />
             </Suspense>
           </div>
         );
       });
       */
     }, [campaigns])}
   </>
 );
}

export default function CampaignsPage() {
 // 🔥 DIAGNOSTIC: Check if main page component is called
 console.log('🔥 [CRITICAL] CampaignsPage main function called');
 
 return <CampaignsPageContent />;
}
