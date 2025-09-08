"use client";
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useConfigurePhaseStandaloneMutation } from '@/store/api/campaignApi';
import { useAppDispatch } from '@/store/hooks';
import { pushGuidanceMessage } from '@/store/ui/campaignUiSlice';
import type { ApiAnalysisConfig } from '@/lib/api-client/models/api-analysis-config';
import type { PhaseConfigurationRequest } from '@/lib/api-client/models/phase-configuration-request';

interface FormValues { analysisType: string; includeScreenshots: boolean; generateReport: boolean; customRules: string[]; }
interface Props { campaignId: string; onConfigured?: ()=>void; readOnly?: boolean; }

export const AnalysisConfigForm: React.FC<Props> = ({ campaignId, onConfigured, readOnly }) => {
  const { toast } = useToast();
  const [configurePhase, { isLoading: saving }] = useConfigurePhaseStandaloneMutation();
  const form = useForm<FormValues>({ defaultValues: { analysisType: 'comprehensive', includeScreenshots: true, generateReport: true, customRules: [] }});
  const dispatch = useAppDispatch();

  const addRule = () => { const cur=form.getValues('customRules'); form.setValue('customRules', [...cur, '']); };
  const updateRule = (i:number, v:string) => { const cur=[...form.getValues('customRules')]; cur[i]=v; form.setValue('customRules', cur); };
  const removeRule = (i:number) => { form.setValue('customRules', form.getValues('customRules').filter((_,idx)=>idx!==i)); };

  const onSubmit = async (values: FormValues) => { try { const analysisConfig: ApiAnalysisConfig = { analysisType: values.analysisType as any, includeScreenshots: values.includeScreenshots, generateReport: values.generateReport, customRules: values.customRules.filter(r=>r.trim()!=='') }; const configRequest: PhaseConfigurationRequest = { configuration: { analysis: analysisConfig as any } }; await configurePhase({ campaignId, phase: 'analysis', config: configRequest }).unwrap(); toast({ title:'Analysis configured' }); dispatch(pushGuidanceMessage({ campaignId, msg: { id: Date.now().toString(), message: 'Analysis configured', phase: 'analysis', severity: 'info' } })); onConfigured?.(); } catch(e){ console.error(e); toast({ title:'Save failed', description:'Try again', variant:'destructive'}); } };

  if (readOnly) { const v=form.getValues(); return (<div className="space-y-2 text-xs"><div><strong>Type:</strong> {v.analysisType}</div><div><strong>Screenshots:</strong> {v.includeScreenshots? 'Yes':'No'}</div><div><strong>Report:</strong> {v.generateReport? 'Yes':'No'}</div><div><strong>Custom Rules:</strong> {v.customRules.length}</div></div>); }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="analysisType" render={({field})=> <FormItem><FormLabel>Analysis Type</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl><SelectContent><SelectItem value="basic">Basic</SelectItem><SelectItem value="comprehensive">Comprehensive</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent></Select><FormMessage/></FormItem>} />
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-xs"><Checkbox checked={form.watch('includeScreenshots')} onCheckedChange={v=>form.setValue('includeScreenshots', v===true)} />Include Screenshots</label>
          <label className="flex items-center gap-2 text-xs"><Checkbox checked={form.watch('generateReport')} onCheckedChange={v=>form.setValue('generateReport', v===true)} />Generate Report</label>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between"><span className="text-xs font-medium">Custom Rules</span><Button type="button" size="sm" variant="outline" onClick={addRule}>Add Rule</Button></div>
          {form.watch('customRules').length===0 && <div className="text-[10px] text-muted-foreground">No custom rules.</div>}
          <div className="space-y-1">
            {form.watch('customRules').map((r,i)=> <div key={i} className="flex gap-2 items-start"><Textarea value={r} onChange={e=>updateRule(i,e.target.value)} className="h-16" /><Button type="button" size="sm" variant="ghost" onClick={()=>removeRule(i)}>Remove</Button></div>)}
          </div>
        </div>
        <div className="flex justify-end"><Button type="submit" size="sm" disabled={saving}>{saving? 'Saving...':'Save Analysis'}</Button></div>
      </form>
    </Form>
  );
};
export default AnalysisConfigForm;
