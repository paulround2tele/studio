'use client';

import React, { useMemo } from 'react';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import SelectAdapter, { type SelectOption } from '@/components/ta/adapters/SelectAdapter';
import { Control } from 'react-hook-form';
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';

// Define types for the other props that might be passed
interface LocalPersona {
  id?: string;
  name?: string;
}

interface LocalProxy { id?: string; name?: string; host?: string; port?: number }

// Use the same type as the parent form for consistency
type CampaignFormData = {
  name: string;
  description?: string;
  targetKeywords?: string;
  assignedHttpPersonaId?: string;
  assignedDnsPersonaId?: string;
  proxyAssignmentMode?: string;
  assignedProxyId?: string;
  processingSpeed?: string;
  batchSize?: number;
  rotationInterval?: number;
  retryAttempts?: number;
};

interface PersonaAssignmentSectionProps {
  control: Control<CampaignFormData>;
  dnsPersonas?: PersonaResponse[] | LocalPersona[];
  httpPersonas?: PersonaResponse[] | LocalPersona[];
  proxies?: LocalProxy[];
  needsHttpPersona?: boolean;
  needsDnsPersona?: boolean;
  noneValuePlaceholder?: string;
  disabled?: boolean;
  isLoadingData?: boolean;
}

export const PersonaAssignmentSection: React.FC<PersonaAssignmentSectionProps> = ({
  control,
  dnsPersonas = [],
  httpPersonas = [],
  proxies: _proxies = [],
  needsHttpPersona: _needsHttpPersona = false,
  needsDnsPersona: _needsDnsPersona = false,
  noneValuePlaceholder = "__none__",
  disabled = false,
  isLoadingData = false
}) => {
  // Build options for SelectAdapter
  const dnsPersonaOptions = useMemo((): SelectOption[] => {
    const opts: SelectOption[] = [{ value: noneValuePlaceholder, label: 'None (Default)' }];
    dnsPersonas.filter(p => p.id).forEach(p => {
      opts.push({ value: p.id!, label: p.name || 'Unnamed' });
    });
    if (dnsPersonas.length === 0 && !isLoadingData) {
      opts.push({ value: 'no-active-dns', label: 'No DNS personas found', disabled: true });
    }
    return opts;
  }, [dnsPersonas, isLoadingData, noneValuePlaceholder]);

  const httpPersonaOptions = useMemo((): SelectOption[] => {
    const opts: SelectOption[] = [{ value: noneValuePlaceholder, label: 'None (Default)' }];
    httpPersonas.filter(p => p.id).forEach(p => {
      opts.push({ value: p.id!, label: p.name || 'Unnamed' });
    });
    if (httpPersonas.length === 0 && !isLoadingData) {
      opts.push({ value: 'no-active-http', label: 'No HTTP personas found', disabled: true });
    }
    return opts;
  }, [httpPersonas, isLoadingData, noneValuePlaceholder]);

  const proxyOptions = useMemo((): SelectOption[] => {
    const opts: SelectOption[] = [{ value: noneValuePlaceholder, label: 'No proxy' }];
    (_proxies as LocalProxy[])?.filter((p: LocalProxy) => p.id).forEach((p: LocalProxy) => {
      const label = p.host ? `${p.host}${p.port ? `:${p.port}` : ''}` : (p.name || 'Unnamed proxy');
      opts.push({ value: p.id!, label });
    });
    return opts;
  }, [_proxies, noneValuePlaceholder]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Persona Assignment</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Assign DNS and HTTP personas for campaign execution using proper backend types
        </p>
      </div>
      <div className="p-5 space-y-6">
        {/* DNS Persona Selection */}
        <FormField
          control={control}
          name="assignedDnsPersonaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DNS Persona</FormLabel>
              <FormControl>
                <SelectAdapter
                  options={dnsPersonaOptions}
                  value={field.value || noneValuePlaceholder}
                  onChange={field.onChange}
                  disabled={disabled || isLoadingData}
                  placeholder={isLoadingData ? "Loading DNS personas..." : "Select DNS persona"}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* HTTP Persona Selection */}
        <FormField
          control={control}
          name="assignedHttpPersonaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HTTP Persona</FormLabel>
              <FormControl>
                <SelectAdapter
                  options={httpPersonaOptions}
                  value={field.value || noneValuePlaceholder}
                  onChange={field.onChange}
                  disabled={disabled || isLoadingData}
                  placeholder={isLoadingData ? "Loading HTTP personas..." : "Select HTTP persona"}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Proxy Selection */}
        <FormField
          control={control}
          name="assignedProxyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Proxy (Optional)</FormLabel>
              <FormControl>
                <SelectAdapter
                  options={proxyOptions}
                  value={field.value || noneValuePlaceholder}
                  onChange={field.onChange}
                  disabled={disabled || isLoadingData}
                  placeholder={isLoadingData ? "Loading proxies..." : "Select proxy (optional)"}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default PersonaAssignmentSection;
