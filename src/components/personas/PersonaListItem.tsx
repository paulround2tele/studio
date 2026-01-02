"use client";

import { useState } from 'react';
import Button from '@/components/ta/ui/button/Button';
import Badge from '@/components/ta/ui/badge/Badge';
import { Modal } from '@/components/ta/ui/modal';
import { Dropdown } from '@/components/ta/ui/dropdown/Dropdown';
import { DropdownItem } from '@/components/ta/ui/dropdown/DropdownItem';
import type { PersonaResponse as ApiPersonaResponse } from '@/lib/api-client/models/persona-response';
import type { PersonaConfigHttp as HTTPConfigDetails } from '@/lib/api-client/models/persona-config-http';
import type { PersonaConfigDns as DNSConfigDetails } from '@/lib/api-client/models/persona-config-dns';

type PersonaItem = ApiPersonaResponse;
type PersonaStatus = 'Active' | 'Disabled' | 'Testing' | 'Failed';

import { PencilIcon, TrashBinIcon, MoreVerticalIcon, CopyIcon, GlobeIcon, ClockIcon, SettingsIcon, WifiIcon, TestTubeIcon, PowerIcon, PowerOffIcon, FileJsonIcon, CheckCircleIcon, HelpCircleIcon, LoaderIcon } from '@/icons';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PersonaListItemProps {
  persona: ApiPersonaResponse;
  onDelete: (id: string, personaType: 'http' | 'dns') => void;
  onTest: (id: string, personaType: 'http' | 'dns') => void;
  onToggleStatus: (id: string, personaType: 'http' | 'dns', newStatus: PersonaStatus | undefined) => void;
  isTesting?: boolean;
  isTogglingStatus?: boolean;
}

const getStatusBadgeInfo = (isEnabled: boolean | undefined): { color: 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark', icon: JSX.Element, text: string } => {
  if (isEnabled === true) {
    return { color: 'success', icon: <CheckCircleIcon className="h-3.5 w-3.5" />, text: 'Active' };
  } else if (isEnabled === false) {
    return { color: 'dark', icon: <PowerOffIcon className="h-3.5 w-3.5" />, text: 'Disabled' };
  } else {
    return { color: 'light', icon: <HelpCircleIcon className="h-3.5 w-3.5" />, text: 'Unknown' };
  }
};

