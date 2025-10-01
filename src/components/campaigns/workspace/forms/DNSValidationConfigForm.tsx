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
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';
import type { ModelsProxy } from '@/lib/api-client/models/models-proxy';
import type { ModelsProxyPool } from '@/lib/api-client/models/models-proxy-pool';
import { useConfigurePhaseStandaloneMutation, campaignApi } from '@/store/api/campaignApi';
import { useAppDispatch } from '@/store/hooks';
import { pushGuidanceMessage } from '@/store/ui/campaignUiSlice';
import type { ApiDNSValidationConfig } from '@/lib/api-client/models/api-dnsvalidation-config';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';

interface FormValues { personaIds: string[]; proxyPoolId?: string; name: string; }
interface Props { campaignId: string; onConfigured?: () => void; readOnly?: boolean; }
const MAX_PERSONAS_SELECTED = 5;

export const DNSValidationConfigForm: React.FC<Props> = ({ campaignId, onConfigured, readOnly }) => {
  const { toast } = useToast();
  const [configurePhase, { isLoading: saving }] = useConfigurePhaseStandaloneMutation();
  const dispatch = useAppDispatch();
  const [dnsPersonas, setDnsPersonas] = useState<PersonaResponse[]>([]);
  const [proxyPools, setProxyPools] = useState<ModelsProxyPool[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const form = useForm<FormValues>({ defaultValues: { personaIds: [], name: `DNS Validation - ${new Date().toLocaleDateString()}` } });
  const watchedPersonaIds = form.watch('personaIds');
  const watchedProxyPoolId = form.watch('proxyPoolId');

  // Register personaIds field explicitly since it's not a standard form input
  useEffect(() => {
    form.register('personaIds');
  }, [form]);

  useEffect(()=>{ if(readOnly) return; (async()=>{ try { setLoadingData(true); const personasApi = new PersonasApi(apiConfiguration); const proxyPoolsApi = new ProxyPoolsApi(apiConfiguration); const [personasResponse, poolsResponse] = await Promise.all([
      personasApi.personasList(undefined, undefined, true, PersonaType.dns),
      proxyPoolsApi.proxyPoolsList(),
    ]);
    // API now returns direct arrays
    const personasData = personasResponse.data || [];
    const poolsData = poolsResponse.data || [];
    const personasRaw = Array.isArray(personasData?.items) ? personasData.items : Array.isArray(personasData?.data) ? personasData.data : Array.isArray(personasData) ? personasData : [];
    const poolsRaw = Array.isArray(poolsData?.items) ? poolsData.items : Array.isArray(poolsData?.data) ? poolsData.data : Array.isArray(poolsData) ? poolsData : [];
    const enabledPools = poolsRaw.filter((p: any)=>p.isEnabled!==false);
    const activeDns = personasRaw.filter((p: any)=> (p.personaType==='dns' || p.personaType==='DNS' ) && (p.isEnabled===true || p.isEnabled===undefined));
    setDnsPersonas(activeDns);
    setProxyPools(enabledPools);
    // Auto-select if exactly one DNS persona available and none currently selected
    const currentSelected = form.getValues('personaIds');
    if (activeDns.length === 1 && currentSelected.length === 0) {
      form.setValue('personaIds', [activeDns[0].id]);
    }
  } catch(e){ console.error(e); toast({ title:'Load failed', description:'Could not load DNS data', variant:'destructive'});} finally { setLoadingData(false);} })(); },[campaignId, readOnly, toast]);

  const handlePersonaToggle = (id:string) => { 
    console.log('handlePersonaToggle called with id:', id);
    const cur = form.getValues('personaIds'); 
    console.log('current personaIds:', cur);
    console.log('current watchedPersonaIds:', watchedPersonaIds);
    
    if(cur.includes(id)) {
      const updated = cur.filter(x=>x!==id);
      form.setValue('personaIds', updated, { shouldValidate: true, shouldDirty: true });
      console.log('removed persona, new personaIds:', updated);
    } else if(cur.length < MAX_PERSONAS_SELECTED) {
      const updated = [...cur, id];
      form.setValue('personaIds', updated, { shouldValidate: true, shouldDirty: true });
      console.log('added persona, new personaIds:', updated);
    } else {
      toast({ title:'Maximum personas reached', description:`Up to ${MAX_PERSONAS_SELECTED}`, variant:'destructive'});
    }
    
    // Force a re-check after setValue
    setTimeout(() => {
      console.log('After setValue - form.getValues():', form.getValues());
      console.log('After setValue - watchedPersonaIds:', form.watch('personaIds'));
    }, 0);
  };
  const handleProxyPoolSelect = (id:string) => { form.setValue('proxyPoolId', id === watchedProxyPoolId ? undefined : id); };

  const onSubmit = async (data: FormValues) => {
    console.log('onSubmit received data:', data);
    console.log('form.getValues():', form.getValues());
    console.log('watchedPersonaIds:', watchedPersonaIds);
    
    // Force fresh form values to ensure we have latest state
    const freshValues = form.getValues();
    const actualPersonaIds = freshValues.personaIds || [];
    
    console.log('actualPersonaIds from fresh getValues:', actualPersonaIds);
    
    if (!actualPersonaIds || actualPersonaIds.length === 0) {
      console.log('Blocking submission - no personas selected');
      toast({ title: 'Validation Error', description: 'Please select at least one DNS persona', variant: 'destructive' });
      return;
    }
    
    // Use the fresh values instead of the parameter
    const submitData = {
      ...freshValues,
      personaIds: actualPersonaIds
    };
    
    console.log('Submitting with data:', submitData);
    
    try {
      // IMPORTANT: Backend `CampaignsPhaseConfigure` expects personaIds at the TOP LEVEL of the configuration map
      // for the DNS ("validation") phase, NOT nested under a phase-specific key. Previous shape:
      //   { configuration: { dnsValidation: { personaIds: [...] } } }
      // Backend code (handlers_campaigns.go) looks for incoming["personaIds"].
      // Therefore we flatten to: { configuration: { personaIds: [...], name } }
      const configuration: Record<string, any> = {
        personaIds: submitData.personaIds,
        name: submitData.name,
      };
      const configRequest: PhaseConfigurationRequest = {
        configuration,
        proxyPoolId: data.proxyPoolId || undefined,
      };
      console.log('Final DNS configure payload (flattened):', configRequest);
      const res = await configurePhase({ campaignId, phase: 'validation', config: configRequest }).unwrap();
      if (res?.status === 'configured') {
        dispatch(
          campaignApi.util.updateQueryData('getPhaseStatusStandalone', { campaignId, phase: 'validation' }, (draft: any) => ({
            ...(draft || {}),
            status: 'configured',
          }))
        );
      }
      // Force authoritative refetch
      dispatch(
        campaignApi.endpoints.getPhaseStatusStandalone.initiate({ campaignId, phase: 'validation' } as any)
      );
      toast({ title: 'DNS validation configured' });
      dispatch(
        pushGuidanceMessage({
          campaignId,
            msg: {
            id: Date.now().toString(),
            message: 'DNS validation configured',
            phase: 'validation',
            severity: 'info',
          },
        })
      );
      onConfigured?.();
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Save failed',
        description: e?.data?.message || e?.message || 'Try again',
        variant: 'destructive',
      });
    }
  };

  if (readOnly) { const v = form.getValues(); return (<div className="space-y-2 text-xs" data-testid="phase-dns-readonly"><div data-testid="phase-dns-readonly-personas"><strong>Personas:</strong> {v.personaIds.length}</div><div data-testid="phase-dns-readonly-proxy-pool"><strong>Proxy Pool:</strong> {v.proxyPoolId||'—'}</div></div>); }

  return (
    <Form {...form}>
      <form data-testid="phase-dns-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({field})=> <FormItem data-testid="phase-dns-field-name"><FormLabel>Name</FormLabel><FormControl><Input data-testid="phase-dns-input-name" {...field} /></FormControl><FormMessage/></FormItem>} />
        <div className="space-y-2" data-testid="phase-dns-personas">
          <div className="text-xs font-medium" data-testid="phase-dns-personas-label">DNS Personas</div>
          {loadingData ? <div className="text-xs" data-testid="phase-dns-personas-loading">Loading...</div> : dnsPersonas.length === 0 ? <Alert data-testid="phase-dns-personas-empty"><AlertCircle className="h-4 w-4"/><AlertDescription>No active DNS personas.</AlertDescription></Alert> : (
            <div className="grid grid-cols-1 gap-2" data-testid="phase-dns-personas-list">
              {dnsPersonas.map(p=> (
                <div data-testid={`phase-dns-persona-${p.id}`} key={p.id} onClick={()=>handlePersonaToggle(p.id||'')} className={`p-2 border rounded cursor-pointer text-xs flex justify-between ${watchedPersonaIds.includes(p.id||'')?'border-primary bg-primary/5':'hover:border-primary/50'}`}>
                  <span data-testid={`phase-dns-persona-name-${p.id}`}>{p.name}</span>{watchedPersonaIds.includes(p.id||'') && <Badge data-testid={`phase-dns-persona-selected-${p.id}`} variant="default">Selected</Badge>}
                </div>
              ))}
            </div>
          )}
          {watchedPersonaIds.length>0 && <div className="flex flex-wrap gap-2" data-testid="phase-dns-personas-selected">{watchedPersonaIds.map(id=>{ const persona=dnsPersonas.find(p=>p.id===id); return <Badge key={id} variant="secondary" className="flex items-center gap-1" data-testid={`phase-dns-chip-${id}`}>{persona?.name}<X className="h-3 w-3 cursor-pointer" onClick={()=>handlePersonaToggle(id)} /></Badge>; })}</div>}
        </div>
        <div className="space-y-2" data-testid="phase-dns-proxy-pools">
          <div className="text-xs font-medium" data-testid="phase-dns-proxy-pools-label">Proxy Pool (Optional)</div>
          {loadingData ? <div className="text-xs" data-testid="phase-dns-proxy-pools-loading">Loading...</div> : proxyPools.length===0 ? <div className="text-[10px] text-muted-foreground" data-testid="phase-dns-proxy-pools-empty">No pools available.</div> : (
            <div className="flex flex-wrap gap-2" data-testid="phase-dns-proxy-pools-list">{proxyPools.map(p=> <Badge key={p.id} variant={watchedProxyPoolId===p.id? 'default':'outline'} onClick={()=>handleProxyPoolSelect(p.id||'')} className="cursor-pointer" data-testid={`phase-dns-proxy-pool-${p.id}`}>{p.name}</Badge>)}</div>
          )}
        </div>
        <div className="flex justify-end" data-testid="phase-dns-actions"><Button data-testid="phase-dns-submit" type="submit" size="sm" disabled={saving || watchedPersonaIds.length === 0}>{saving? 'Saving...' : watchedPersonaIds.length === 0 ? 'Select DNS Persona' : 'Save DNS Validation'}</Button></div>
      </form>
    </Form>
  );
};
export default DNSValidationConfigForm;
