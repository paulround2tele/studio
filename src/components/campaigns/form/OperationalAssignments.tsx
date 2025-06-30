import React, { memo } from 'react';
import { Control, Controller } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Wifi, ShieldCheck } from 'lucide-react';
// Constants for form handling
const CampaignFormConstants = {
  NONE_VALUE_PLACEHOLDER: "__none__" as const,
} as const;

// Form values type using OpenAPI types directly
type CampaignSelectedType = import('@/lib/api-client/types').components['schemas']['CreateCampaignRequest']['campaignType'];
type DomainSourceSelectionMode = "none" | "upload" | "campaign_output";
type CampaignPhase = "domain_generation" | "dns_validation" | "http_keyword_validation" | "completed" | "idle";

interface CampaignFormValues {
  name: string;
  description?: string;
  selectedType: CampaignSelectedType;
  domainSourceSelectionMode: DomainSourceSelectionMode;
  sourceCampaignId?: string;
  sourcePhase?: CampaignPhase;
  uploadedDomainsFile?: File | null;
  uploadedDomainsContentCache?: string[];
  initialDomainsToProcessCount?: number;
  generationPattern: "prefix_variable" | "suffix_variable" | "both_variable" | "constant_only";
  constantPart: string;
  allowedCharSet: string;
  tldsInput: string;
  prefixVariableLength?: number;
  suffixVariableLength?: number;
  maxDomainsToGenerate?: number;
  targetKeywordsInput?: string;
  scrapingRateLimitRequests?: number;
  scrapingRateLimitPer?: 'second' | 'minute';
  requiresJavaScriptRendering?: boolean;
  rotationIntervalSeconds: number;
  processingSpeedPerMinute: number;
  batchSize: number;
  retryAttempts: number;
  targetHttpPorts?: number[];
  assignedHttpPersonaId?: string;
  assignedDnsPersonaId?: string;
  proxyAssignmentMode: 'none' | 'single' | 'rotate_active';
  assignedProxyId?: string;
  launchSequence?: boolean;
}
import type { HttpPersona, DnsPersona } from '@/lib/types';

interface OperationalAssignmentsProps {
  control: Control<CampaignFormValues>;
  needsHttp: boolean;
  needsDns: boolean;
  httpPersonas: HttpPersona[];
  dnsPersonas: DnsPersona[];
  isLoading: boolean;
}

/**
 * Memoized operational assignments component
 * Handles persona and proxy assignments with optimized persona filtering
 */
const OperationalAssignments = memo<OperationalAssignmentsProps>(({
  control,
  needsHttp,
  needsDns,
  httpPersonas,
  dnsPersonas,
  isLoading
}) => {
  return (
    <Card className="p-4 pt-2 border-dashed">
      <CardHeader className="p-2">
        <CardTitle className="text-base">Operational Assignments</CardTitle>
      </CardHeader>
      <CardContent className="p-2 space-y-4">
        {needsHttp && (
          <Controller name="assignedHttpPersonaId" control={control} render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                <Globe className="h-4 w-4"/>HTTP Persona
              </FormLabel>
              <Select 
                onValueChange={(val) => field.onChange(val === CampaignFormConstants.NONE_VALUE_PLACEHOLDER ? undefined : val)} 
                value={field.value || CampaignFormConstants.NONE_VALUE_PLACEHOLDER} 
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoading ? "Loading..." : "Select HTTP Persona"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={CampaignFormConstants.NONE_VALUE_PLACEHOLDER}>None (Default)</SelectItem>
                  {httpPersonas.filter(p => p.id).map(p => (
                    <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>
                  ))}
                  {httpPersonas.length === 0 && (
                    <SelectItem value="no-active-http-for-form" disabled>No active HTTP personas.</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}
        
        {needsDns && (
          <Controller name="assignedDnsPersonaId" control={control} render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center gap-1">
                <Wifi className="h-4 w-4"/>DNS Persona
              </FormLabel>
              <Select 
                onValueChange={(val) => field.onChange(val === CampaignFormConstants.NONE_VALUE_PLACEHOLDER ? undefined : val)} 
                value={field.value || CampaignFormConstants.NONE_VALUE_PLACEHOLDER} 
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoading ? "Loading..." : "Select DNS Persona"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={CampaignFormConstants.NONE_VALUE_PLACEHOLDER}>None (Default)</SelectItem>
                  {dnsPersonas.filter(p => p.id).map(p => (
                    <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>
                  ))}
                  {dnsPersonas.length === 0 && (
                    <SelectItem value="no-active-dns-for-form" disabled>No active DNS personas.</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        )}
        
        <Controller name="proxyAssignmentMode" control={control} render={({ field }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-1">
              <ShieldCheck className="h-4 w-4" />Proxy Assignment
            </FormLabel>
            <Select onValueChange={field.onChange} value={field.value || 'none'} disabled={isLoading}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select proxy mode" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="none">None (Direct)</SelectItem>
                <SelectItem value="single">Single Proxy</SelectItem>
                <SelectItem value="rotate_active">Rotate Active Proxies</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
      </CardContent>
    </Card>
  );
});

OperationalAssignments.displayName = 'OperationalAssignments';

export default OperationalAssignments;