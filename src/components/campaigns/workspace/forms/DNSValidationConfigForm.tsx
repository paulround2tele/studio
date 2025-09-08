"use client";
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PersonasApi, ProxiesApi, ProxyPoolsApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import { PersonaType } from '@/lib/api-client/models/persona-type';
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';
import type { ModelsProxy } from '@/lib/api-client/models/models-proxy';
import type { ModelsProxyPool } from '@/lib/api-client/models/models-proxy-pool';
import { useConfigurePhaseStandaloneMutation } from '@/store/api/campaignApi';
import type { ApiDNSValidationConfig } from '@/lib/api-client/models/api-dnsvalidation-config';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';

interface FormValues { personaIds: string[]; proxyPoolId?: string; name: string; }
interface Props { campaignId: string; onConfigured?: () => void; readOnly?: boolean; }
const MAX_PERSONAS_SELECTED = 5;

export const DNSValidationConfigForm: React.FC<Props> = ({ campaignId, onConfigured, readOnly }) => {
  const { toast } = useToast();
  const [configurePhase, { isLoading: saving }] = useConfigurePhaseStandaloneMutation();
  const [dnsPersonas, setDnsPersonas] = useState<PersonaResponse[]>([]);
  const [proxyPools, setProxyPools] = useState<ModelsProxyPool[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const form = useForm<FormValues>({ defaultValues: { personaIds: [], name: `DNS Validation - ${new Date().toLocaleDateString()}` } });
  const watchedPersonaIds = form.watch('personaIds');
  const watchedProxyPoolId = form.watch('proxyPoolId');

  useEffect(()=>{ if(readOnly) return; (async()=>{ try { setLoadingData(true); const personasApi = new PersonasApi(apiConfiguration); const proxyPoolsApi = new ProxyPoolsApi(apiConfiguration); const [personasResponse, poolsResponse] = await Promise.all([
      personasApi.personasList(undefined, undefined, true, PersonaType.dns),
      proxyPoolsApi.proxyPoolsList(),
    ]);
    const personas = extractResponseData<{ items?: PersonaResponse[] }>(personasResponse)?.items || []; const pools = extractResponseData<{ items?: ModelsProxyPool[] }>(poolsResponse)?.items || []; const enabledPools = pools.filter(p=>p.isEnabled!==false); const activeDns = personas.filter(p=>p.personaType==='dns' && p.isEnabled===true); setDnsPersonas(activeDns); setProxyPools(enabledPools); } catch(e){ console.error(e); toast({ title:'Load failed', description:'Could not load DNS data', variant:'destructive'});} finally { setLoadingData(false);} })(); },[campaignId, readOnly, toast]);

  const handlePersonaToggle = (id:string) => { const cur = form.getValues('personaIds'); if(cur.includes(id)) form.setValue('personaIds', cur.filter(x=>x!==id)); else if(cur.length < MAX_PERSONAS_SELECTED) form.setValue('personaIds', [...cur, id]); else toast({ title:'Maximum personas reached', description:`Up to ${MAX_PERSONAS_SELECTED}`, variant:'destructive'}); };
  const handleProxyPoolSelect = (id:string) => { form.setValue('proxyPoolId', id === watchedProxyPoolId ? undefined : id); };

  const onSubmit = async (data: FormValues) => { try { const dnsConfig: ApiDNSValidationConfig = { personaIds: data.personaIds, name: data.name }; const configRequest: PhaseConfigurationRequest = { configuration: { dnsValidation: dnsConfig }, proxyPoolId: data.proxyPoolId || undefined }; await configurePhase({ campaignId, phase: 'validation', config: configRequest }).unwrap(); toast({ title:'DNS validation configured' }); onConfigured?.(); } catch(e:any){ console.error(e); toast({ title:'Save failed', description:e?.data?.message||e?.message||'Try again', variant:'destructive'});} };

  if (readOnly) { const v = form.getValues(); return (<div className="space-y-2 text-xs"><div><strong>Personas:</strong> {v.personaIds.length}</div><div><strong>Proxy Pool:</strong> {v.proxyPoolId||'—'}</div></div>); }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({field})=> <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
        <div className="space-y-2">
          <div className="text-xs font-medium">DNS Personas</div>
          {loadingData ? <div className="text-xs">Loading...</div> : dnsPersonas.length === 0 ? <Alert><AlertCircle className="h-4 w-4"/><AlertDescription>No active DNS personas.</AlertDescription></Alert> : (
            <div className="grid grid-cols-1 gap-2">
              {dnsPersonas.map(p=> (
                <div key={p.id} onClick={()=>handlePersonaToggle(p.id||'')} className={`p-2 border rounded cursor-pointer text-xs flex justify-between ${watchedPersonaIds.includes(p.id||'')?'border-primary bg-primary/5':'hover:border-primary/50'}`}>
                  <span>{p.name}</span>{watchedPersonaIds.includes(p.id||'') && <Badge variant="default">Selected</Badge>}
                </div>
              ))}
            </div>
          )}
          {watchedPersonaIds.length>0 && <div className="flex flex-wrap gap-2">{watchedPersonaIds.map(id=>{ const persona=dnsPersonas.find(p=>p.id===id); return <Badge key={id} variant="secondary" className="flex items-center gap-1">{persona?.name}<X className="h-3 w-3 cursor-pointer" onClick={()=>handlePersonaToggle(id)} /></Badge>; })}</div>}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-medium">Proxy Pool (Optional)</div>
          {loadingData ? <div className="text-xs">Loading...</div> : proxyPools.length===0 ? <div className="text-[10px] text-muted-foreground">No pools available.</div> : (
            <div className="flex flex-wrap gap-2">{proxyPools.map(p=> <Badge key={p.id} variant={watchedProxyPoolId===p.id? 'default':'outline'} onClick={()=>handleProxyPoolSelect(p.id||'')} className="cursor-pointer">{p.name}</Badge>)}</div>
          )}
        </div>
        <div className="flex justify-end"><Button type="submit" size="sm" disabled={saving}>{saving? 'Saving...':'Save DNS Validation'}</Button></div>
      </form>
    </Form>
  );
};
export default DNSValidationConfigForm;
