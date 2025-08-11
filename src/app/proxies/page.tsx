"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import PageHeader from '@/components/shared/PageHeader';
import ProxyListItem from '@/components/proxies/ProxyListItem';
import ProxyForm from '@/components/proxies/ProxyForm';
import { BulkOperations } from '@/components/proxies/BulkOperations';
import { ProxyTesting } from '@/components/proxies/ProxyTesting';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, PlusCircle, TestTubeDiagonal, Sparkles, Activity, UploadCloud } from 'lucide-react';
import type { components } from '@/lib/api-client/types';
// CreateProxyRequestProtocolEnum removed - using direct string literals now

type UpdateProxyPayload = any;
import { getProxies, deleteProxy, testProxy, testAllProxies, cleanProxies, updateProxy, createProxy } from '@/lib/services/proxyService.production';
import type { ProxyModelCreationPayload } from '@/lib/services/proxyService.production';
type FrontendProxy = any;

// Keep using OpenAPI Proxy type for components, convert from FrontendProxy as needed
type Proxy = any;

// Convert FrontendProxy to component-expected Proxy type
const convertToComponentProxy = (frontendProxy: FrontendProxy): Proxy => ({
  ...frontendProxy,
  failureCount: frontendProxy.failureCount?.toString(),
  successCount: frontendProxy.successCount?.toString(),
  latencyMs: frontendProxy.latencyMs, // Keep as number now that type is fixed
  port: frontendProxy.port?.toString(),
  protocol: frontendProxy.protocol as "http" | "https" | "socks5" | "socks4" | undefined,
  status: frontendProxy.status as "Active" | "Disabled" | "Testing" | "Failed" | undefined,
});
import { useToast } from '@/hooks/use-toast';
import { useProxyHealth } from '@/lib/hooks/useProxyHealth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
// THIN CLIENT: Removed LoadingStore - backend handles loading state via WebSocket

