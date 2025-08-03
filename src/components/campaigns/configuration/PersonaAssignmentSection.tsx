import React from 'react';
import { Control } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCampaignFormData } from '@/lib/hooks/useCampaignFormData';

interface PersonaAssignmentSectionProps {
  control: Control<any>;
  disabled?: boolean;
  needsDnsPersona?: boolean;
  needsHttpPersona?: boolean;
}

export const PersonaAssignmentSection: React.FC<PersonaAssignmentSectionProps> = ({
  control,
  disabled = false,
  needsDnsPersona = false,
  needsHttpPersona = false
}) => {
  const { httpPersonas, dnsPersonas, proxies } = useCampaignFormData(false);

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
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select DNS persona" />
                  </SelectTrigger>
                  <SelectContent>
                    {dnsPersonas?.map((persona: any) => (
                      <SelectItem key={persona.id} value={persona.id}>
                        {persona.name}
                      </SelectItem>
                    ))}
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
                  disabled={disabled}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select HTTP persona" />
                  </SelectTrigger>
                  <SelectContent>
                    {httpPersonas?.map((persona: any) => (
                      <SelectItem key={persona.id} value={persona.id}>
                        {persona.name}
                      </SelectItem>
                    ))}
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
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select proxy (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No proxy</SelectItem>
                  {proxies?.map((proxy: any) => (
                    <SelectItem key={proxy.id} value={proxy.id}>
                      {proxy.host}:{proxy.port}
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
