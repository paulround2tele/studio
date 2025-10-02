"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { X } from 'lucide-react';
import { useConfigurePhaseStandaloneMutation, campaignApi } from '@/store/api/campaignApi';
import { useToast } from '@/hooks/use-toast';
import { useAppDispatch } from '@/store/hooks';
import { pushGuidanceMessage } from '@/store/ui/campaignUiSlice';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';
import type { AnalysisConfigFormValues } from '@/types/forms';

interface FormValues extends AnalysisConfigFormValues { 
  name: string; 
  analysisTypes: string[]; 
  enableSuggestions: boolean; 
  customRules: string[]; 
}
interface Props { campaignId: string; onConfigured?: ()=>void; readOnly?: boolean; }

const ALL_ANALYSIS_TYPES = ['content','links','headers','structure'];

export const AnalysisConfigForm: React.FC<Props> = ({ campaignId, onConfigured, readOnly }) => {
  const form = useForm<FormValues>({ defaultValues: { name: `Analysis - ${new Date().toLocaleDateString()}`, analysisTypes: ['content'], enableSuggestions: true, customRules: [] }});
  const { toast } = useToast();
  const dispatch = useAppDispatch();
  const [configurePhase, { isLoading: saving }] = useConfigurePhaseStandaloneMutation();

  const toggleType = (t:string) => { const cur=form.getValues('analysisTypes'); form.setValue('analysisTypes', cur.includes(t)? cur.filter(x=>x!==t): [...cur,t]); };
  const toggleSuggestions = (v:boolean) => form.setValue('enableSuggestions', v);
  const addRule = (r:string) => { const trimmed=r.trim(); if(!trimmed) return; const cur=form.getValues('customRules'); if(cur.includes(trimmed)) return; form.setValue('customRules',[...cur, trimmed]); };
  const removeRule = (r:string) => form.setValue('customRules', form.getValues('customRules').filter(x=>x!==r));

  const onSubmit = async (data: FormValues) => { 
    try { 
      const analysisConfig: AnalysisPhaseConfig = { 
        name: data.name, 
        analysisTypes: data.analysisTypes, 
        enableSuggestions: data.enableSuggestions, 
        customRules: data.customRules 
      };
      // Flatten configuration – backend expects keys at root of configuration map for this phase
      const req: PhaseConfigurationRequest = { configuration: { ...analysisConfig } };
      const res = await configurePhase({ campaignId, phase: 'analysis', config: req }).unwrap(); 
      if (res?.status === 'configured') { 
        dispatch(campaignApi.util.updateQueryData('getPhaseStatusStandalone', { campaignId, phase: 'analysis' }, (draft) => ({
          ...(draft || {}), 
          status: 'configured' 
        })));
      }
      // Force authoritative refetch
      dispatch(campaignApi.endpoints.getPhaseStatusStandalone.initiate({ campaignId, phase: 'analysis' })); 
      toast({ title:'Analysis configured' }); 
      dispatch(pushGuidanceMessage({ campaignId, msg: { id: Date.now().toString(), message:'Analysis configured', phase:'analysis', severity:'info' } })); 
      onConfigured?.(); 
    } catch(e){ 
      console.error(e); 
      toast({ title:'Save failed', description:'Try again', variant:'destructive'});
    }
  };

  if(readOnly){ const v=form.getValues(); return <div data-testid="phase-analysis-readonly" className="space-y-2 text-xs"><div data-testid="phase-analysis-readonly-name"><strong>Name:</strong> {v.name}</div><div data-testid="phase-analysis-readonly-types"><strong>Types:</strong> {v.analysisTypes.join(', ')}</div><div data-testid="phase-analysis-readonly-suggestions"><strong>Suggestions:</strong> {v.enableSuggestions? 'On':'Off'}</div><div data-testid="phase-analysis-readonly-rules"><strong>Rules:</strong> {v.customRules.length}</div></div>; }

  return (
    <Form {...form}>
      <form data-testid="phase-analysis-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({field}) => <FormItem data-testid="phase-analysis-field-name"><FormLabel>Name</FormLabel><FormControl><Input data-testid="phase-analysis-input-name" {...field} /></FormControl><FormMessage/></FormItem>} />
        <div className="space-y-2" data-testid="phase-analysis-types">
          <div className="text-xs font-medium" data-testid="phase-analysis-types-label">Analysis Types</div>
          <div className="flex flex-wrap gap-2" data-testid="phase-analysis-types-list">{ALL_ANALYSIS_TYPES.map(t=> <Badge data-testid={`phase-analysis-type-${t}`} key={t} onClick={()=>toggleType(t)} variant={form.getValues('analysisTypes').includes(t)? 'default':'outline'} className="cursor-pointer text-[11px]">{t}</Badge>)}</div>
        </div>
        <div className="flex items-center gap-3" data-testid="phase-analysis-suggestions">
          <span className="text-xs" data-testid="phase-analysis-suggestions-label">Enable AI Suggestions</span>
          <Switch data-testid="phase-analysis-suggestions-toggle" checked={form.getValues('enableSuggestions')} onCheckedChange={(v)=>toggleSuggestions(!!v)} />
        </div>
        <div className="space-y-2" data-testid="phase-analysis-custom-rules">
          <div className="text-xs font-medium" data-testid="phase-analysis-custom-rules-label">Custom Rules (optional)</div>
          <Input data-testid="phase-analysis-input-new-rule" placeholder="Enter rule and press Enter" onKeyDown={e=>{ if(e.key==='Enter'){ e.preventDefault(); addRule((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value=''; } }} />
          {form.getValues('customRules').length>0 && <div className="flex flex-wrap gap-2" data-testid="phase-analysis-custom-rules-list">{form.getValues('customRules').map(r=> <Badge data-testid={`phase-analysis-custom-rule-${r}`} key={r} variant="secondary" className="flex items-center gap-1">{r}<X className="h-3 w-3 cursor-pointer" onClick={()=>removeRule(r)} /></Badge>)}</div>}
        </div>
        <div className="flex justify-end" data-testid="phase-analysis-actions"><Button data-testid="phase-analysis-submit" type="submit" size="sm" disabled={saving}>{saving? 'Saving...':'Save Analysis'}</Button></div>
      </form>
    </Form>
  );
};
export default AnalysisConfigForm;