export default function PersonaListItem({ persona, onDelete, onTest, onToggleStatus, isTesting = false, isTogglingStatus = false }: PersonaListItemProps) {
  const { toast } = useToast();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const statusInfo = getStatusBadgeInfo(persona.isEnabled);
  const isActionDisabled = isTesting || isTogglingStatus;

  const handleDelete = () => {
    if (persona.id && persona.personaType) onDelete(persona.id, persona.personaType as "http" | "dns");
    setIsDeleteModalOpen(false);
  };

  const handleExport = () => {
    try {
      const exportablePersona: Record<string, unknown> = { ...persona };
      const personaJson = JSON.stringify(exportablePersona, null, 2);
      const blob = new Blob([personaJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(persona.name || 'persona').replace(/\s+/g, '_')}_persona.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Persona Exported", description: `${persona.name} has been exported.` });
    } catch (error) {
      toast({ title: "Export Failed", description: "Could not export persona.", variant: "destructive" });
      console.error("Persona export error:", error);
    }
  };

  const copyToClipboard = (data: unknown, fieldName: string) => {
    if (data === undefined || data === null || (typeof data === 'object' && Object.keys(data).length === 0)) {
        toast({ title: `Copy Failed`, description: `${fieldName} is empty or not available.`, variant: "destructive" });
        return;
    }
    const textToCopy = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({ title: `${fieldName} Copied`, description: `${fieldName} copied to clipboard.` });
    }).catch(() => {
      toast({ title: `Copy Failed`, description: `Could not copy ${fieldName} to clipboard.`, variant: "destructive" });
    });
  };

  const renderHttpPersonaDetails = (p: PersonaItem) => {
    const raw = p.configDetails as unknown;
    const config = (raw as HTTPConfigDetails) || {
      userAgent: 'Not set',
      headers: {},
      requestTimeoutSeconds: 30,
      followRedirects: true,
      maxRedirects: 5
    };
    return (
      <>
        <div className="text-sm space-y-1.5">
          <div><span className="font-medium text-gray-500 dark:text-gray-400">User-Agent:</span> <p className="font-mono text-xs text-gray-700 dark:text-gray-300 truncate block" title={config.userAgent}>{config.userAgent || "Not set"}</p></div>
          <p><span className="font-medium text-gray-500 dark:text-gray-400">Timeout:</span> <span className="text-gray-700 dark:text-gray-300">{config.requestTimeoutSeconds}s</span></p>
          {config.followRedirects !== undefined && <p><span className="font-medium text-gray-500 dark:text-gray-400">Follow Redirects:</span> <span className="text-gray-700 dark:text-gray-300">{config.followRedirects ? "Yes" : "No"}</span></p>}
          {(config.cookieHandling as { mode?: string })?.mode && <p><span className="font-medium text-gray-500 dark:text-gray-400">Cookie Handling:</span> <span className="text-gray-700 dark:text-gray-300">{(config.cookieHandling as { mode?: string }).mode}</span></p>}
          {config.notes && <p><span className="font-medium text-gray-500 dark:text-gray-400">Notes:</span> <span className="text-gray-600 dark:text-gray-400 italic truncate" title={config.notes}>{config.notes}</span></p>}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 -mx-6 px-6 pb-1">
          <div className="space-y-2">
            {config.headers && Object.keys(config.headers).length > 0 &&
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(config.headers, "HTTP Headers")} className="w-full justify-start text-left text-xs">
                  <CopyIcon className="mr-2 h-3 w-3"/> Copy HTTP Headers ({Object.keys(config.headers).length} headers)
                </Button>
            }
          </div>
        </div>
      </>
    );
  };

  const renderDnsPersonaDetails = (p: PersonaItem) => {
    const raw = p.configDetails as unknown;
    const config = (raw as DNSConfigDetails) || { resolverStrategy: undefined } as DNSConfigDetails;
    return (
      <>
        <div className="text-sm space-y-1.5">
          <div><span className="font-medium text-gray-500 dark:text-gray-400">Strategy:</span> <span className="ml-2"><Badge color="dark" size="sm">{config.resolverStrategy?.replace(/_/g, ' ') || 'Not set'}</Badge></span></div>
          <p><span className="font-medium text-gray-500 dark:text-gray-400">Timeout:</span> <span className="text-gray-700 dark:text-gray-300">{config.queryTimeoutSeconds}s</span></p>
          <p><span className="font-medium text-gray-500 dark:text-gray-400">Concurrent Queries/Domain:</span> <span className="text-gray-700 dark:text-gray-300">{config.concurrentQueriesPerDomain}</span></p>
          <p><span className="font-medium text-gray-500 dark:text-gray-400">Max Goroutines:</span> <span className="text-gray-700 dark:text-gray-300">{config.maxConcurrentGoroutines}</span></p>
          {(config.queryDelayMinMs !== undefined && config.queryDelayMaxMs !== undefined) && <p><span className="font-medium text-gray-500 dark:text-gray-400">Query Delay:</span> <span className="text-gray-700 dark:text-gray-300">{config.queryDelayMinMs}-{config.queryDelayMaxMs}ms</span></p>}
          {config.useSystemResolvers && <p><span className="font-medium text-gray-500 dark:text-gray-400">Uses System Resolvers:</span> <span className="text-gray-700 dark:text-gray-300">Yes</span></p>}
          {config.maxDomainsPerRequest && <p><span className="font-medium text-gray-500 dark:text-gray-400">Max Domains/Request:</span> <span className="text-gray-700 dark:text-gray-300">{config.maxDomainsPerRequest}</span></p>}
          {config.rateLimitDps && <p><span className="font-medium text-gray-500 dark:text-gray-400">Rate Limit (DPS):</span> <span className="text-gray-700 dark:text-gray-300">{config.rateLimitDps}</span></p>}
          {config.rateLimitBurst && <p><span className="font-medium text-gray-500 dark:text-gray-400">Rate Limit Burst:</span> <span className="text-gray-700 dark:text-gray-300">{config.rateLimitBurst}</span></p>}
          {config.resolvers && config.resolvers.length > 0 && (
              <div className="mt-1">
                  <span className="font-medium text-gray-500 dark:text-gray-400">Resolvers:</span>
                  <p className="text-xs font-mono text-gray-700 dark:text-gray-300 truncate" title={config.resolvers.join(', ')}>{config.resolvers.join(', ').substring(0,35)}{config.resolvers.join(', ').length > 35 ? '...' : ''}</p>
              </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20 -mx-6 px-6 pb-1">
          <div className="space-y-2">
            <Button variant="outline" size="sm" onClick={() => copyToClipboard(config, "Full DNS Config")} className="w-full justify-start text-left text-xs">
              <CopyIcon className="mr-2 h-3 w-3"/> Copy Full DNS Config
            </Button>
          </div>
        </div>
      </>
    );
  };

  return (
    <>
      <div className="rounded-2xl border border-gray-200 bg-white shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col h-full dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-row items-start justify-between gap-2 px-6 py-5">
          <div>
            <h3 className="text-base font-medium flex items-center gap-2 text-gray-800 dark:text-white/90">
              {persona.personaType === 'http' ? <GlobeIcon className="h-5 w-5 text-blue-500" /> : <WifiIcon className="h-5 w-5 text-blue-500" />}
              {persona.name}
            </h3>
            <p className="line-clamp-2 text-xs mt-1 text-gray-500 dark:text-gray-400">{persona.description || "No description provided."}</p>
          </div>
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={isActionDisabled}
              className="h-8 w-8 p-0 flex-shrink-0 dropdown-toggle"
            >
              <MoreVerticalIcon className="h-4 w-4" />
            </Button>
            <Dropdown isOpen={isDropdownOpen} onClose={() => setIsDropdownOpen(false)}>
              <div className="p-1 min-w-[160px]">
                <DropdownItem tag="a" href={`/personas/${persona.id}/edit?type=${persona.personaType}`}>
                  <span className="flex items-center">
                    <PencilIcon className="mr-2 h-4 w-4" /> Edit
                  </span>
                </DropdownItem>
                <DropdownItem onClick={() => { onTest(persona.id!, persona.personaType as 'http' | 'dns'); setIsDropdownOpen(false); }}>
                  <span className="flex items-center">
                    {isTesting ? <LoaderIcon className="mr-2 h-4 w-4 animate-spin" /> : <TestTubeIcon className="mr-2 h-4 w-4" />} Test Persona
                  </span>
                </DropdownItem>
                {persona.isEnabled && (
                  <DropdownItem onClick={() => { onToggleStatus(persona.id!, persona.personaType as 'http' | 'dns', 'Disabled'); setIsDropdownOpen(false); }}>
                    <span className="flex items-center">
                      {isTogglingStatus ? <LoaderIcon className="mr-2 h-4 w-4 animate-spin" /> : <PowerOffIcon className="mr-2 h-4 w-4" />} Disable Persona
                    </span>
                  </DropdownItem>
                )}
                {!persona.isEnabled && (
                  <DropdownItem onClick={() => { onToggleStatus(persona.id!, persona.personaType as 'http' | 'dns', 'Active'); setIsDropdownOpen(false); }}>
                    <span className="flex items-center">
                      {isTogglingStatus ? <LoaderIcon className="mr-2 h-4 w-4 animate-spin" /> : <PowerIcon className="mr-2 h-4 w-4" />} Enable Persona
                    </span>
                  </DropdownItem>
                )}
                <DropdownItem onClick={() => { handleExport(); setIsDropdownOpen(false); }}>
                  <span className="flex items-center">
                    <FileJsonIcon className="mr-2 h-4 w-4" /> Export JSON
                  </span>
                </DropdownItem>
                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                <DropdownItem 
                  onClick={() => { setIsDropdownOpen(false); setIsDeleteModalOpen(true); }}
                  className="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <span className="flex items-center">
                    <TrashBinIcon className="mr-2 h-4 w-4" /> Delete
                  </span>
                </DropdownItem>
              </div>
            </Dropdown>
          </div>
        </div>

        <div className="text-sm flex-grow px-6 pt-0 space-y-3">
          <div className="flex items-center justify-between text-xs mb-2">
            <Badge color={statusInfo.color} size="sm">
              {statusInfo.icon}
              <span className="ml-1">{statusInfo.text}</span>
            </Badge>
          </div>
          {persona.personaType === 'http' ? renderHttpPersonaDetails(persona as PersonaItem) : renderDnsPersonaDetails(persona as PersonaItem)}
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 px-6 py-4 flex mt-auto">
          <div className="flex items-center">
            <ClockIcon className="mr-1.5 h-3 w-3" />
            Created: {persona.createdAt ? format(new Date(persona.createdAt), 'PP') : 'N/A'}
          </div>
          {persona.updatedAt && persona.updatedAt !== persona.createdAt && (
            <div className="flex items-center ml-auto">
              <SettingsIcon className="mr-1.5 h-3 w-3" />
              Updated: {format(new Date(persona.updatedAt), 'PP')}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} className="max-w-md">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Are you sure?</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            This action cannot be undone. This will permanently delete the persona
            &quot;{persona.name}&quot;.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
