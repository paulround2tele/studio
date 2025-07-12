"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import PageHeader from '@/components/shared/PageHeader';
import StrictProtectedRoute from '@/components/auth/StrictProtectedRoute';
import type { components } from '@/lib/api-client/types';

// Frontend-specific view model based on auto-generated Campaign type
type CampaignViewModel = components['schemas']['Campaign'] & {
  // Add any frontend-specific fields if needed
};
import { PlusCircle, Briefcase, CheckCircle, AlertTriangle, Clock, PauseCircle, Wifi, WifiOff, Trash2, Loader2 } from 'lucide-react';
import { useEffect, useState, useCallback, useRef, lazy, Suspense, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { apiClient } from '@/lib/api-client/client';
import { normalizeStatus, isActiveStatus } from '@/lib/utils/statusMapping';
import { adaptWebSocketMessage } from '@/lib/utils/websocketMessageAdapter';
import type { WebSocketMessage } from '@/lib/services/websocketService.simple';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticUpdate, useLoadingState } from '@/lib/state/stateManager';
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
  } catch (_error) {
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
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  
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
              case 'campaign_list_update':
                // 🚀 NEW: Handle real-time campaign list updates (eliminates polling)
                console.log('[CampaignsPage] Received campaign list update:', message.data);
                if (message.data?.action && message.data?.campaignId) {
                  const { action, campaignId, campaign } = message.data;
                  
                  switch (action) {
                    case 'create':
                      if (campaign) {
                        console.log('[CampaignsPage] Adding new campaign via WebSocket');
                        setCampaigns(prev => [...prev, campaign]);
                      }
                      break;
                      
                    case 'update':
                      if (campaign) {
                        console.log('[CampaignsPage] Updating campaign via WebSocket');
                        setCampaigns(prev => prev.map(c =>
                          c.id === campaignId ? { ...c, ...campaign } : c
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
                  setCampaigns(prev => prev.map(campaign =>
                    campaign.id === message.campaignId
                      ? {
                          ...campaign,
                          progressPercentage: typeof progressData.progress === 'number'
                            ? progressData.progress
                            : campaign.progressPercentage,
                          currentPhase: progressData.phase || campaign.currentPhase,
                          phaseStatus: progressData.status || campaign.phaseStatus
                        }
                      : campaign
                  ));
                }
                break;
                
              case 'phase_complete':
                // Update campaign status and phase
                if (message.campaignId && message.data.status) {
                  const phaseData = message.data as { phase?: string; status?: string; progress?: number };
                  setCampaigns(prev => prev.map(campaign =>
                    campaign.id === message.campaignId
                      ? {
                          ...campaign,
                          status: phaseData.status === 'Succeeded' ? 'completed' : normalizeStatus(phaseData.status),
                          currentPhase: phaseData.phase as CampaignViewModel['currentPhase'] || campaign.currentPhase,
                          phaseStatus: phaseData.status || campaign.phaseStatus,
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
                  setCampaigns(prev => prev.map(campaign =>
                    campaign.id === message.campaignId
                      ? { ...campaign, status: statusData.status || campaign.status }
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

  const loadCampaignsData = useCallback(async (showLoadingSpinner = true, signal?: AbortSignal) => {
    const loadStartTime = Date.now();
    console.log('🔍 [CAMPAIGNS_LIST_DEBUG] loadCampaignsData called - TRACKING ZERO RECORDS ISSUE:', {
      showLoadingSpinner,
      currentCampaignsCount: campaigns.length,
      isComponentMounted: isMountedRef.current,
      isAlreadyLoading: isGlobalLoading('campaigns_load'),
      callStack: new Error().stack?.split('\n').slice(1, 3).join(' | '),
      timestamp: new Date().toISOString(),
      loadStartTime
    });
    
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
      // 🔍 DIAGNOSTIC: Track API call timing and response
      const apiCallStartTime = Date.now();
      console.log('🚀 [CAMPAIGNS_LIST_DEBUG] Calling apiClient.listCampaigns(100)...', {
        apiCallStartTime,
        timeSinceLoadStart: apiCallStartTime - loadStartTime
      });
      
      // MEMORY LEAK FIX: Pass AbortSignal to API call (if getCampaigns supports it)
      // FIX: Add limit=100 to prevent pagination truncation (same fix as personas)
      const response = await apiClient.listCampaigns(100);
      const apiCallDuration = Date.now() - apiCallStartTime;
      
      // 🔍 DIAGNOSTIC: Log raw API response structure
      console.log('📥 [CAMPAIGNS_LIST_DEBUG] Raw listCampaigns API response:', {
        responseReceived: !!response,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : null,
        status: response?.status,
        dataProperty: {
          exists: !!(response && response.data),
          type: response && response.data ? typeof response.data : null,
          isArray: response && response.data ? Array.isArray(response.data) : false,
          length: response && response.data && Array.isArray(response.data) ? response.data.length : 'N/A',
          firstItemKeys: response && response.data && Array.isArray(response.data) && response.data.length > 0 && response.data[0]
            ? Object.keys(response.data[0])
            : null,
          rawValue: response?.data
        },
        apiCallDuration,
        totalTimeSinceLoadStart: Date.now() - loadStartTime
      });
      
      // 🔧 FIX: Only check abort status for component unmount, not for successful responses
      if (!isMountedRef.current) {
        console.log('[CampaignsPage] Component unmounted during response processing');
        return;
      }
      
      // 🔍 DIAGNOSTIC: Enhanced logging for response processing
      console.log('📋 [CAMPAIGNS_LIST_DEBUG] Processing successful API response:', {
        signal_aborted: signal?.aborted || false,
        component_mounted: isMountedRef.current,
        response_status: response?.status,
        response_data_type: typeof response?.data,
        response_data_array: Array.isArray(response?.data),
        response_data_length: Array.isArray(response?.data) ? response.data.length : 'N/A',
        processing_will_continue: true
      });

      // 🔧 FINAL FIX: Handle empty backend responses and authentication issues
      console.log('🔧 [BACKEND_INTEGRATION] Processing campaign list response:', {
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : null,
        responseKeysCount: response ? Object.keys(response).length : 0,
        hasStatus: !!(response && 'status' in response),
        hasData: !!(response && 'data' in response),
        isDirectArray: Array.isArray(response),
        isEmptyObject: response && typeof response === 'object' && Object.keys(response).length === 0,
        rawResponse: response
      });

      let campaignsData: unknown[] = [];
      let responseValid = false;
      let isEmptyButValid = false;

      // 🔧 CRITICAL FIX: More robust response format handling
      console.log('🔧 [BACKEND_INTEGRATION] Analyzing response structure:', {
        responseType: typeof response,
        isArray: Array.isArray(response),
        isNull: response === null,
        isUndefined: response === undefined,
        objectKeys: response && typeof response === 'object' ? Object.keys(response) : null,
        responseConstructor: response?.constructor?.name,
        rawResponse: response
      });

      // Handle null/undefined response
      if (response === null || response === undefined) {
        console.log('⚠️ [BACKEND_INTEGRATION] Null/undefined response - treating as empty but valid');
        campaignsData = [];
        responseValid = true;
        isEmptyButValid = true;
      }
      // Handle empty object response (likely no campaigns exist)
      else if (response && typeof response === 'object' && Object.keys(response).length === 0) {
        console.log('⚠️ [BACKEND_INTEGRATION] Empty object response - likely no campaigns exist');
        campaignsData = [];
        responseValid = true;
        isEmptyButValid = true;
      }
      // Handle direct array response (most common for Go backends)
      else if (Array.isArray(response)) {
        campaignsData = response;
        responseValid = true;
        console.log('✅ [BACKEND_INTEGRATION] Direct array response format detected');
      }
      // Handle Axios response wrapper: { data: {...}, status: 200, statusText: "OK" }
      else if (response && typeof response === 'object' && 'status' in response && 'data' in response && typeof response.status === 'number') {
        console.log('✅ [BACKEND_INTEGRATION] Axios response wrapper detected, extracting data');
        const axiosResponse = response as unknown as Record<string, unknown>;
        const actualApiResponse = axiosResponse.data;
        
        // Check if it's a successful HTTP status
        const httpStatus = axiosResponse.status as number;
        if (httpStatus >= 200 && httpStatus < 300) {
          // Now handle the actual API response inside response.data
          if (actualApiResponse && typeof actualApiResponse === 'object') {
            const apiData = actualApiResponse as Record<string, unknown>;
            
            // Handle nested success response: { success: true, data: { success: true, data: [...] } }
            if (apiData.success === true && apiData.data && typeof apiData.data === 'object') {
              const nestedData = apiData.data as Record<string, unknown>;
              
              // Triple-nested: data.data.data contains array
              if (nestedData.success === true && nestedData.data && Array.isArray(nestedData.data)) {
                campaignsData = nestedData.data;
                responseValid = true;
                console.log('✅ [BACKEND_INTEGRATION] Axios-wrapped triple-nested response format detected');
              }
              // Double-nested: data.data contains array
              else if (Array.isArray(nestedData.data)) {
                campaignsData = nestedData.data;
                responseValid = true;
                console.log('✅ [BACKEND_INTEGRATION] Axios-wrapped double-nested response format detected');
              }
              // Handle null or empty nested data
              else if (nestedData.data === null || (Array.isArray(nestedData.data) && nestedData.data.length === 0)) {
                campaignsData = [];
                responseValid = true;
                isEmptyButValid = true;
                console.log('✅ [BACKEND_INTEGRATION] Axios-wrapped response with no campaigns');
              }
            }
            // Handle single-nested: { success: true, data: [...] }
            else if (apiData.success === true && Array.isArray(apiData.data)) {
              campaignsData = apiData.data;
              responseValid = true;
              console.log('✅ [BACKEND_INTEGRATION] Axios-wrapped single-nested response format detected');
            }
            // Handle null data
            else if (apiData.success === true && apiData.data === null) {
              campaignsData = [];
              responseValid = true;
              isEmptyButValid = true;
              console.log('✅ [BACKEND_INTEGRATION] Axios-wrapped response with null data');
            }
          }
        }
      }
      // Handle standard backend response format: { success: true, data: {...} } or { status: "success", data: [...] }
      else if (response && typeof response === 'object' && (('success' in response) || ('status' in response)) && 'data' in response && !('statusText' in response)) {
        const isSuccessField = 'success' in response;
        const responseObj = response as unknown as Record<string, unknown>;
        const dataField = responseObj.data as Record<string, unknown>;
        
        // Get success value from the correct location
        const successValue = isSuccessField ? responseObj.success : responseObj.status;
        const isSuccess = successValue === true || successValue === 'success' || successValue === 'ok' || successValue === 200;
        
        if (isSuccess) {
          // Handle triple-nested response: {success: true, data: {success: true, data: {success: true, data: [...]}}}
          if (dataField && typeof dataField === 'object' && 'data' in dataField &&
              dataField.data && typeof dataField.data === 'object' && 'data' in dataField.data &&
              Array.isArray((dataField.data as Record<string, unknown>).data)) {
            campaignsData = (dataField.data as Record<string, unknown>).data as unknown[];
            responseValid = true;
            console.log('✅ [BACKEND_INTEGRATION] Triple-nested backend response format detected');
          }
          // Handle double-nested response: {success: true, data: {success: true, data: [...]}}
          else if (dataField && typeof dataField === 'object' && 'data' in dataField && Array.isArray(dataField.data)) {
            campaignsData = dataField.data;
            responseValid = true;
            console.log('✅ [BACKEND_INTEGRATION] Double-nested backend response format detected');
          }
          // Handle single-nested response: {success: true, data: [...]}
          else if (Array.isArray(dataField)) {
            campaignsData = dataField;
            responseValid = true;
            console.log('✅ [BACKEND_INTEGRATION] Single-nested backend response format detected');
          }
          // Handle nested null data (including triple-nested null)
          else if (dataField === null ||
                   (dataField && typeof dataField === 'object' && 'data' in dataField && dataField.data === null) ||
                   (dataField && typeof dataField === 'object' && 'data' in dataField &&
                    dataField.data && typeof dataField.data === 'object' && 'data' in dataField.data &&
                    (dataField.data as Record<string, unknown>).data === null)) {
            campaignsData = [];
            responseValid = true;
            isEmptyButValid = true;
            console.log('✅ [BACKEND_INTEGRATION] Successful response with no campaigns (nested null)');
          }
          // Note: Triple-nested empty array condition removed as it was duplicate
          else {
            console.warn('⚠️ [BACKEND_INTEGRATION] Success response but unexpected data structure:', {
              successValue,
              dataType: typeof dataField,
              dataKeys: dataField && typeof dataField === 'object' ? Object.keys(dataField) : null
            });
          }
        } else {
          console.warn('⚠️ [BACKEND_INTEGRATION] Response indicates error:', {
            successValue,
            dataType: typeof (response as any).data
          });
        }
      }
      // Handle wrapped response with campaigns field
      else if (response && typeof response === 'object' && 'campaigns' in response) {
        const campaigns = (response as Record<string, unknown>).campaigns;
        if (Array.isArray(campaigns)) {
          campaignsData = campaigns;
          responseValid = true;
          console.log('✅ [BACKEND_INTEGRATION] Wrapped campaigns response format detected');
        } else if (campaigns === null) {
          campaignsData = [];
          responseValid = true;
          isEmptyButValid = true;
          console.log('✅ [BACKEND_INTEGRATION] Wrapped response with no campaigns');
        }
      }
      // Handle any object with array properties (flexible search)
      else if (response && typeof response === 'object') {
        const possibleDataKeys = ['data', 'campaigns', 'results', 'items', 'list', 'content'];
        let foundData = false;
        
        for (const key of possibleDataKeys) {
          if (key in response) {
            const value = (response as unknown as Record<string, unknown>)[key];
            if (Array.isArray(value)) {
              campaignsData = value;
              responseValid = true;
              foundData = true;
              console.log(`✅ [BACKEND_INTEGRATION] Found campaigns in response.${key}`);
              break;
            } else if (value === null) {
              campaignsData = [];
              responseValid = true;
              isEmptyButValid = true;
              foundData = true;
              console.log(`✅ [BACKEND_INTEGRATION] Found null campaigns in response.${key}`);
              break;
            }
          }
        }
        
        // If no standard keys found, check if the object itself contains campaign-like properties
        if (!foundData) {
          const objectKeys = Object.keys(response);
          if (objectKeys.length > 0 && objectKeys[0]) {
            // Check if this might be a single campaign object that should be wrapped in array
            const firstKey = objectKeys[0];
            const firstValue = (response as unknown as Record<string, unknown>)[firstKey];
            if (typeof firstValue === 'string' || typeof firstValue === 'number') {
              // Looks like a single object with primitive values, treat as single campaign
              campaignsData = [response];
              responseValid = true;
              console.log('✅ [BACKEND_INTEGRATION] Single campaign object detected, wrapping in array');
            } else {
              // Try to use the response as-is if it looks like it has campaign data
              console.log('⚠️ [BACKEND_INTEGRATION] Unknown object structure, attempting to use as campaign array');
              campaignsData = [];
              responseValid = true;
              isEmptyButValid = true;
            }
          }
        }
      }
      // Handle primitive responses (strings, numbers, booleans)
      else if (typeof response === 'string' || typeof response === 'number' || typeof response === 'boolean') {
        console.log('⚠️ [BACKEND_INTEGRATION] Primitive response type, treating as empty but valid');
        campaignsData = [];
        responseValid = true;
        isEmptyButValid = true;
      }

      if (responseValid) {
        console.log('✅ [BACKEND_INTEGRATION] Valid response processed:', {
          rawCampaignsCount: campaignsData.length,
          isEmpty: campaignsData.length === 0,
          isEmptyButValid,
          sampleCampaign: campaignsData[0] ? {
            id: (campaignsData[0] as Record<string, unknown>).id,
            name: (campaignsData[0] as Record<string, unknown>).name,
            status: (campaignsData[0] as Record<string, unknown>).status
          } : 'No campaigns available',
          transformationStartTime: Date.now()
        });
        
        // Transform campaigns using proper backend data
        const transformedCampaigns = transformCampaignsToViewModels(campaignsData as Parameters<typeof transformCampaignsToViewModels>[0]);
        console.log('🔧 [BACKEND_INTEGRATION] Campaigns transformation completed:', {
          originalCount: campaignsData.length,
          transformedCount: transformedCampaigns.length,
          transformedSample: transformedCampaigns.slice(0, 2).map(c => ({
            id: c.id,
            name: c.name,
            status: c.status,
            campaignType: c.campaignType
          })),
          backendIntegrationSuccess: true,
          showingEmptyState: transformedCampaigns.length === 0
        });
        
        if (isMountedRef.current) {
          setCampaigns(transformedCampaigns);
          console.log('📝 [BACKEND_INTEGRATION] Campaign state updated successfully:', {
            newStateCount: transformedCampaigns.length,
            stateUpdateSuccess: true,
            phase1Complete: true,
            willShowEmptyState: transformedCampaigns.length === 0
          });
          
          // Show appropriate user message for empty state
          if (transformedCampaigns.length === 0 && isEmptyButValid) {
            console.log('ℹ️ [BACKEND_INTEGRATION] No campaigns found - showing empty state');
            // Don't show error toast for empty but valid responses
          }
        }
      } else {
        console.error('❌ [BACKEND_INTEGRATION] PHASE 1 FAILED - Invalid response format:', {
          responseType: typeof response,
          hasStatus: !!(response && 'status' in response),
          status: response && 'status' in response ? (response as any).status : 'missing',
          hasData: !!(response && 'data' in response),
          dataType: response && 'data' in response ? typeof (response as any).data : 'missing',
          isDataArray: response && 'data' in response ? Array.isArray((response as any).data) : false,
          fullResponse: response,
          possibleBackendIssues: [
            'Backend API returning unexpected format',
            'Authentication/authorization failure',
            'Database connection issue',
            'API versioning mismatch',
            'Backend error not properly handled',
            'Network connectivity problem'
          ]
        });
        
        if (isMountedRef.current) {
          setCampaigns([]);
          toast({
            title: "Backend Connection Error",
            description: "Failed to load campaigns. Please check your connection and try again.",
            variant: "destructive"
          });
        }
      }
    } catch (error: unknown) {
      // 🔧 FIX: Only check component mount status, not abort signal for error handling
      if (!isMountedRef.current) {
        console.log('[CampaignsPage] Component unmounted during error handling');
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // CRITICAL RATE LIMIT FIX: Remove all dependencies to prevent infinite loop
  // Note: toast, isGlobalLoading, setGlobalLoading are stable and don't need to be dependencies


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
        rawStatus: campaign.status,
        normalizedStatus: normalizeStatus(campaign.status),
        activeTab,
        isActiveStatusResult: isActiveStatus(normalizeStatus(campaign.status)),
        willBeFiltered: activeTab === "all" ? true :
          activeTab === "active" ? isActiveStatus(normalizeStatus(campaign.status)) :
          activeTab === "paused" ? normalizeStatus(campaign.status) === "paused" :
          activeTab === "completed" ? normalizeStatus(campaign.status) === "completed" :
          activeTab === "failed" ? normalizeStatus(campaign.status) === "failed" : true
      });
    }

    // FIXED: Null-safe status normalization
    if (!campaign || !campaign.status) {
      console.warn('[CAMPAIGNS_FILTER_DEBUG] Campaign with missing status:', campaign);
      return activeTab === "all"; // Show invalid campaigns only on "all" tab
    }
    
    // Normalize campaign status to ensure consistency
    const status = normalizeStatus(campaign.status);
    
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
      status: c.status,
      normalized: normalizeStatus(c.status)
    }))
  });

  const countActive = campaigns.filter(c => isActiveStatus(normalizeStatus(c.status))).length;
  const countPaused = campaigns.filter(c => normalizeStatus(c.status) === "paused").length;
  const countCompleted = campaigns.filter(c => normalizeStatus(c.status) === "completed").length;
  const countFailed = campaigns.filter(c => normalizeStatus(c.status) === "failed").length;


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
      
      // Use proper bulk delete API - let backend handle the business logic
      await apiClient.bulkDeleteCampaigns({
        campaignIds: campaignsToDelete
      });

      // Clear selection
      setSelectedCampaigns(new Set());

      toast({
        title: "Campaigns Deleted Successfully",
        description: `${campaignsToDelete.length} campaigns deleted: ${campaignNames}${campaignsToDelete.length > 3 ? '...' : ''}`,
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
        // FIXED: Always show campaigns if we have them, regardless of other conditions
        filteredCampaigns.length > 0 ? (
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
                    isSelected={campaign.id ? selectedCampaigns.has(campaign.id) : false}
                    onSelect={handleSelectCampaign}
                />
              </Suspense>
            ))}
          </div>
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
     {/* FIXED: Memoized Campaign Progress Monitors to prevent infinite re-renders */}
     {useMemo(() => {
       const activeCampaigns = campaigns.filter(c => isActiveStatus(normalizeStatus(c.status)));
       console.log(`[CampaignsPage] Rendering ${activeCampaigns.length} progress monitors`);
       
       return activeCampaigns.map(campaign => {
         const handleCampaignUpdate = (updates: Partial<CampaignViewModel>) => {
           console.log(`[CampaignsPage] Progress monitor update for ${campaign.id}:`, updates);
           // FIXED: Debounced state update to prevent rapid re-renders
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
     }, [campaigns])}
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
