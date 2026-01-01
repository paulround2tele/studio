"use client";

import Link from 'next/link';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { PlusCircleIcon, GlobeIcon, WifiIcon, SearchIcon as TaSearchIcon, UploadCloudIcon } from '@/icons';
import { z } from 'zod';

// TailAdmin components
import PageBreadcrumb from '@/components/ta/common/PageBreadCrumb';
import Button from '@/components/ta/ui/button/Button';
import Input from '@/components/ta/form/input/InputField';

// Shared layout components (TailAdmin-compliant)
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardEmptyState } from '@/components/shared/Card';

// Domain components & API
import PersonaListItem from '@/components/personas/PersonaListItem';
import { PersonasApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import { useToast } from '@/hooks/use-toast';

// Types
import type { PersonaResponse as ApiPersonaResponse } from '@/lib/api-client/models/persona-response';
import { PersonaType } from '@/lib/api-client/models/persona-type';
import type { CreatePersonaRequest } from '@/lib/api-client/models/create-persona-request';
import { PersonaType as PersonaTypeEnum } from '@/lib/api-client/models/persona-type';

// Local types
type LocalPersona = ApiPersonaResponse & { status?: 'Active' | 'Disabled' | 'Testing' | 'Failed'; tags?: string[] };
type HttpPersona = LocalPersona & { personaType: 'http' };
type DnsPersona = LocalPersona & { personaType: 'dns' };

interface BaseCreatePersonaRequest {
  name: string;
  personaType: 'http' | 'dns';
  description?: string;
  configDetails: Record<string, unknown>;
  isEnabled?: boolean;
}

type CreateHttpPersonaPayload = BaseCreatePersonaRequest & { personaType: 'http' };
type CreateDnsPersonaPayload = BaseCreatePersonaRequest & { personaType: 'dns' };
type PersonaStatus = 'Active' | 'Disabled' | 'Testing' | 'Failed';

// Professional API client initialization
const config = apiConfiguration;
const personasApi = new PersonasApi(config);

// ============================================================================
// ZOD SCHEMAS (unchanged)
// ============================================================================
const HttpPersonaImportSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  personaType: z.literal('http').optional(),
  userAgent: z.string().optional(),
  headers: z.record(z.string()).optional(),
  headerOrder: z.array(z.string()).optional(),
  tlsClientHello: z.object({
    minVersion: z.string().optional(),
    maxVersion: z.string().optional(),
    cipherSuites: z.array(z.string()).optional(),
    curvePreferences: z.array(z.string()).optional(),
    ja3: z.string().optional(),
  }).optional().nullable(),
  http2Settings: z.record(z.any()).optional().nullable(),
  cookieHandling: z.object({
    mode: z.string().optional(),
  }).optional().nullable(),
  allowInsecureTls: z.boolean().optional().default(false),
  requestTimeoutSec: z.number().int().positive().optional().default(30),
  maxRedirects: z.number().int().min(0).optional().default(5),
  notes: z.string().optional(),
});

const DnsPersonaConfigImportSchema = z.object({
  resolvers: z.array(z.string()).min(1),
  useSystemResolvers: z.boolean().optional(),
  queryTimeoutSeconds: z.number().int().positive(),
  maxDomainsPerRequest: z.number().int().positive().optional(),
  resolverStrategy: z.enum(["random_rotation", "weighted_rotation", "sequential_failover"]),
  resolversWeighted: z.record(z.number()).optional().nullable(),
  resolversPreferredOrder: z.array(z.string()).optional().nullable(),
  concurrentQueriesPerDomain: z.number().int().positive(),
  queryDelayMinMs: z.number().int().min(0).optional(),
  queryDelayMaxMs: z.number().int().min(0).optional(),
  maxConcurrentGoroutines: z.number().int().positive(),
  rateLimitDps: z.number().positive().optional(),
  rateLimitBurst: z.number().int().positive().optional(),
});

const DnsPersonaImportSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  personaType: z.literal('dns').optional(),
  config: DnsPersonaConfigImportSchema,
});

