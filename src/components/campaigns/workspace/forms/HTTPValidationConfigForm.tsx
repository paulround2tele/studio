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
import { extractResponseData } from '@/lib/utils/apiResponseHelpers';
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';
import type { ModelsProxyPool } from '@/lib/api-client/models/models-proxy-pool';
import type { KeywordSetResponse as ApiKeywordSet } from '@/lib/api-client/models/keyword-set-response';
import { useConfigurePhaseStandaloneMutation } from '@/store/api/campaignApi';
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
  const form = useForm<FormValues>({ defaultValues: { name: `HTTP Validation - ${new Date().toLocaleDateString()}`, personaIds: [], keywordSetIds: [], adHocKeywords: [] } });
  const watchedPersonaIds = form.watch('personaIds');
  const watchedKeywordSetIds = form.watch('keywordSetIds');
  const watchedAdHocKeywords = form.watch('adHocKeywords');
  const watchedProxyPoolId = form.watch('proxyPoolId');

  useEffect(()=>{ if(readOnly) return; (async()=>{ try { setLoadingData(true); const personasApi = new PersonasApi(apiConfiguration); const keywordSetsApi = new KeywordSetsApi(apiConfiguration); const proxyPoolsApi = new ProxyPoolsApi(apiConfiguration); const [personasResponse, setsResponse, poolsResponse] = await Promise.all([
      personasApi.personasList(undefined, undefined, true, PersonaType.http),
      keywordSetsApi.keywordSetsList(),
      proxyPoolsApi.proxyPoolsList(),
    ]); const personas = extractResponseData<{ items?: PersonaResponse[] }>(personasResponse)?.items || []; const activeHttp = personas.filter(p=>p.personaType==='http' && p.isEnabled===true); const sets = extractResponseData<{ items?: ApiKeywordSet[] }>(setsResponse)?.items || []; const pools = extractResponseData<{ items?: ModelsProxyPool[] }>(poolsResponse)?.items || []; setHttpPersonas(activeHttp); setKeywordSets(sets||[]); setProxyPools((pools||[]).filter(p=>p.isEnabled!==false)); } catch(e){ console.error(e); toast({ title:'Load failed', description:'Could not load HTTP data', variant:'destructive'});} finally { setLoadingData(false);} })(); },[campaignId, readOnly, toast]);

  const togglePersona = (id:string) => { const cur = form.getValues('personaIds'); if(cur.includes(id)) form.setValue('personaIds', cur.filter(x=>x!==id)); else if(cur.length < MAX_PERSONAS_SELECTED) form.setValue('personaIds',[...cur,id]); else toast({ title:'Maximum personas reached', description:`Up to ${MAX_PERSONAS_SELECTED}`, variant:'destructive'}); };
  const toggleKeywordSet = (id:string) => { const cur=form.getValues('keywordSetIds'); form.setValue('keywordSetIds', cur.includes(id)? cur.filter(x=>x!==id): [...cur,id]); };
  const addAdHocKeyword = (kw:string) => { const trimmed=kw.trim(); if(!trimmed) return; const cur=form.getValues('adHocKeywords'); if(cur.includes(trimmed)) return; form.setValue('adHocKeywords', [...cur, trimmed]); };
  const removeAdHocKeyword = (kw:string) => { form.setValue('adHocKeywords', form.getValues('adHocKeywords').filter(k=>k!==kw)); };
  const selectProxyPool = (id:string) => { form.setValue('proxyPoolId', watchedProxyPoolId===id? undefined : id); };

  const onSubmit = async (data: FormValues) => { try { const httpConfig: ApiHTTPValidationConfig = { personaIds: data.personaIds, name: data.name, keywordSetIds: data.keywordSetIds, adHocKeywords: data.adHocKeywords } as any; const configRequest: PhaseConfigurationRequest = { configuration: { httpValidation: httpConfig }, proxyPoolId: data.proxyPoolId || undefined }; await configurePhase({ campaignId, phase: 'extraction', config: configRequest }).unwrap(); toast({ title:'HTTP validation configured' }); dispatch(pushGuidanceMessage({ campaignId, msg: { id: Date.now().toString(), message: 'HTTP validation configured', phase: 'extraction', severity: 'info' } })); onConfigured?.(); } catch(e){ console.error(e); toast({ title:'Save failed', description:'Try again', variant:'destructive'}); } };

  if (readOnly) { const v=form.getValues(); return (<div className="space-y-2 text-xs"><div><strong>Personas:</strong> {v.personaIds.length}</div><div><strong>Keyword Sets:</strong> {v.keywordSetIds.length}</div><div><strong>Custom Keywords:</strong> {v.adHocKeywords.length}</div><div><strong>Proxy Pool:</strong> {v.proxyPoolId || '—'}</div></div>); }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({field})=> <FormItem><FormLabel>Configuration Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage/></FormItem>} />
        <div className="space-y-2">
          <div className="text-xs font-medium">HTTP Personas</div>
          {loadingData ? <div className="text-xs">Loading personas...</div> : httpPersonas.length===0 ? <Alert><AlertCircle className="h-4 w-4"/><AlertDescription>No active HTTP personas.</AlertDescription></Alert> : (
            <div className="grid grid-cols-1 gap-2">{httpPersonas.map(p=> <div key={p.id} onClick={()=>togglePersona(p.id||'')} className={`p-2 border rounded cursor-pointer text-xs flex justify-between ${watchedPersonaIds.includes(p.id||'')?'border-primary bg-primary/5':'hover:border-primary/50'}`}><span>{p.name}</span>{watchedPersonaIds.includes(p.id||'') && <Badge variant="default">Selected</Badge>}</div> )}</div>
          )}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-medium">Keyword Sets (optional)</div>
          {loadingData ? <div className="text-xs">Loading keywords...</div> : keywordSets.length===0 ? <div className="text-[10px] text-muted-foreground">No keyword sets.</div> : (
            <div className="grid grid-cols-2 gap-2">{keywordSets.map(s=> <div key={s.id} onClick={()=>toggleKeywordSet(s.id||'')} className={`p-2 border rounded cursor-pointer text-[11px] ${watchedKeywordSetIds.includes(s.id||'')?'border-primary bg-primary/5':'hover:border-primary/50'}`}>{s.name}{watchedKeywordSetIds.includes(s.id||'') && <Badge variant="secondary" className="ml-2">Selected</Badge>}</div>)}</div>
          )}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-medium">Custom Keywords (optional)</div>
          <Input placeholder="Enter a keyword and press Enter" onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addAdHocKeyword((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value=''; } }} />
          {watchedAdHocKeywords.length>0 && <div className="flex flex-wrap gap-2">{watchedAdHocKeywords.map(k=> <Badge key={k} variant="secondary" className="flex items-center gap-1">{k}<X className="h-3 w-3 cursor-pointer" onClick={()=>removeAdHocKeyword(k)} /></Badge>)}</div>}
        </div>
        <div className="space-y-2">
          <div className="text-xs font-medium">Proxy Pool (optional)</div>
          {loadingData ? <div className="text-xs">Loading pools...</div> : proxyPools.length===0 ? <div className="text-[10px] text-muted-foreground">No pools.</div> : (
            <div className="flex flex-wrap gap-2">{proxyPools.map(p=> <Badge key={p.id} variant={watchedProxyPoolId===p.id? 'default':'outline'} className="cursor-pointer" onClick={()=>selectProxyPool(p.id||'')}>{p.name}</Badge>)}</div>
          )}
        </div>
        <div className="flex justify-end"><Button type="submit" size="sm" disabled={saving}>{saving? 'Saving...':'Save HTTP Validation'}</Button></div>
      </form>
    </Form>
  );
};
export default HTTPValidationConfigForm;
