'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Control } from 'react-hook-form';
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';

// Define types for the other props that might be passed
interface Persona {
  id?: string;
  name?: string;
}

interface Proxy {
  id?: string;
  name?: string;
}

interface PersonaAssignmentSectionProps {
  control: Control<any>;
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
  proxies = [],
  needsHttpPersona = false,
  needsDnsPersona = false,
  noneValuePlaceholder = "none-default",
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
          name="dnsPersonaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DNS Persona</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled || isLoadingData}>
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
          name="httpPersonaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HTTP Persona</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled || isLoadingData}>
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

        {/* Display selected personas info - this would need access to form values */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Selected personas will be used for campaign execution according to the configured phase settings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default PersonaAssignmentSection;
