// src/components/proxies/BulkOperations.tsx
// Bulk proxy operations component

"use client";

import { useState, useCallback, useMemo } from 'react';
import Button from '@/components/ta/ui/button/Button';
import Checkbox from '@/components/ta/form/input/Checkbox';
import Badge from '@/components/ta/ui/badge/Badge';
import SelectAdapter from '@/components/ta/adapters/SelectAdapter';
import DialogAdapter from '@/components/ta/adapters/DialogAdapter';
import { 
  PlayIcon, 
  StopIcon, 
  TestTubeIcon, 
  TrashBinIcon, 
  CheckSquareIcon, 
  SquareIcon,
  SparklesIcon,
  LoaderIcon
} from '@/icons';
import type { Proxy as ProxyType } from '@/lib/api-client/models/proxy';
// Removed unused types/helpers
import {
  useTestProxyMutation,
  useCleanProxiesMutation,
  useUpdateProxyMutation,
  useDeleteProxyMutation,
  useBulkTestProxiesMutation,
  useBulkUpdateProxiesMutation,
  useBulkDeleteProxiesMutation,
} from '@/store/api/proxyApi';
import { useToast } from '@/hooks/use-toast';

export interface BulkOperationsProps {
  proxies: ProxyType[];
  onProxiesUpdate: () => void;
  disabled?: boolean;
}

type BulkAction = 'enable' | 'disable' | 'test' | 'delete' | 'clean';

interface BulkOperationResult {
  success: boolean;
  successCount: number;
  errorCount: number;
  errors: string[];
}

