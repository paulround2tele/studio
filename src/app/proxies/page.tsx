"use client";

import React, { useState, useRef } from 'react';
import { 
  ShieldCheckIcon, 
  PlusCircleIcon, 
  TestTubeIcon, 
  SparklesIcon, 
  ActivityIcon, 
  UploadCloudIcon,
  TrashBinIcon 
} from '@/icons';

// TailAdmin components
import PageBreadcrumb from '@/components/ta/common/PageBreadCrumb';
import Button from '@/components/ta/ui/button/Button';
import { Modal } from '@/components/ta/ui/modal';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ta/ui/table';

// Shared layout components (TailAdmin-compliant)
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardEmptyState } from '@/components/shared/Card';

// Domain components
import ProxyListItem from '@/components/proxies/ProxyListItem';
import ProxyForm from '@/components/proxies/ProxyForm';
import { BulkOperations } from '@/components/proxies/BulkOperations';
import { ProxyTesting } from '@/components/proxies/ProxyTesting';

// API & hooks
import { ProxiesApi } from '@/lib/api-client/apis/proxies-api';
import { ProxyProtocol } from '@/lib/api-client/models/proxy-protocol';
import { apiConfiguration } from '@/lib/api/config';
import type { Proxy as GeneratedProxy } from '@/lib/api-client/models/proxy';
import { useToast } from '@/hooks/use-toast';
import { useProxyHealth } from '@/lib/hooks/useProxyHealth';
import { useEffect, useCallback } from 'react';

type ProxyItem = GeneratedProxy;

// Instantiate generated API client
const proxiesApi = new ProxiesApi(apiConfiguration);

// ============================================================================
// TAB NAVIGATION COMPONENT (TailAdmin Pattern)
// ============================================================================
interface TabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string }[];
}

function TabNav({ activeTab, onTabChange, tabs }: TabNavProps) {
  return (
    <div className="flex rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-1 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === tab.id
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// LOADING SKELETON (TailAdmin Pattern)
// ============================================================================
function TableSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      ))}
    </div>
  );
}

