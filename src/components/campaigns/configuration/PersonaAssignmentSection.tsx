import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Pure presentational: consumes personas/proxies via props; no internal data fetching

interface PersonaOption { id?: string; name?: string; }
interface ProxyOption { id?: string; host?: string; port?: number; name?: string }
interface PersonaAssignmentSectionProps {
  control: Control<any>;
  disabled?: boolean;
  needsDnsPersona?: boolean;
  needsHttpPersona?: boolean;
  httpPersonas?: PersonaOption[];
  dnsPersonas?: PersonaOption[];
  proxies?: ProxyOption[];
  noneValuePlaceholder?: string;
  isLoadingData?: boolean;
}

export const PersonaAssignmentSection: React.FC<PersonaAssignmentSectionProps> = ({
  control,
  disabled = false,
  needsDnsPersona = false,
  needsHttpPersona = false,
  httpPersonas = [],
  dnsPersonas = [],
  proxies = [],
  noneValuePlaceholder = '__none__',
  isLoadingData = false,
}) => {

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Persona & Proxy Assignment</h3>
      
      {needsDnsPersona && (
        <FormField
          control={control}
          name="assignedDnsPersonaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DNS Persona</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled || isLoadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingData ? 'Loading DNS personas…' : 'Select DNS persona'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={noneValuePlaceholder}>None (Default)</SelectItem>
                    {dnsPersonas?.filter(p => p.id).map((persona) => (
                      <SelectItem key={persona.id} value={persona.id!}>
                        {persona.name}
                      </SelectItem>
                    ))}
                    {dnsPersonas.length === 0 && !isLoadingData && (
                      <SelectItem value="no-dns" disabled>No DNS personas found. Please create one.</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {needsHttpPersona && (
        <FormField
          control={control}
          name="assignedHttpPersonaId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HTTP Persona</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled || isLoadingData}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingData ? 'Loading HTTP personas…' : 'Select HTTP persona'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={noneValuePlaceholder}>None (Default)</SelectItem>
                    {httpPersonas?.filter(p => p.id).map((persona) => (
                      <SelectItem key={persona.id} value={persona.id!}>
                        {persona.name}
                      </SelectItem>
                    ))}
                    {httpPersonas.length === 0 && !isLoadingData && (
                      <SelectItem value="no-http" disabled>No HTTP personas found. Please create one.</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={control}
        name="assignedProxyId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Proxy (Optional)</FormLabel>
            <FormControl>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={disabled || isLoadingData}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingData ? 'Loading proxies…' : 'Select proxy (optional)'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={noneValuePlaceholder}>No proxy</SelectItem>
                  {proxies?.filter(p => p.id).map((proxy) => (
                    <SelectItem key={proxy.id} value={proxy.id!}>
                      {proxy.host ? `${proxy.host}${proxy.port ? `:${proxy.port}` : ''}` : (proxy.name || 'Unnamed proxy')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};