export function BulkOperations({ proxies, onProxiesUpdate, disabled = false }: BulkOperationsProps) {
  const { toast } = useToast();
  
  // RTK Query mutation hooks - professional way to handle API calls
  const [_testProxy] = useTestProxyMutation();
  const [cleanProxies] = useCleanProxiesMutation();
  const [updateProxy] = useUpdateProxyMutation();
  const [_deleteProxy] = useDeleteProxyMutation();
  const [bulkTestProxies] = useBulkTestProxiesMutation();
  const [_bulkUpdateProxies] = useBulkUpdateProxiesMutation();
  const [bulkDeleteProxies] = useBulkDeleteProxiesMutation();
  
  const [selectedProxyIds, setSelectedProxyIds] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<{ current: number; total: number } | null>(null);

  // Filter and count proxies by status
  const deriveStatus = (p: ProxyType): 'Active' | 'Disabled' | 'Failed' => {
    if (!p.isEnabled) return 'Disabled';
    if (p.isEnabled && p.isHealthy) return 'Active';
    return 'Failed';
  };

  const enabledProxies = proxies.filter(p => p.isEnabled);
  const disabledProxies = proxies.filter(p => !p.isEnabled);
  const failedProxies = proxies.filter(p => deriveStatus(p) === 'Failed');
  const activeProxies = proxies.filter(p => deriveStatus(p) === 'Active');

  // Memoized options for quick select dropdown
  const quickSelectOptions = useMemo(() => [
    { value: 'active', label: `Active (${activeProxies.length})` },
    { value: 'enabled', label: `Enabled (${enabledProxies.length})` },
    { value: 'disabled', label: `Disabled (${disabledProxies.length})` },
    { value: 'failed', label: `Failed (${failedProxies.length})` },
  ], [activeProxies.length, enabledProxies.length, disabledProxies.length, failedProxies.length]);

  const selectedProxies = proxies.filter(p => p.id && selectedProxyIds.has(p.id));
  const selectedCount = selectedProxyIds.size;
  const allSelected = proxies.length > 0 && selectedProxyIds.size === proxies.length;
  const noneSelected = selectedProxyIds.size === 0;

  /**
   * Toggle selection for all proxies
   */
  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedProxyIds(new Set());
    } else {
      // Convert UUID types to strings for selection state
      setSelectedProxyIds(new Set(proxies.map(p => p.id as string).filter(id => !!id)));
    }
  }, [allSelected, proxies]);

  /**
   * Toggle selection for a specific proxy
   */
  const toggleProxySelection = useCallback((proxyId: string) => {
    setSelectedProxyIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(proxyId)) {
        newSet.delete(proxyId);
      } else {
        newSet.add(proxyId);
      }
      return newSet;
    });
  }, []);

  /**
   * Select proxies by status
   */
  const selectByStatus = useCallback((status: 'active' | 'disabled' | 'failed' | 'enabled') => {
    let filteredProxies: ProxyType[] = [];
    
    switch (status) {
      case 'active':
        filteredProxies = activeProxies;
        break;
      case 'disabled':
        filteredProxies = disabledProxies;
        break;
      case 'failed':
        filteredProxies = failedProxies;
        break;
      case 'enabled':
        filteredProxies = enabledProxies;
        break;
    }
    
    setSelectedProxyIds(new Set(filteredProxies.map(p => p.id as string).filter(id => !!id)));
  }, [activeProxies, disabledProxies, failedProxies, enabledProxies]);

  /**
   * Execute bulk action with progress tracking - Enhanced to reduce N+1 patterns
   */
  const executeBulkAction = useCallback(async (action: BulkAction): Promise<BulkOperationResult> => {
    const targetProxies = action === 'clean' ? failedProxies : selectedProxies;
    const total = targetProxies.length;
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    setProcessingProgress({ current: 0, total });

    // Handle clean action separately as it already uses bulk API
    if (action === 'clean') {
      try {
        const response = await cleanProxies();
        if (response.data) {
          successCount = total;
        } else {
          errorCount = total;
          const errorMessage = response.error || 'Unknown error';
          errors.push(`Clean operation failed: ${errorMessage}`);
        }
      } catch (error) {
        errorCount = total;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Clean operation failed: ${errorMessage}`);
      }
      setProcessingProgress({ current: total, total });
      return {
        success: errorCount === 0,
        successCount,
        errorCount,
        errors
      };
    }

    // Use true bulk operations to eliminate N+1 patterns
    const proxyIds = targetProxies.map(proxy => proxy.id).filter(Boolean) as string[];
    
    if (proxyIds.length === 0) {
      errors.push('No valid proxy IDs found');
      errorCount = total;
    } else {
      try {
        switch (action) {
          case 'enable':
          case 'disable':
            // For enable/disable, we need to use individual updates since bulk update requires specific payload
            for (const proxyId of proxyIds) {
              try {
                const updateResponse = await updateProxy({ 
                  proxyId, 
                  request: { isEnabled: action === 'enable' } 
                });
                if ('data' in updateResponse) {
                  successCount++;
                } else {
                  errorCount++;
                  const errMsg = (updateResponse as { error?: unknown }).error ?? 'Update failed';
                  errors.push(`${proxyId}: ${String(errMsg)}`);
                }
              } catch (error) {
                errorCount++;
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                errors.push(`${proxyId}: ${errorMessage}`);
              }
            }
            break;
            
          case 'test':
            {
              const res = await bulkTestProxies({ proxyIds });
              if ('data' in res) {
              successCount = proxyIds.length;
              } else {
              errorCount = proxyIds.length;
                const errMsg = (res as { error?: unknown }).error ?? 'Unknown error';
                errors.push(`Bulk test failed: ${String(errMsg)}`);
              }
            }
            break;
            
          case 'delete':
            {
              const res = await bulkDeleteProxies({ proxyIds });
              if ('data' in res) {
              successCount = proxyIds.length;
              } else {
              errorCount = proxyIds.length;
                const errMsg = (res as { error?: unknown }).error ?? 'Unknown error';
                errors.push(`Bulk delete failed: ${String(errMsg)}`);
              }
            }
            break;
            
          default:
            throw new Error(`Unknown action: ${action}`);
        }
      } catch (error) {
        errorCount = total;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Bulk ${action} operation failed: ${errorMessage}`);
      }
    }
    
    // Update progress to completion
    setProcessingProgress({ current: total, total });

    return {
      success: errorCount === 0,
      successCount,
      errorCount,
      errors
    };
  }, [selectedProxies, failedProxies, cleanProxies, updateProxy, bulkTestProxies, bulkDeleteProxies]);

  /**
   * Handle bulk action execution
   */
  const handleBulkAction = useCallback(async (action: BulkAction) => {
    if (action !== 'clean' && noneSelected) {
      toast({
        title: "No Proxies Selected",
        description: "Please select at least one proxy to perform this action.",
        variant: "destructive"
      });
      return;
    }

    setBulkAction(action);
    setIsConfirmationOpen(true);
  }, [noneSelected, toast]);

  /**
   * Confirm and execute bulk action
   */
  const confirmBulkAction = useCallback(async () => {
    if (!bulkAction) return;

    setIsConfirmationOpen(false);
    setIsProcessing(true);

    try {
      const result = await executeBulkAction(bulkAction);
      
      // Clear selection after successful operations
      if (result.success) {
        setSelectedProxyIds(new Set());
      }
      
      // Show results toast
      if (result.success) {
        toast({
          title: "Bulk Operation Completed",
          description: `Successfully ${bulkAction === 'clean' ? 'cleaned' : `${bulkAction}d`} ${result.successCount} proxy${result.successCount !== 1 ? 'ies' : 'y'}.`,
          variant: "default"
        });
      } else {
        toast({
          title: "Bulk Operation Partially Failed",
          description: `${result.successCount} succeeded, ${result.errorCount} failed. Check details for more information.`,
          variant: "destructive"
        });
        
        // Log detailed errors
        console.error('Bulk operation errors:', result.errors);
      }
      
      // Refresh proxy data
      onProxiesUpdate();
      
    } catch (error) {
      console.error('Bulk operation failed:', error);
      toast({
        title: "Bulk Operation Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
      setProcessingProgress(null);
      setBulkAction(null);
    }
  }, [bulkAction, executeBulkAction, onProxiesUpdate, toast]);

  const getActionDescription = (action: BulkAction): string => {
    switch (action) {
      case 'enable':
        return `enable ${selectedCount} selected proxy${selectedCount !== 1 ? 'ies' : 'y'}`;
      case 'disable':
        return `disable ${selectedCount} selected proxy${selectedCount !== 1 ? 'ies' : 'y'}`;
      case 'test':
        return `test ${selectedCount} selected proxy${selectedCount !== 1 ? 'ies' : 'y'}`;
      case 'delete':
        return `permanently delete ${selectedCount} selected proxy${selectedCount !== 1 ? 'ies' : 'y'}`;
      case 'clean':
        return `remove all ${failedProxies.length} failed proxy${failedProxies.length !== 1 ? 'ies' : 'y'}`;
      default:
        return 'perform this action';
    }
  };

  return (
    <>
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 flex items-center">
            <CheckSquareIcon className="mr-2 h-5 w-5 text-brand-500" />
            Bulk Operations
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Select multiple proxies and perform actions on them simultaneously.
          </p>
        </div>
        <div className="p-6 space-y-4">
          {/* Selection Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              disabled={disabled || proxies.length === 0}
              startIcon={allSelected ? <SquareIcon className="h-4 w-4" /> : <CheckSquareIcon className="h-4 w-4" />}
            >
              {allSelected ? 'Deselect All' : 'Select All'}
            </Button>
            
            <SelectAdapter
              options={quickSelectOptions}
              value=""
              onChange={(value) => selectByStatus(value as 'active' | 'disabled' | 'failed' | 'enabled')}
              placeholder="Quick Select"
              disabled={disabled}
              className="w-[180px]"
            />
            
            <Badge color="light">
              {selectedCount} selected
            </Badge>
          </div>

          {/* Bulk Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('enable')}
              disabled={disabled || noneSelected || isProcessing}
              startIcon={<PlayIcon className="h-4 w-4" />}
            >
              Enable
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('disable')}
              disabled={disabled || noneSelected || isProcessing}
              startIcon={<StopIcon className="h-4 w-4" />}
            >
              Disable
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('test')}
              disabled={disabled || noneSelected || isProcessing}
              startIcon={<TestTubeIcon className="h-4 w-4" />}
            >
              Test
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('clean')}
              disabled={disabled || failedProxies.length === 0 || isProcessing}
              startIcon={<SparklesIcon className="h-4 w-4" />}
            >
              Clean Failed ({failedProxies.length})
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('delete')}
              disabled={disabled || noneSelected || isProcessing}
              startIcon={<TrashBinIcon className="h-4 w-4" />}
              className="text-error-500 hover:bg-error-50 dark:hover:bg-error-500/10"
            >
              Delete
            </Button>
          </div>

          {/* Processing Progress */}
          {isProcessing && processingProgress && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <LoaderIcon className="h-4 w-4 animate-spin" />
              <span>
                Processing: {processingProgress.current} / {processingProgress.total}
              </span>
            </div>
          )}

          {/* Proxy Selection Checkboxes */}
          {proxies.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {proxies.map(proxy => {
                  const status = deriveStatus(proxy);
                  return (
                    <div
                    key={proxy.id}
                    className="flex items-center space-x-2 p-2 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                  >
                    <Checkbox
                      checked={proxy.id ? selectedProxyIds.has(proxy.id) : false}
                      onChange={() => proxy.id && toggleProxySelection(proxy.id)}
                      disabled={disabled || isProcessing}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{proxy.address}</p>
                      <div className="flex items-center gap-1">
                        <Badge
                          color={status === 'Active' ? 'success' : 
                                  status === 'Failed' ? 'error' : 'light'}
                          size="sm"
                        >
                          {status}
                        </Badge>
                        <Badge color="light" size="sm">
                          {proxy.protocol}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <DialogAdapter
        isOpen={isConfirmationOpen}
        onOpenChange={setIsConfirmationOpen}
        title="Confirm Bulk Action"
        description={`Are you sure you want to ${bulkAction ? getActionDescription(bulkAction) : 'perform this action'}?`}
        onConfirm={confirmBulkAction}
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        destructive={bulkAction === 'delete'}
      >
        {bulkAction === 'delete' && (
          <span className="block mt-2 text-error-500 font-medium">
            This action cannot be undone.
          </span>
        )}
      </DialogAdapter>
    </>
  );
}