function MetricSkeleton() {
  return <div className="h-6 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />;
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
function ProxiesPageContent() {
  // State
  const [proxies, setProxies] = useState<ProxyItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProxy, setEditingProxy] = useState<ProxyItem | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [pageActionLoading, setPageActionLoading] = useState<string | null>(null);
  const [proxyToDelete, setProxyToDelete] = useState<ProxyItem | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('allProxies');
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  // SSE Push model
  useProxyHealth({ enableHealthChecks: false });

  // Data fetching
  const fetchProxiesData = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const response = await proxiesApi.proxiesList();
      const data = response?.data;
      const proxiesArray: ProxyItem[] = Array.isArray(data) ? data : [];
      setProxies(proxiesArray);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProxiesData();
  }, [fetchProxiesData]);

  // Handlers
  const handleAddProxy = () => {
    setEditingProxy(null);
    setIsFormOpen(true);
  };

  const handleEditProxy = (proxy: ProxyItem) => {
    setEditingProxy(proxy);
    setIsFormOpen(true);
  };

  const handleFormSaveSuccess = () => {
    setIsFormOpen(false);
    setEditingProxy(null);
    fetchProxiesData(false);
    toast({ title: editingProxy ? "Proxy Updated" : "Proxy Added", description: `Proxy has been successfully ${editingProxy ? 'updated' : 'added'}.` });
  };

  const openDeleteConfirmation = (proxy: ProxyItem) => {
    setProxyToDelete(proxy);
    setIsConfirmDeleteOpen(true);
  };

  const handleDeleteProxy = async () => {
    if (!proxyToDelete) return;
    setActionLoading(prev => ({ ...prev, [`delete-${proxyToDelete.id}`]: true }));
    try {
      if (!proxyToDelete.id) {
        toast({ title: "Error", description: "Invalid proxy ID", variant: "destructive" });
        return;
      }
      await proxiesApi.proxiesDelete(proxyToDelete.id);
      toast({ title: "Proxy Deleted", description: "Proxy deleted successfully" });
      setProxies(prev => prev.filter(p => p?.id !== proxyToDelete.id));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${proxyToDelete!.id}`]: false }));
      setIsConfirmDeleteOpen(false);
      setProxyToDelete(null);
    }
  };

  const handleTestProxy = async (proxyId: string) => {
    setActionLoading(prev => ({ ...prev, [`test-${proxyId}`]: true }));
    try {
      const response = await proxiesApi.proxiesTest(proxyId);
      if (response?.data) {
        toast({ title: "Proxy Test Completed", description: "Test completed successfully" });
        fetchProxiesData(false);
      } else {
        toast({ title: "Proxy Test Failed", description: "Failed to test proxy.", variant: "destructive" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast({ title: "Error Testing Proxy", description: message, variant: "destructive" });
    } finally {
      setActionLoading(prev => ({ ...prev, [`test-${proxyId}`]: false }));
    }
  };

  const handleToggleProxyStatus = async (proxy: ProxyItem, newStatus: 'Active' | 'Disabled') => {
    setActionLoading(prev => ({ ...prev, [`toggle-${proxy.id}`]: true }));
    const payload = { isEnabled: newStatus === 'Active' };
    try {
      if (!proxy.id) {
        toast({ title: "Error", description: "Invalid proxy ID", variant: "destructive" });
        return;
      }
      const response = await proxiesApi.proxiesUpdate(proxy.id!, payload);
      if (response?.data) {
        toast({ title: `Proxy ${newStatus === 'Active' ? 'Enabled' : 'Disabled'}`, description: `Proxy ${proxy.address} is now ${newStatus.toLowerCase()}.` });
        setProxies(prev => prev.map(p => p?.id === proxy.id ? { ...p, ...response.data } : p));
      } else {
        toast({ title: "Error Updating Proxy Status", description: "Failed to update proxy status.", variant: "destructive" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      setActionLoading(prev => ({ ...prev, [`toggle-${proxy.id}`]: false }));
    }
  };

  const handleTestAllProxies = async () => {
    setPageActionLoading("testAll");
    try {
      const proxyIds = proxies.map(proxy => proxy?.id).filter((id): id is string => typeof id === 'string');
      if (proxyIds.length === 0) {
        toast({ title: "No Proxies", description: "No proxies available to test.", variant: "destructive" });
        return;
      }
      await proxiesApi.proxiesBulkTest({ proxyIds });
      toast({ title: "Test All Proxies", description: "Testing process initiated/completed." });
      fetchProxiesData(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast({ title: "Error Testing All Proxies", description: message, variant: "destructive" });
    } finally {
      setPageActionLoading(null);
    }
  };

  const handleCleanProxies = async () => {
    setPageActionLoading("clean");
    try {
      const disabledProxies = proxies.filter(proxy => !proxy?.isEnabled);
      const proxyIds = disabledProxies.map(proxy => proxy?.id).filter((id): id is string => typeof id === 'string');
      
      if (proxyIds.length === 0) {
        toast({ title: "No Disabled Proxies", description: "No disabled proxies to clean.", variant: "destructive" });
        return;
      }
      
      await proxiesApi.proxiesBulkDelete({ proxyIds });
      toast({ title: "Clean Proxies", description: `Cleaned ${proxyIds.length} disabled proxies.` });
      fetchProxiesData(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast({ title: "Error Cleaning Proxies", description: message, variant: "destructive" });
    } finally {
      setPageActionLoading(null);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const lines = content.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('#'));
        let importedCount = 0;
        let errorCount = 0;

        for (const line of lines) {
          const match = line.match(/^(\d+\.\d+\.\d+\.\d+):(\d+)$/);
          if (!match) {
            errorCount++;
            continue;
          }

          const [, ip, port] = match;
          const payload = {
            name: `Proxy ${ip}:${port}`,
            description: `Imported proxy from file`,
            protocol: ProxyProtocol.http,
            address: `${ip}:${port}`,
            isEnabled: true
          };

          try {
            const response = await proxiesApi.proxiesCreate(payload);
            if (response.data) {
              importedCount++;
            } else {
              errorCount++;
            }
          } catch {
            errorCount++;
          }
        }

        if (importedCount > 0) {
          toast({ title: "Import Successful", description: `${importedCount} proxy(ies) imported successfully.` });
          fetchProxiesData(false);
        }
        if (errorCount > 0) {
          toast({
            title: "Import Notice",
            description: `${errorCount} proxy(ies) were skipped (duplicates or invalid format).`,
            variant: importedCount > 0 ? "default" : "destructive"
          });
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        toast({ title: "Import Failed", description: "Could not parse proxy file: " + errorMessage, variant: "destructive" });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // Computed values
  const activeProxiesCount = Array.isArray(proxies) ? proxies.filter((p: ProxyItem) => Boolean(p?.isEnabled)).length : 0;
  const totalProxiesCount = Array.isArray(proxies) ? proxies.length : 0;

  const tabs = [
    { id: 'allProxies', label: 'All Proxies' },
    { id: 'bulkOperations', label: 'Bulk Operations' },
    { id: 'proxyTesting', label: 'Proxy Testing' },
  ];

  // ===========================================================================
  // RENDER - TailAdmin Layout Structure
  // ===========================================================================
  return (
    <>
      {/* ===== BREADCRUMB (TailAdmin Pattern) ===== */}
      <PageBreadcrumb pageTitle="Proxy Management" />

      {/* ===== MAIN CONTENT with space-y-6 ===== */}
      <div className="space-y-6">

        {/* ===== HEADER ACTIONS BAR ===== */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure, test, and manage your proxy servers.
          </p>
          <div className="flex flex-wrap gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".txt"
              className="hidden"
              aria-label="Import proxy list file"
            />
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline" 
              disabled={!!pageActionLoading} 
              startIcon={<UploadCloudIcon className="h-4 w-4" />}
            >
              Import
            </Button>
            <Button 
              onClick={handleAddProxy} 
              disabled={!!pageActionLoading} 
              startIcon={<PlusCircleIcon className="h-4 w-4" />}
            >
              Add Proxy
            </Button>
            <Button 
              onClick={handleTestAllProxies} 
              variant="outline" 
              disabled={!!pageActionLoading || totalProxiesCount === 0} 
              startIcon={<TestTubeIcon className={`h-4 w-4 ${pageActionLoading === 'testAll' ? 'animate-ping' : ''}`} />}
            >
              Test All
            </Button>
            <Button 
              onClick={handleCleanProxies} 
              variant="outline" 
              disabled={!!pageActionLoading || totalProxiesCount === 0} 
              startIcon={<SparklesIcon className={`h-4 w-4 ${pageActionLoading === 'clean' ? 'animate-pulse' : ''}`} />}
            >
              Clean Failed
            </Button>
          </div>
        </div>

        {/* ===== STATUS OVERVIEW CARD (TailAdmin Pattern) ===== */}
        <Card>
          <CardHeader>
            <CardTitle icon={<ActivityIcon className="h-5 w-5 text-brand-500" />}>
              Proxy Status Overview
            </CardTitle>
          </CardHeader>
          <CardBody>
            {loading ? (
              <MetricSkeleton />
            ) : (
              <p className="text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-brand-500">{activeProxiesCount}</span> out of{' '}
                <span className="font-semibold">{totalProxiesCount}</span> configured proxies are currently{' '}
                <span className={activeProxiesCount > 0 ? "text-success-600 dark:text-success-500" : "text-gray-500"}>
                  active
                </span>.
              </p>
            )}
          </CardBody>
        </Card>

        {/* ===== MAIN CONTENT CARD (TailAdmin Pattern) ===== */}
        {loading ? (
          <Card>
            <CardBody>
              <TableSkeleton />
            </CardBody>
          </Card>
        ) : totalProxiesCount === 0 ? (
          <Card>
            <CardBody>
              <CardEmptyState
                icon={<ShieldCheckIcon className="h-12 w-12" />}
                title="No Proxies Configured"
                description="Get started by adding your first proxy server."
                action={
                  <Button onClick={handleAddProxy} startIcon={<PlusCircleIcon className="h-4 w-4" />}>
                    Add Proxy
                  </Button>
                }
              />
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Configured Proxies</CardTitle>
                <CardDescription>List of all proxy servers available for campaigns.</CardDescription>
              </div>
            </CardHeader>
            <CardBody>
              {/* Tab Navigation */}
              <div className="mb-6">
                <TabNav activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
              </div>

              {/* Tab Content */}
              {activeTab === 'allProxies' && (
                <div className="-mx-6 -mb-6 overflow-x-auto">
                  <Table className="w-full">
                    <TableHeader className="border-t border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30">
                      <TableRow>
                        <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Name</TableCell>
                        <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Address</TableCell>
                        <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Protocol</TableCell>
                        <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Country</TableCell>
                        <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</TableCell>
                        <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Last Tested</TableCell>
                        <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Success/Fail</TableCell>
                        <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Last Error</TableCell>
                        <TableCell isHeader className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Actions</TableCell>
                      </TableRow>
                    </TableHeader>
                      <TableBody>
                        {proxies.map((proxy: ProxyItem) => {
                          if (!proxy?.id) return null;
                          return (
                            <ProxyListItem
                              key={proxy.id}
                              proxy={proxy}
                              onEdit={handleEditProxy}
                              onDelete={openDeleteConfirmation}
                              onTest={handleTestProxy}
                              onToggleStatus={handleToggleProxyStatus}
                              isLoading={Boolean(actionLoading[`test-${proxy.id}`] || actionLoading[`toggle-${proxy.id}`] || actionLoading[`delete-${proxy.id}`])}
                            />
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {activeTab === 'bulkOperations' && (
                  <BulkOperations
                    proxies={proxies}
                    onProxiesUpdate={() => fetchProxiesData(false)}
                    disabled={pageActionLoading !== null}
                  />
                )}

                {activeTab === 'proxyTesting' && (
                  <ProxyTesting
                    proxies={proxies}
                    onProxiesUpdate={() => fetchProxiesData(false)}
                    disabled={pageActionLoading !== null}
                  />
                )}
            </CardBody>
          </Card>
        )}

      </div>

      {/* ===== ADD/EDIT PROXY MODAL (TailAdmin Pattern) ===== */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => { setIsFormOpen(false); setEditingProxy(null); }}
        className="max-w-lg p-6 lg:p-8"
      >
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {editingProxy ? 'Edit Proxy' : 'Add New Proxy'}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {editingProxy ? `Update details for ${editingProxy.address}.` : 'Configure a new proxy server.'}
          </p>
        </div>
        <ProxyForm
          proxyToEdit={editingProxy}
          onSaveSuccess={handleFormSaveSuccess}
          onCancel={() => { setIsFormOpen(false); setEditingProxy(null); }}
        />
      </Modal>

      {/* ===== DELETE CONFIRMATION MODAL (TailAdmin Pattern) ===== */}
      <Modal
        isOpen={isConfirmDeleteOpen}
        onClose={() => { setIsConfirmDeleteOpen(false); setProxyToDelete(null); }}
        className="max-w-md p-6 lg:p-8"
      >
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/15">
            <TrashBinIcon className="h-6 w-6 text-error-500" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            Delete this proxy?
          </h3>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone. Proxy &ldquo;{proxyToDelete?.address}&rdquo; will be permanently removed.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => { setIsConfirmDeleteOpen(false); setProxyToDelete(null); }}>
              Cancel
            </Button>
            <Button onClick={handleDeleteProxy} className="bg-error-500 hover:bg-error-600">
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

export default function ProxiesPage() {
  return <ProxiesPageContent />;
}