// ============================================================================
// TAB NAVIGATION COMPONENT (TailAdmin Pattern)
// ============================================================================
interface TabNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string; icon?: React.ReactNode; count?: number }[];
}

function TabNav({ activeTab, onTabChange, tabs }: TabNavProps) {
  return (
    <div className="flex rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-1 w-fit">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            activeTab === tab.id
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {tab.icon}
          {tab.label}
          {tab.count !== undefined && ` (${tab.count})`}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// LOADING SKELETON (TailAdmin Pattern)
// ============================================================================
function PersonaGridSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03] animate-pulse">
          <div className="mb-4">
            <div className="h-6 w-3/4 mb-2 bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="space-y-3">
            <div className="h-20 w-full bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="h-10 w-2/3 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          <div className="mt-4">
            <div className="h-4 w-1/4 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
function PersonasPageContent() {
  // State
  const [httpPersonas, setHttpPersonas] = useState<HttpPersona[]>([]);
  const [dnsPersonas, setDnsPersonas] = useState<DnsPersona[]>([]);
  const [activeTab, setActiveTab] = useState<string>('http');
  const [searchTermHttp, setSearchTermHttp] = useState("");
  const [searchTermDns, setSearchTermDns] = useState("");
  const [actionLoading, setActionLoading] = useState<Record<string, 'test' | 'toggle' | 'delete' | null>>({});
  const [loadingHttp, setLoadingHttp] = useState(false);
  const [loadingDns, setLoadingDns] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { toast } = useToast();

  // Data fetching
  const fetchPersonasData = useCallback(async (type: 'http' | 'dns', showLoading = true) => {
    if (showLoading) {
      if (type === 'http') setLoadingHttp(true);
      else setLoadingDns(true);
    }
    
    try {
      const response = await personasApi.personasList(undefined, undefined, undefined, type as PersonaType);
      if (response.data) {
        const personasData = Array.isArray(response.data) ? response.data : [];
        const personasWithStatus = personasData.map(persona => ({
          ...persona,
          status: persona.isEnabled ? 'Active' : 'Disabled',
          id: persona.id || '',
          name: persona.name || '',
          personaType: persona.personaType || type
        }));
        
        if (type === 'http') setHttpPersonas(personasWithStatus as HttpPersona[]);
        else setDnsPersonas(personasWithStatus as DnsPersona[]);
      } else {
        if (type === 'http') setHttpPersonas([]);
        else setDnsPersonas([]);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : `Failed to load ${type.toUpperCase()} personas.`;
      toast({
        title: `Error Loading ${type.toUpperCase()} Personas`,
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      if (showLoading) {
        if (type === 'http') setLoadingHttp(false);
        else setLoadingDns(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    fetchPersonasData(activeTab as 'http' | 'dns');
  }, [activeTab, fetchPersonasData]);

  // Handlers
  const handleDeletePersona = async (personaId: string, personaType: 'http' | 'dns') => {
    setActionLoading(prev => ({ ...prev, [personaId]: 'delete' }));
    try {
      const response = await personasApi.personasDelete(personaId);
      if (response.status >= 200) {
        toast({ title: "Persona Deleted", description: "Persona successfully deleted." });
        fetchPersonasData(personaType, false);
      } else {
        toast({ title: "Error", description: "Failed to delete persona.", variant: "destructive" });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while deleting persona.";
      toast({ title: "Error", description: errorMessage, variant: "destructive" });
    } finally {
      setActionLoading(prev => ({ ...prev, [personaId]: null }));
    }
  };

  const handleTestPersona = async (personaId: string, personaType: 'http' | 'dns') => {
    setActionLoading(prev => ({ ...prev, [personaId]: 'test' }));
    try {
      const response = await personasApi.personasTest(personaId);
      if (response.status >= 200) {
        const personaName = (response.data as { personaId?: string; name?: string } | undefined)?.personaId
          || (response.data as { name?: string } | undefined)?.name
          || 'Persona';
        toast({ title: "Persona Test Complete", description: `Test for ${personaName} completed.` });
        fetchPersonasData(personaType, false);
      } else {
        toast({ title: "Persona Test Failed", description: "Could not complete persona test.", variant: "destructive" });
        fetchPersonasData(personaType, false);
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to test persona";
      toast({ title: "Error Testing Persona", description: errorMessage, variant: "destructive" });
      fetchPersonasData(personaType, false);
    } finally {
      setActionLoading(prev => ({ ...prev, [personaId]: null }));
    }
  };

  const handleTogglePersonaStatus = async (personaId: string, personaType: 'http' | 'dns', newStatus: PersonaStatus | undefined) => {
    if (!newStatus) return;
    
    setActionLoading(prev => ({ ...prev, [personaId]: 'toggle' }));
    try {
      const isEnabled = newStatus === 'Active';
      const response = await personasApi.personasUpdate(personaId, { isEnabled });
      if (response.status >= 200) {
        const updated = response.data;
        toast({ title: `Persona Status Updated`, description: `${updated?.name ?? 'Persona'} is now ${newStatus}.` });
        fetchPersonasData(personaType, false);
      } else {
        toast({ title: "Error Updating Status", description: "Could not update persona status.", variant: "destructive" });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update persona status";
      toast({ title: "Error Updating Status", description: errorMessage, variant: "destructive" });
    } finally {
      setActionLoading(prev => ({ ...prev, [personaId]: null }));
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const jsonData = JSON.parse(content);
        const itemsToImport = Array.isArray(jsonData) ? jsonData : [jsonData];
        let importedCount = 0;
        let errorCount = 0;

        for (const item of itemsToImport) {
          const personaTypeForImport = item.personaType || activeTab;
          if (item.personaType && personaTypeForImport !== activeTab) {
            toast({ title: "Import Error", description: `Mismatched persona type in file for item: ${item.name || 'Unknown'}. Skipping. Active tab is ${activeTab}.`, variant: "destructive" });
            errorCount++;
            continue;
          }
          const itemWithExplicitType = { ...item, personaType: personaTypeForImport };
          const schema = personaTypeForImport === 'http' ? HttpPersonaImportSchema : DnsPersonaImportSchema;
          const validationResult = schema.safeParse(itemWithExplicitType);

          if (!validationResult.success) {
            console.error("Import validation error:", validationResult.error.flatten());
            toast({ title: "Import Validation Error", description: `Invalid structure for persona: ${item.name || 'Unknown'}. Check console. Skipping.`, variant: "destructive" });
            errorCount++;
            continue;
          }

          let createPayload: CreateHttpPersonaPayload | CreateDnsPersonaPayload;
          if (personaTypeForImport === 'http') {
            const validatedData = validationResult.data as z.infer<typeof HttpPersonaImportSchema>;
            createPayload = {
              name: validatedData.name,
              personaType: 'http' as const,
              isEnabled: true,
              description: validatedData.description,
              configDetails: {
                userAgent: validatedData.userAgent || "",
                headers: validatedData.headers,
                headerOrder: validatedData.headerOrder,
                allowInsecureTls: validatedData.allowInsecureTls,
                requestTimeoutSec: validatedData.requestTimeoutSec,
                maxRedirects: validatedData.maxRedirects
              }
            };
          } else {
            const validatedData = validationResult.data as z.infer<typeof DnsPersonaImportSchema>;
            const mapResolverStrategy = (oldStrategy: string): "round_robin" | "random" | "weighted" | "priority" => {
              switch (oldStrategy) {
                case "random_rotation": return "random";
                case "weighted_rotation": return "weighted";
                case "sequential_failover": return "priority";
                default: return "round_robin";
              }
            };
            
            createPayload = {
              name: validatedData.name,
              personaType: 'dns' as const,
              isEnabled: true,
              description: validatedData.description,
              configDetails: {
                resolvers: validatedData.config.resolvers,
                useSystemResolvers: validatedData.config.useSystemResolvers ?? false,
                queryTimeoutSeconds: validatedData.config.queryTimeoutSeconds,
                maxDomainsPerRequest: validatedData.config.maxDomainsPerRequest ?? 100,
                resolverStrategy: mapResolverStrategy(validatedData.config.resolverStrategy),
                resolversWeighted: validatedData.config.resolversWeighted || undefined,
                resolversPreferredOrder: validatedData.config.resolversPreferredOrder || undefined,
                concurrentQueriesPerDomain: validatedData.config.concurrentQueriesPerDomain,
                queryDelayMinMs: validatedData.config.queryDelayMinMs ?? 100,
                queryDelayMaxMs: validatedData.config.queryDelayMaxMs ?? 1000,
                maxConcurrentGoroutines: validatedData.config.maxConcurrentGoroutines,
                rateLimitDps: validatedData.config.rateLimitDps ?? 100.0,
                rateLimitBurst: validatedData.config.rateLimitBurst ?? 10,
              },
            };
          }
          
          try {
            const requestPayload: CreatePersonaRequest = {
              name: createPayload.name,
              personaType: createPayload.personaType === 'http' ? PersonaTypeEnum.http : PersonaTypeEnum.dns,
              description: createPayload.description,
              isEnabled: createPayload.isEnabled,
              configDetails: {
                personaType: createPayload.personaType,
                ...(createPayload.configDetails as Record<string, unknown>)
              } as unknown as CreatePersonaRequest['configDetails']
            };
            const response = await personasApi.personasCreate(requestPayload);
            if (response.data) {
              importedCount++;
            } else {
              errorCount++;
              toast({ title: `Error Importing ${item.name || 'Persona'}`, description: "Failed to import persona.", variant: "destructive" });
            }
          } catch (importError: unknown) {
            let status: number | undefined;
            if (importError && typeof importError === 'object' && 'response' in importError) {
              const response = importError.response;
              if (response && typeof response === 'object' && 'status' in response) {
                status = Number(response.status);
              }
            }
            
            if (status === 409) continue; // Already exists
            
            errorCount++;
            let msg = 'Unknown error';
            if (importError && typeof importError === 'object') {
              if ('response' in importError && importError.response && typeof importError.response === 'object' && 'data' in importError.response) {
                const data = importError.response.data;
                if (data && typeof data === 'object' && 'error' in data) {
                  const error = data.error;
                  if (error && typeof error === 'object' && 'message' in error) {
                    msg = String(error.message);
                  }
                }
              } else if ('message' in importError) {
                msg = String(importError.message);
              }
            }
            toast({ title: `Error Importing ${item.name || 'Persona'}`, description: msg, variant: "destructive" });
          }
        }
        
        if (importedCount > 0) {
          toast({ title: "Import Successful", description: `${importedCount} persona(s) imported successfully.` });
          fetchPersonasData(activeTab as 'http' | 'dns', false);
        }
        if (errorCount > 0 && importedCount === 0) {
          toast({ title: "Import Failed", description: `No personas were imported due to errors.`, variant: "destructive" });
        }
      } catch (error: unknown) {
        console.error("File import error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        toast({ title: "Import Failed", description: "Could not parse JSON file or an error occurred: " + errorMessage, variant: "destructive" });
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  // Filter logic
  const filterPersonas = (personas: LocalPersona[], searchTerm: string): LocalPersona[] => {
    if (!searchTerm.trim()) return personas;
    const lowerSearchTerm = searchTerm.toLowerCase();
    return personas.filter(p =>
      (p.name && p.name.toLowerCase().includes(lowerSearchTerm)) ||
      (p.description && p.description.toLowerCase().includes(lowerSearchTerm))
    );
  };

  const filteredHttpPersonas = useMemo(() => filterPersonas(httpPersonas, searchTermHttp), [httpPersonas, searchTermHttp]);
  const filteredDnsPersonas = useMemo(() => filterPersonas(dnsPersonas, searchTermDns), [dnsPersonas, searchTermDns]);

  // Tab configuration
  const tabs = [
    { id: 'http', label: 'HTTP Personas', icon: <GlobeIcon className="h-4 w-4" />, count: httpPersonas.length },
    { id: 'dns', label: 'DNS Personas', icon: <WifiIcon className="h-4 w-4" />, count: dnsPersonas.length },
  ];

  // Current tab data
  const currentPersonas = activeTab === 'http' ? filteredHttpPersonas : filteredDnsPersonas;
  const currentLoading = activeTab === 'http' ? loadingHttp : loadingDns;
  const currentSearchTerm = activeTab === 'http' ? searchTermHttp : searchTermDns;
  const setCurrentSearchTerm = activeTab === 'http' ? setSearchTermHttp : setSearchTermDns;

  // ===========================================================================
  // RENDER - TailAdmin Layout Structure
  // ===========================================================================
  return (
    <>
      {/* ===== BREADCRUMB (TailAdmin Pattern) ===== */}
      <PageBreadcrumb pageTitle="Synthetic Personas" />

      {/* ===== MAIN CONTENT with space-y-6 ===== */}
      <div className="space-y-6">

        {/* ===== HEADER ACTIONS BAR ===== */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage custom HTTP and DNS personas for advanced operations.
          </p>
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
              aria-label={`Import ${activeTab.toUpperCase()} persona file`}
            />
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              variant="outline" 
              startIcon={<UploadCloudIcon className="h-4 w-4" />}
            >
              Import {activeTab.toUpperCase()}
            </Button>
            <Link href={`/personas/new?type=${activeTab}`}>
              <Button startIcon={<PlusCircleIcon className="h-4 w-4" />}>
                New {activeTab.toUpperCase()} Persona
              </Button>
            </Link>
          </div>
        </div>

        {/* ===== MAIN CONTENT CARD (TailAdmin Pattern) ===== */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle icon={activeTab === 'http' ? <GlobeIcon className="h-5 w-5 text-brand-500" /> : <WifiIcon className="h-5 w-5 text-brand-500" />}>
                {activeTab === 'http' ? 'HTTP Personas' : 'DNS Personas'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'http' 
                  ? 'Browser fingerprints and HTTP client configurations for web scraping.'
                  : 'DNS resolver configurations for domain validation.'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardBody>
            {/* Tab Navigation */}
            <div className="mb-6">
              <TabNav activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
            </div>

            {/* Search Input */}
            <div className="mb-6 relative max-w-md">
              <TaSearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-gray-400 z-10" />
              <Input
                placeholder={`Search ${activeTab.toUpperCase()} personas...`}
                defaultValue={currentSearchTerm}
                onChange={(e) => setCurrentSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Content */}
            {currentLoading ? (
              <PersonaGridSkeleton />
            ) : currentPersonas.length === 0 ? (
              <CardEmptyState
                icon={activeTab === 'http' ? <GlobeIcon className="h-12 w-12" /> : <WifiIcon className="h-12 w-12" />}
                title={currentSearchTerm 
                  ? `No ${activeTab.toUpperCase()} personas found matching "${currentSearchTerm}"` 
                  : `No ${activeTab.toUpperCase()} personas found`}
                description={currentSearchTerm 
                  ? "Try a different search term or create a new persona." 
                  : `Get started by creating or importing your first ${activeTab.toUpperCase()} persona.`}
                action={
                  <Link href={`/personas/new?type=${activeTab}`}>
                    <Button startIcon={<PlusCircleIcon className="h-4 w-4" />}>
                      Create {activeTab.toUpperCase()} Persona
                    </Button>
                  </Link>
                }
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {currentPersonas.map(persona => {
                  const personaId = persona.id || '';
                  return (
                    <PersonaListItem
                      key={personaId}
                      persona={persona as ApiPersonaResponse}
                      onDelete={handleDeletePersona}
                      onTest={handleTestPersona}
                      onToggleStatus={handleTogglePersonaStatus}
                      isTesting={actionLoading[personaId] === 'test'}
                      isTogglingStatus={actionLoading[personaId] === 'toggle'}
                    />
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

      </div>
    </>
  );
}

export default function PersonasPage() {
  return <PersonasPageContent />;
}