function ProxiesPageContent() {
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProxy, setEditingProxy] = useState<Proxy | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [pageActionLoading, setPageActionLoading] = useState<string | null>(null);

  const [proxyToDelete, setProxyToDelete] = useState<Proxy | null>(null);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  // Use centralized loading state and proxy health monitoring
  // THIN CLIENT: Removed LoadingStore - simple loading states only
  const [loading, setLoading] = useState(false);
  
  // 🚀 WEBSOCKET PUSH MODEL: Disable polling, use WebSocket events instead
  useProxyHealth({
    enableHealthChecks: false // Disable health checks - use WebSocket events instead
  });

  const fetchProxiesData = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const response = await getProxies();
      if (response.success && response.data) {
        // Ensure data is always an array
        const proxiesArray = Array.isArray(response.data) ? response.data : [];
        setProxies(proxiesArray.map(convertToComponentProxy));
      } else {
        toast({ title: "Error Loading Proxies", description: (typeof response.error === 'string' ? response.error : response.error?.message) || "Failed to load proxies.", variant: "destructive" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast({ title: "Error", description: message, variant: "destructive" });
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  }, [toast]);

  // WebSocket handlers for real-time proxy updates
  const handleProxyListUpdate = useCallback((message: { data: unknown }) => {
    console.log('[ProxiesPage] Received proxy list update:', message.data);
    // Refresh proxy list when CRUD operations occur
    fetchProxiesData(false); // Silent refresh
  }, [fetchProxiesData]);

  const handleProxyStatusUpdate = useCallback((message: { data: { proxyId: string; status: string; health: string } }) => {
    console.log('[ProxiesPage] Received proxy status update:', message.data);
    // Update individual proxy status without full refresh
    const { proxyId, status: _status, health } = message.data; // Prefix status with _ since we only use health
    setProxies(current =>
      current.map(proxy =>
        proxy.id === proxyId
          ? { ...proxy, isHealthy: health === 'healthy' }
          : proxy
      )
    );
  }, []);

  useEffect(() => {
    fetchProxiesData();
    
    // TODO: Replace with Server-Sent Events (SSE) for real-time updates
    // WebSocket infrastructure removed during RTK consolidation
  }, [fetchProxiesData, handleProxyListUpdate, handleProxyStatusUpdate]);

  const handleAddProxy = () => {
    setEditingProxy(null);
    setIsFormOpen(true);
  };

  const handleEditProxy = (proxy: Proxy) => {
    setEditingProxy(proxy);
    setIsFormOpen(true);
  };

  const handleFormSaveSuccess = () => {
    setIsFormOpen(false);
    setEditingProxy(null);
    fetchProxiesData(false); // Re-fetch without full loading spinner
    toast({ title: editingProxy ? "Proxy Updated" : "Proxy Added", description: `Proxy has been successfully ${editingProxy ? 'updated' : 'added'}.` });
  };
  
  const openDeleteConfirmation = (proxy: Proxy) => {
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
      const response = await deleteProxy(proxyToDelete.id);
      if (response.success) {
        toast({ title: "Proxy Deleted", description: "Proxy deleted successfully" });
        setProxies(prev => prev.filter(p => p.id !== proxyToDelete!.id));
      } else {
        toast({ title: "Error Deleting Proxy", description: (typeof response.error === 'string' ? response.error : response.error?.message) || "Failed to delete proxy.", variant: "destructive" });
      }
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
      const response = await testProxy(proxyId);
      if (response.success && response.data) {
        const proxyData = response.data as Proxy;
        toast({ title: "Proxy Test Completed", description: `Status: ${proxyData.lastStatus || 'Unknown'}` });
        setProxies(prev => prev.map(p => p.id === proxyId ? proxyData : p));
      } else {
        toast({ title: "Proxy Test Failed", description: (typeof response.error === 'string' ? response.error : response.error?.message) || "Failed to test proxy.", variant: "destructive" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      toast({ title: "Error Testing Proxy", description: message, variant: "destructive" });
    } finally {
      setActionLoading(prev => ({ ...prev, [`test-${proxyId}`]: false }));
    }
  };
  
  const handleToggleProxyStatus = async (proxy: Proxy, newStatus: 'Active' | 'Disabled') => {
    setActionLoading(prev => ({ ...prev, [`toggle-${proxy.id}`]: true }));
    const payload: UpdateProxyPayload = { isEnabled: newStatus === 'Active' };
    try {
      if (!proxy.id) {
        toast({ title: "Error", description: "Invalid proxy ID", variant: "destructive" });
        return;
      }
      const response = await updateProxy(proxy.id, payload);
      if (response.success && response.data) {
        toast({ title: `Proxy ${newStatus === 'Active' ? 'Enabled' : 'Disabled'}`, description: `Proxy ${proxy.address} is now ${newStatus.toLowerCase()}.`});
        setProxies(prev => prev.map(p => p.id === proxy.id ? response.data! as Proxy : p));
      } else {
        toast({ title: "Error Updating Proxy Status", description: (typeof response.error === 'string' ? response.error : response.error?.message) || "Failed to update proxy status.", variant: "destructive" });
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
      const response = await testAllProxies();
      toast({ title: "Test All Proxies", description: "Testing process initiated/completed." });
      fetchProxiesData(false); // Refresh list to show updated statuses
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
      const response = await cleanProxies();
      if (response.success) {
        toast({ title: "Clean Proxies", description: "Cleaning process completed." });
        fetchProxiesData(false); // Refresh list
      } else {
        toast({ title: "Error Cleaning Proxies", description: (typeof response.error === 'string' ? response.error : response.error?.message) || "Failed to clean proxies.", variant: "destructive" });
      }
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
          const payload: ProxyModelCreationPayload = {
            name: `Proxy ${ip}:${port}`,
            description: `Imported proxy from file`,
            protocol: 'http',
            address: `${ip}:${port}`,
            isEnabled: true
          };

          try {
            const response = await createProxy(payload);
            if (response.success) {
              importedCount++;
            } else {
              errorCount++;
              const errorMsg = typeof response.error === 'string' ? response.error : response.error?.message;
              if (errorMsg?.includes('already exists')) {
                // Skip duplicate error message for cleaner UI
                continue;
              }
              console.warn(`Failed to import proxy ${ip}:${port}:`, response.error);
            }
          } catch (error) {
            errorCount++;
            console.error(`Error importing proxy ${ip}:${port}:`, error);
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
        console.error("File import error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        toast({ title: "Import Failed", description: "Could not parse proxy file: " + errorMessage, variant: "destructive" });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };
  
  const activeProxiesCount = Array.isArray(proxies) ? proxies.filter(p => p.isEnabled).length : 0;

  return (
    <>
      <PageHeader
        title="Proxy Management"
        description="Configure, test, and manage your proxy servers."
        icon={ShieldCheck}
        actionButtons={
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".txt"
              className="hidden"
              aria-label="Import proxy list file"
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" disabled={!!pageActionLoading}>
              <UploadCloud className="mr-2 h-4 w-4" /> Import Proxies
            </Button>
            <Button onClick={handleAddProxy} disabled={!!pageActionLoading}>
              <PlusCircle className="mr-2" /> Add New Proxy
            </Button>
            <Button onClick={handleTestAllProxies} variant="outline" disabled={!!pageActionLoading || !Array.isArray(proxies) || proxies.length === 0} isLoading={pageActionLoading === 'testAll'}>
              <TestTubeDiagonal className={cn("mr-2", pageActionLoading === 'testAll' && "animate-ping")}/> Test All
            </Button>
            <Button onClick={handleCleanProxies} variant="outline" disabled={!!pageActionLoading || !Array.isArray(proxies) || proxies.length === 0} isLoading={pageActionLoading === 'clean'}>
              <Sparkles className={cn("mr-2", pageActionLoading === 'clean' && "animate-pulse")} /> Clean Failed
            </Button>
          </div>
        }
      />

      <Card className="mb-6 shadow-md">
        <CardHeader>
            <CardTitle className="text-lg flex items-center"><Activity className="mr-2 h-5 w-5 text-primary"/>Proxy Status Overview</CardTitle>
        </CardHeader>
        <CardContent>
            {loading ? <Skeleton className="h-6 w-1/2"/> : 
                <p className="text-muted-foreground">
                    <span className="font-semibold text-primary">{activeProxiesCount}</span> out of <span className="font-semibold">{Array.isArray(proxies) ? proxies.length : 0}</span> configured proxies are currently <span className={cn(activeProxiesCount > 0 ? "text-green-600" : "text-muted-foreground")}>active</span>.
                </p>
            }
        </CardContent>
      </Card>


      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-12 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : !Array.isArray(proxies) || proxies.length === 0 ? (
        <Card className="text-center py-10 shadow-sm">
          <CardHeader>
             <ShieldCheck className="mx-auto h-12 w-12 text-muted-foreground" />
             <CardTitle className="mt-2 text-xl">No Proxies Configured</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Get started by adding your first proxy server.</p>
            <Button onClick={handleAddProxy} className="mt-4">
              <PlusCircle className="mr-2"/> Add Proxy
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Configured Proxies</CardTitle>
                <CardDescription>List of all proxy servers available for campaigns.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="allProxies" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="allProxies">All Proxies</TabsTrigger>
                    <TabsTrigger value="bulkOperations">Bulk Operations</TabsTrigger>
                    <TabsTrigger value="proxyTesting">Proxy Testing</TabsTrigger>
                  </TabsList>
                  <TabsContent value="allProxies">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[20%]">Name</TableHead>
                          <TableHead className="w-[20%]">Address</TableHead>
                          <TableHead>Protocol</TableHead>
                          <TableHead>Country</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Last Tested</TableHead>
                          <TableHead>Success/Fail</TableHead>
                          <TableHead>Last Error</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Array.isArray(proxies) && proxies.map(proxy => (
                          <ProxyListItem
                            key={proxy.id}
                            proxy={proxy}
                            onEdit={handleEditProxy}
                            onDelete={openDeleteConfirmation}
                            onTest={handleTestProxy}
                            onToggleStatus={handleToggleProxyStatus}
                            isLoading={actionLoading[`test-${proxy.id}`] || actionLoading[`toggle-${proxy.id}`] || actionLoading[`delete-${proxy.id}`]}
                          />
                        )) || []}
                      </TableBody>
                    </Table>
                  </TabsContent>
                  <TabsContent value="bulkOperations">
                    <BulkOperations
                      proxies={Array.isArray(proxies) ? proxies : []}
                      onProxiesUpdate={() => fetchProxiesData(false)}
                      disabled={pageActionLoading !== null}
                    />
                  </TabsContent>
                  <TabsContent value="proxyTesting">
                    <ProxyTesting
                      proxies={Array.isArray(proxies) ? proxies : []}
                      onProxiesUpdate={() => fetchProxiesData(false)}
                      disabled={pageActionLoading !== null}
                    />
                  </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
      )}

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) setEditingProxy(null); }}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{editingProxy ? 'Edit Proxy' : 'Add New Proxy'}</DialogTitle>
            <DialogDescription>
              {editingProxy ? `Update details for ${editingProxy.address}.` : 'Configure a new proxy server.'}
            </DialogDescription>
          </DialogHeader>
          <ProxyForm
            proxyToEdit={editingProxy}
            onSaveSuccess={handleFormSaveSuccess}
            onCancel={() => { setIsFormOpen(false); setEditingProxy(null); }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmDeleteOpen} onOpenChange={setIsConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this proxy?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Proxy &quot;{proxyToDelete?.address}&quot; will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setProxyToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProxy} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function ProxiesPage() {
  return <ProxiesPageContent />;
}
