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
import { PersonasApi, KeywordSetsApi, ProxyPoolsApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import { PersonaType } from '@/lib/api-client/models/persona-type';
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';
import type { ModelsProxyPool } from '@/lib/api-client/models/models-proxy-pool';
import type { KeywordSetResponse as ApiKeywordSet } from '@/lib/api-client/models/keyword-set-response';
import { useConfigurePhaseStandaloneMutation, campaignApi } from '@/store/api/campaignApi';
import { useAppDispatch } from '@/store/hooks';
import { pushGuidanceMessage } from '@/store/ui/campaignUiSlice';
import type { ApiHTTPValidationConfig } from '@/lib/api-client/models/api-httpvalidation-config';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';

interface FormValues { name: string; personaIds: string[]; keywordSetIds: string[]; adHocKeywords: string[]; proxyPoolId?: string; }
interface Props { campaignId: string; onConfigured?: ()=>void; readOnly?: boolean; }
const MAX_PERSONAS_SELECTED = 5;

export const HTTPValidationConfigForm: React.FC<Props> = ({ campaignId, onConfigured, readOnly }) => {
  const { toast } = useToast();
  const [configurePhase, { isLoading: saving }] = useConfigurePhaseStandaloneMutation();
  const dispatch = useAppDispatch();
  const [httpPersonas, setHttpPersonas] = useState<PersonaResponse[]>([]);
  const [keywordSets, setKeywordSets] = useState<ApiKeywordSet[]>([]);
  const [proxyPools, setProxyPools] = useState<ModelsProxyPool[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [pendingKeyword, setPendingKeyword] = useState('');
  const form = useForm<FormValues>({ defaultValues: { name: `HTTP Validation - ${new Date().toLocaleDateString()}`, personaIds: [], keywordSetIds: [], adHocKeywords: [] } });
  const watchedPersonaIds = form.watch('personaIds');
  const watchedKeywordSetIds = form.watch('keywordSetIds');
  const watchedAdHocKeywords = form.watch('adHocKeywords');
  const watchedProxyPoolId = form.watch('proxyPoolId');

  // Explicitly register personaIds because they are managed via custom UI (badges/cards)
  useEffect(() => {
    form.register('personaIds');
  }, [form]);

  useEffect(()=>{ if(readOnly) return; (async()=>{ try { setLoadingData(true); const personasApi = new PersonasApi(apiConfiguration); const keywordSetsApi = new KeywordSetsApi(apiConfiguration); const proxyPoolsApi = new ProxyPoolsApi(apiConfiguration); const [personasResponse, setsResponse, poolsResponse] = await Promise.all([
      personasApi.personasList(undefined, undefined, true, PersonaType.http),
      keywordSetsApi.keywordSetsList(),
      proxyPoolsApi.proxyPoolsList(),
    ]);
    // API now returns direct arrays
    const personasData = personasResponse.data || [];
    const poolsData = poolsResponse.data || [];
    const setsData = setsResponse.data || [];
    // Since APIs return direct arrays, we can use them directly
    const personasRaw = Array.isArray(personasData) ? personasData : [];
    const poolsRaw = Array.isArray(poolsData) ? poolsData : [];
    const setsRaw = Array.isArray(setsData) ? setsData : [];
    const activeHttp = personasRaw.filter((p: any)=> (p.personaType==='http' || p.personaType==='HTTP') && (p.isEnabled===true || p.isEnabled===undefined));
    setHttpPersonas(activeHttp);
    setKeywordSets(setsRaw||[]);
    setProxyPools((poolsRaw||[]).filter((p: any)=>p.isEnabled!==false));
    // Auto-select single persona if exactly one exists and none selected yet
    const current = form.getValues('personaIds');
    if (activeHttp.length === 1 && current.length === 0) {
      form.setValue('personaIds', [activeHttp[0].id]);
    }
  } catch(e){ console.error(e); toast({ title:'Load failed', description:'Could not load HTTP data', variant:'destructive'});} finally { setLoadingData(false);} })(); },[campaignId, readOnly, toast, form]);

  const togglePersona = (id:string) => { const cur = form.getValues('personaIds'); if(cur.includes(id)) form.setValue('personaIds', cur.filter(x=>x!==id)); else if(cur.length < MAX_PERSONAS_SELECTED) form.setValue('personaIds',[...cur,id]); else toast({ title:'Maximum personas reached', description:`Up to ${MAX_PERSONAS_SELECTED}`, variant:'destructive'}); };
  const toggleKeywordSet = (id:string) => { const cur=form.getValues('keywordSetIds'); form.setValue('keywordSetIds', cur.includes(id)? cur.filter(x=>x!==id): [...cur,id]); };
  const addAdHocKeyword = (kw:string) => { const trimmed=kw.trim(); if(!trimmed) return; const cur=form.getValues('adHocKeywords'); if(cur.includes(trimmed)) { setPendingKeyword(''); return;} form.setValue('adHocKeywords', [...cur, trimmed], { shouldDirty: true }); setPendingKeyword(''); };
  const removeAdHocKeyword = (kw:string) => { form.setValue('adHocKeywords', form.getValues('adHocKeywords').filter(k=>k!==kw)); };
  const selectProxyPool = (id:string) => { form.setValue('proxyPoolId', watchedProxyPoolId===id? undefined : id); };

  const onSubmit = async (data: FormValues) => {
    // If user typed a keyword but didn't press Enter, add it now
    if (pendingKeyword.trim()) {
      addAdHocKeyword(pendingKeyword);
      // refresh data after mutating form
      data = { ...data, adHocKeywords: form.getValues('adHocKeywords') };
    }
    const totalKeywords = (data.keywordSetIds?.length || 0) + (data.adHocKeywords?.length || 0);
    if (totalKeywords === 0) {
      toast({ title: 'Keywords required', description: 'Add at least one keyword set or a custom keyword.', variant: 'destructive' });
      return;
    }
    try {
      // Flatten configuration (same rationale as DNS): backend expects personaIds at root of configuration map.
      const configuration: Record<string, any> = {
        personaIds: data.personaIds,
        name: data.name,
        keywordSetIds: data.keywordSetIds,
        adHocKeywords: data.adHocKeywords,
      };
      const configRequest: PhaseConfigurationRequest = {
        configuration,
        proxyPoolId: data.proxyPoolId || undefined,
      };
      console.log('Final HTTP validation configure payload (flattened):', configRequest);
      const res = await configurePhase({ campaignId, phase: 'extraction', config: configRequest }).unwrap();
      if (res?.status === 'configured') {
        dispatch(
          campaignApi.util.updateQueryData('getPhaseStatusStandalone', { campaignId, phase: 'extraction' }, (draft: any) => ({
            ...(draft || {}),
            status: 'configured',
          }))
        );
      }
      dispatch(
        campaignApi.endpoints.getPhaseStatusStandalone.initiate({ campaignId, phase: 'extraction' } as any)
      );
      toast({ title: 'HTTP validation configured' });
      dispatch(
        pushGuidanceMessage({
          campaignId,
          msg: {
            id: Date.now().toString(),
            message: 'HTTP validation configured',
            phase: 'extraction',
            severity: 'info',
          },
        })
      );
      onConfigured?.();
    } catch (e) {
      console.error(e);
      toast({ title: 'Save failed', description: 'Try again', variant: 'destructive' });
    }
  };

  if (readOnly) { const v=form.getValues(); return (<div className="space-y-2 text-xs" data-testid="phase-http-readonly"><div data-testid="phase-http-readonly-personas"><strong>Personas:</strong> {v.personaIds.length}</div><div data-testid="phase-http-readonly-keyword-sets"><strong>Keyword Sets:</strong> {v.keywordSetIds.length}</div><div data-testid="phase-http-readonly-custom-keywords"><strong>Custom Keywords:</strong> {v.adHocKeywords.length}</div><div data-testid="phase-http-readonly-proxy-pool"><strong>Proxy Pool:</strong> {v.proxyPoolId || '—'}</div></div>); }

  return (
    <Form {...form}>
      <form data-testid="phase-http-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({field})=> <FormItem data-testid="phase-http-field-name"><FormLabel>Configuration Name</FormLabel><FormControl><Input data-testid="phase-http-input-name" {...field} /></FormControl><FormMessage/></FormItem>} />
        <div className="space-y-2" data-testid="phase-http-personas">
          <div className="text-xs font-medium" data-testid="phase-http-personas-label">HTTP Personas</div>
          {loadingData ? <div className="text-xs" data-testid="phase-http-personas-loading">Loading personas...</div> : httpPersonas.length===0 ? <Alert data-testid="phase-http-personas-empty"><AlertCircle className="h-4 w-4"/><AlertDescription>No active HTTP personas.</AlertDescription></Alert> : (
            <div className="grid grid-cols-1 gap-2" data-testid="phase-http-personas-list">{httpPersonas.map(p=> <div data-testid={`phase-http-persona-${p.id}`} key={p.id} onClick={()=>togglePersona(p.id||'')} className={`p-2 border rounded cursor-pointer text-xs flex justify-between ${watchedPersonaIds.includes(p.id||'')?'border-primary bg-primary/5':'hover:border-primary/50'}`}><span data-testid={`phase-http-persona-name-${p.id}`}>{p.name}</span>{watchedPersonaIds.includes(p.id||'') && <Badge data-testid={`phase-http-persona-selected-${p.id}`} variant="default">Selected</Badge>}</div> )}</div>
          )}
        </div>
        <div className="space-y-2" data-testid="phase-http-keyword-sets">
          <div className="text-xs font-medium" data-testid="phase-http-keyword-sets-label">Keyword Sets (optional)</div>
          {loadingData ? <div className="text-xs" data-testid="phase-http-keyword-sets-loading">Loading keywords...</div> : keywordSets.length===0 ? <div className="text-[10px] text-muted-foreground" data-testid="phase-http-keyword-sets-empty">No keyword sets.</div> : (
            <div className="grid grid-cols-2 gap-2" data-testid="phase-http-keyword-sets-list">{keywordSets.map(s=> <div data-testid={`phase-http-keyword-set-${s.id}`} key={s.id} onClick={()=>toggleKeywordSet(s.id||'')} className={`p-2 border rounded cursor-pointer text-[11px] ${watchedKeywordSetIds.includes(s.id||'')?'border-primary bg-primary/5':'hover:border-primary/50'}`}>{s.name}{watchedKeywordSetIds.includes(s.id||'') && <Badge data-testid={`phase-http-keyword-set-selected-${s.id}`} variant="secondary" className="ml-2">Selected</Badge>}</div>)}</div>
          )}
        </div>
        <div className="space-y-2" data-testid="phase-http-custom-keywords">
          <div className="text-xs font-medium" data-testid="phase-http-custom-keywords-label">Custom Keywords (optional)</div>
          <Input
            data-testid="phase-http-input-custom-keyword"
            placeholder="Enter a keyword and press Enter"
            value={pendingKeyword}
            onChange={e=> setPendingKeyword(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addAdHocKeyword(pendingKeyword); } }}
          />
          {watchedAdHocKeywords.length>0 && <div className="flex flex-wrap gap-2" data-testid="phase-http-custom-keywords-list">{watchedAdHocKeywords.map(k=> <Badge data-testid={`phase-http-custom-keyword-${k}`} key={k} variant="secondary" className="flex items-center gap-1">{k}<X className="h-3 w-3 cursor-pointer" onClick={()=>removeAdHocKeyword(k)} /></Badge>)}</div>}
        </div>
        <div className="space-y-2" data-testid="phase-http-proxy-pools">
          <div className="text-xs font-medium" data-testid="phase-http-proxy-pools-label">Proxy Pool (optional)</div>
          {loadingData ? <div className="text-xs" data-testid="phase-http-proxy-pools-loading">Loading pools...</div> : proxyPools.length===0 ? <div className="text-[10px] text-muted-foreground" data-testid="phase-http-proxy-pools-empty">No pools.</div> : (
            <div className="flex flex-wrap gap-2" data-testid="phase-http-proxy-pools-list">{proxyPools.map(p=> <Badge data-testid={`phase-http-proxy-pool-${p.id}`} key={p.id} variant={watchedProxyPoolId===p.id? 'default':'outline'} className="cursor-pointer" onClick={()=>selectProxyPool(p.id||'')}>{p.name}</Badge>)}</div>
          )}
        </div>
        <div className="flex justify-between items-center gap-4" data-testid="phase-http-actions">
          <div className="text-[10px] text-muted-foreground">
            {(watchedKeywordSetIds.length + watchedAdHocKeywords.length) === 0 && 'Add at least one keyword set or custom keyword to continue.'}
          </div>
          <Button
            data-testid="phase-http-submit"
            type="submit"
            size="sm"
            disabled={saving || ((watchedKeywordSetIds.length + watchedAdHocKeywords.length) === 0 && !pendingKeyword.trim()) || watchedPersonaIds.length === 0}
          >
            {saving ? 'Saving...' : 'Save HTTP Validation'}
          </Button>
        </div>
      </form>
    </Form>
  );
};
export default HTTPValidationConfigForm;
