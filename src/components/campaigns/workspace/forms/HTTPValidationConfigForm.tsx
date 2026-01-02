"use client";
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import Button from '@/components/ta/ui/button/Button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import InputAdapter from '@/components/ta/adapters/InputAdapter';
import Badge from '@/components/ta/ui/badge/Badge';
import Alert from '@/components/ta/ui/alert/Alert';
import { CloseIcon } from '@/icons';
import { useToast } from '@/hooks/use-toast';
import { PersonasApi, KeywordSetsApi, ProxyPoolsApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import { PersonaType } from '@/lib/api-client/models/persona-type';
// Removed phantom PhaseStatusResponse enums; use literal phase/status strings
import { markConfigured } from '@/utils/phaseStatus';
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';
import type { ProxyPool as _ProxyPool } from '@/lib/api-client/models/proxy-pool';
import { useConfigurePhaseStandaloneMutation, campaignApi } from '@/store/api/campaignApi';
import { useAppDispatch } from '@/store/hooks';
import { pushGuidanceMessage } from '@/store/ui/campaignUiSlice';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';

// Structural lightweight representations (generated models with these names not present)
interface ProxyPoolLite { id?: string; name?: string; isEnabled?: boolean; }
interface KeywordSetLite { id?: string; name?: string; }

import type { HTTPValidationConfigFormValues } from '@/types/forms';

interface FormValues extends HTTPValidationConfigFormValues { 
  name: string; 
  personaIds: string[]; 
  keywordSetIds: string[]; 
  adHocKeywords: string[]; 
  proxyPoolId?: string; 
}
interface Props { campaignId: string; onConfigured?: ()=>void; readOnly?: boolean; }
const MAX_PERSONAS_SELECTED = 5;

export const HTTPValidationConfigForm: React.FC<Props> = ({ campaignId, onConfigured, readOnly }) => {
  const { toast } = useToast();
  const [configurePhase, { isLoading: saving }] = useConfigurePhaseStandaloneMutation();
  const dispatch = useAppDispatch();
  const [httpPersonas, setHttpPersonas] = useState<PersonaResponse[]>([]);
  const [keywordSets, setKeywordSets] = useState<KeywordSetLite[]>([]);
  const [proxyPools, setProxyPools] = useState<ProxyPoolLite[]>([]);
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
  const setsRaw: KeywordSetLite[] = Array.isArray(setsData) ? setsData : [];
    const activeHttp = personasRaw.filter((p: PersonaResponse) => {
      const kind = p.personaType?.toLowerCase();
      return kind === 'http' && (p.isEnabled === true || p.isEnabled === undefined);
    });
    setHttpPersonas(activeHttp);
  setKeywordSets(setsRaw||[]);
  setProxyPools((poolsRaw || []).filter((p: ProxyPoolLite) => p && p.isEnabled !== false));
    // Auto-select single persona if exactly one exists and none selected yet
    const current = form.getValues('personaIds');
    if (activeHttp.length === 1 && current.length === 0) {
      const only = activeHttp[0];
      if (only?.id) form.setValue('personaIds', [only.id]);
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
      const configuration: Record<string, unknown> = {
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
        dispatch(campaignApi.util.updateQueryData(
          'getPhaseStatusStandalone',
          { campaignId, phase: 'extraction' },
          (draft) => markConfigured(draft, 'extraction')
        ));
      }
      dispatch(
        campaignApi.endpoints.getPhaseStatusStandalone.initiate({ campaignId, phase: 'extraction' })
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
        <FormField control={form.control} name="name" render={({field})=> <FormItem data-testid="phase-http-field-name"><FormLabel>Configuration Name</FormLabel><FormControl><InputAdapter data-testid="phase-http-input-name" {...field} /></FormControl><FormMessage/></FormItem>} />
        <div className="space-y-2" data-testid="phase-http-personas">
          <div className="text-xs font-medium" data-testid="phase-http-personas-label">HTTP Personas</div>
          {loadingData ? <div className="text-xs" data-testid="phase-http-personas-loading">Loading personas...</div> : httpPersonas.length===0 ? <Alert variant="warning" title="No Personas" message="No active HTTP personas available." data-testid="phase-http-personas-empty" /> : (
            <div className="grid grid-cols-1 gap-2" data-testid="phase-http-personas-list">{httpPersonas.map(p=> <div data-testid={`phase-http-persona-${p.id}`} key={p.id} onClick={()=>togglePersona(p.id||'')} className={`p-2 border rounded cursor-pointer text-xs flex justify-between ${watchedPersonaIds.includes(p.id||'')?'border-primary bg-primary/5':'hover:border-primary/50'}`}><span data-testid={`phase-http-persona-name-${p.id}`}>{p.name}</span>{watchedPersonaIds.includes(p.id||'') && <Badge data-testid={`phase-http-persona-selected-${p.id}`} color="primary" size="sm">Selected</Badge>}</div> )}</div>
          )}
        </div>
        <div className="space-y-2" data-testid="phase-http-keyword-sets">
          <div className="text-xs font-medium" data-testid="phase-http-keyword-sets-label">Keyword Sets (optional)</div>
          {loadingData ? <div className="text-xs" data-testid="phase-http-keyword-sets-loading">Loading keywords...</div> : keywordSets.length===0 ? <div className="text-[10px] text-gray-500 dark:text-gray-400" data-testid="phase-http-keyword-sets-empty">No keyword sets.</div> : (
            <div className="grid grid-cols-2 gap-2" data-testid="phase-http-keyword-sets-list">{keywordSets.map(s=> <div data-testid={`phase-http-keyword-set-${s.id}`} key={s.id} onClick={()=>toggleKeywordSet(s.id||'')} className={`p-2 border rounded cursor-pointer text-[11px] ${watchedKeywordSetIds.includes(s.id||'')?'border-primary bg-primary/5':'hover:border-primary/50'}`}>{s.name}{watchedKeywordSetIds.includes(s.id||'') && <Badge data-testid={`phase-http-keyword-set-selected-${s.id}`} color="light" size="sm" className="ml-2">Selected</Badge>}</div>)}</div>
          )}
        </div>
        <div className="space-y-2" data-testid="phase-http-custom-keywords">
          <div className="text-xs font-medium" data-testid="phase-http-custom-keywords-label">Custom Keywords (optional)</div>
          <InputAdapter
            data-testid="phase-http-input-custom-keyword"
            placeholder="Enter a keyword and press Enter"
            value={pendingKeyword}
            onChange={e=> setPendingKeyword(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addAdHocKeyword(pendingKeyword); } }}
          />
          {watchedAdHocKeywords.length>0 && <div className="flex flex-wrap gap-2" data-testid="phase-http-custom-keywords-list">{watchedAdHocKeywords.map(k=> <Badge data-testid={`phase-http-custom-keyword-${k}`} key={k} color="light" size="sm" className="flex items-center gap-1">{k}<CloseIcon className="h-3 w-3 cursor-pointer" onClick={()=>removeAdHocKeyword(k)} /></Badge>)}</div>}
        </div>
        <div className="space-y-2" data-testid="phase-http-proxy-pools">
          <div className="text-xs font-medium" data-testid="phase-http-proxy-pools-label">Proxy Pool (optional)</div>
          {loadingData ? <div className="text-xs" data-testid="phase-http-proxy-pools-loading">Loading pools...</div> : proxyPools.length===0 ? <div className="text-[10px] text-gray-500 dark:text-gray-400" data-testid="phase-http-proxy-pools-empty">No pools.</div> : (
            <div className="flex flex-wrap gap-2" data-testid="phase-http-proxy-pools-list">{proxyPools.map(p=> <button type="button" data-testid={`phase-http-proxy-pool-${p.id}`} key={p.id} className="focus:outline-none" onClick={()=>selectProxyPool(p.id||'')}><Badge color={watchedProxyPoolId===p.id? 'primary':'light'} size="sm" className="cursor-pointer">{p.name}</Badge></button>)}</div>
          )}
        </div>
        <div className="flex justify-between items-center gap-4" data-testid="phase-http-actions">
          <div className="text-[10px] text-gray-500 dark:text-gray-400">
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
