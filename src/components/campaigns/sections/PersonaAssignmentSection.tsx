'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Control } from 'react-hook-form';
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';

// Define types for the other props that might be passed
interface Persona {
  id?: string;
  name?: string;
}

interface Proxy { id?: string; name?: string; host?: string; port?: number }

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
  dnsPersonas?: PersonaResponse[] | Persona[];
  httpPersonas?: PersonaResponse[] | Persona[];
  proxies?: Proxy[];
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Persona Assignment</CardTitle>
        <CardDescription>
          Assign DNS and HTTP personas for campaign execution using proper backend types
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* DNS Persona Selection */}
        <FormField
          control={control}
          name="assignedDnsPersonaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DNS Persona</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={disabled || isLoadingData}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingData ? "Loading DNS personas..." : "Select DNS persona"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={noneValuePlaceholder}>None (Default)</SelectItem>
                  {dnsPersonas.filter(p => p.id).map(p => (
                    <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>
                  ))}
                  {dnsPersonas.length === 0 && !isLoadingData && (
                    <SelectItem value="no-active-dns" disabled>No DNS personas found. Please upload some first.</SelectItem>
                  )}
                </SelectContent>
              </Select>
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
              <Select onValueChange={field.onChange} value={field.value} disabled={disabled || isLoadingData}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingData ? "Loading HTTP personas..." : "Select HTTP persona"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={noneValuePlaceholder}>None (Default)</SelectItem>
                  {httpPersonas.filter(p => p.id).map(p => (
                    <SelectItem key={p.id} value={p.id!}>{p.name}</SelectItem>
                  ))}
                  {httpPersonas.length === 0 && !isLoadingData && (
                    <SelectItem value="no-active-http" disabled>No HTTP personas found. Please upload some first.</SelectItem>
                  )}
                </SelectContent>
              </Select>
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
                <Select onValueChange={field.onChange} value={field.value} disabled={disabled || isLoadingData}>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingData ? "Loading proxies..." : "Select proxy (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={noneValuePlaceholder}>No proxy</SelectItem>
                    { (_proxies as Proxy[])?.filter((p: Proxy) => p.id).map((p: Proxy) => (
                      <SelectItem key={p.id} value={p.id!}>
                        {p.host ? `${p.host}${p.port ? `:${p.port}` : ''}` : (p.name || 'Unnamed proxy')}
                      </SelectItem>
                    )) }
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default PersonaAssignmentSection;
