"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { KeywordSetsApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import type { KeywordSetResponse, UpdateKeywordSetRequest } from '@/lib/api-client/models';
import type { KeywordRuleDTO } from '@/lib/api-client/models/keyword-rule-dto';
import { KeywordRuleType } from '@/lib/api-client/models/keyword-rule-type';
import { unwrapApiResponse } from '@/lib/utils/unwrapApiResponse';

const keywordSetsApi = new KeywordSetsApi(apiConfiguration);

type KeywordRuleForm = {
  pattern: string;
  ruleType: KeywordRuleType;
  isCaseSensitive: boolean;
  category?: string;
  contextChars?: number;
};

type UpdateKeywordSetPayload = UpdateKeywordSetRequest & {
  name: string;
  isEnabled: boolean;
  rules: KeywordRuleForm[];
};

const DEFAULT_RULE: KeywordRuleForm = {
  pattern: '',
  ruleType: KeywordRuleType.string,
  isCaseSensitive: false,
  category: '',
  contextChars: 0,
};

const mapRules = (rules?: KeywordRuleDTO[]): KeywordRuleForm[] => {
  if (!Array.isArray(rules) || rules.length === 0) {
    return [{ ...DEFAULT_RULE }];
  }
  return rules.map(rule => ({
    pattern: rule.pattern ?? '',
    ruleType: (rule.ruleType as KeywordRuleType) ?? KeywordRuleType.string,
    isCaseSensitive: !!rule.isCaseSensitive,
    category: rule.category ?? '',
    contextChars: typeof rule.contextChars === 'number' ? rule.contextChars : 0,
  }));
};

export default function EditKeywordSetPage() {
  const params = useParams();
  const router = useRouter();
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const rawKeywordSetId = params?.id;
  const keywordSetId = Array.isArray(rawKeywordSetId) ? rawKeywordSetId[0] : rawKeywordSetId;

  const form = useForm<UpdateKeywordSetPayload>({
    defaultValues: {
      name: '',
      description: '',
      isEnabled: true,
      rules: [{ ...DEFAULT_RULE }],
    },
  });
  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: 'rules' });

  const handleAddRule = useCallback(() => {
    append({ ...DEFAULT_RULE });
  }, [append]);

  const loadKeywordSet = useCallback(async () => {
    if (!keywordSetId) {
      setErrorMessage('Keyword set identifier is missing.');
      setIsPageLoading(false);
      return;
    }
    setIsPageLoading(true);
    setErrorMessage(null);
    try {
      const resp = await keywordSetsApi.keywordSetsGet(keywordSetId);
      const payload = unwrapApiResponse<KeywordSetResponse>(resp);
      if (!payload) {
        throw new Error('Keyword set not found');
      }
      let rules = mapRules(payload.rules);
      if (payload.rules === undefined) {
        try {
          const rulesResp = await keywordSetsApi.keywordSetsRulesList(keywordSetId);
          const rulesBody = unwrapApiResponse<KeywordRuleDTO[]>(rulesResp);
          rules = mapRules(rulesBody ?? []);
        } catch (rulesError) {
          console.warn('Unable to load keyword rules', rulesError);
        }
      }
      const normalized = {
        name: payload.name,
        description: payload.description ?? '',
        isEnabled: payload.isEnabled ?? true,
        rules,
      };
      form.reset(normalized);
      replace(normalized.rules);
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Failed to load keyword set');
    } finally {
      setIsPageLoading(false);
    }
  }, [keywordSetId, form, replace]);

  useEffect(() => {
    loadKeywordSet();
  }, [loadKeywordSet]);

  const onSubmit = useCallback(async (data: UpdateKeywordSetPayload) => {
    if (!keywordSetId) {
      setErrorMessage('Keyword set identifier is missing.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload: UpdateKeywordSetRequest = {
        name: data.name?.trim() ?? '',
        description: data.description?.trim() || undefined,
        isEnabled: data.isEnabled ?? true,
        rules: (data.rules ?? [])
          .map(rule => {
            const pattern = rule.pattern?.trim() ?? '';
            const category = rule.category?.trim();
            const normalizedContext = Number(rule.contextChars);
            return {
              pattern,
              ruleType: rule.ruleType ?? KeywordRuleType.string,
              isCaseSensitive: !!rule.isCaseSensitive,
              category: category ? category : undefined,
              contextChars: Number.isFinite(normalizedContext) && normalizedContext > 0 ? normalizedContext : undefined,
            };
          })
          .filter(rule => rule.pattern.length > 0),
      };
      await keywordSetsApi.keywordSetsUpdate(keywordSetId, payload);
      setSuccessMessage('Keyword set updated');
      router.push('/keyword-sets');
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Failed to update keyword set');
    } finally {
      setIsSubmitting(false);
    }
  }, [keywordSetId, router]);

  const handleDelete = useCallback(async () => {
    if (!keywordSetId) {
      return;
    }
    setIsDeleting(true);
    setErrorMessage(null);
    try {
      await keywordSetsApi.keywordSetsDelete(keywordSetId);
      router.push('/keyword-sets');
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Failed to delete keyword set');
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  }, [keywordSetId, router]);

  if (isPageLoading) {
    return <div className="flex justify-center p-6"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  }

  const disableActions = isSubmitting || isPageLoading || isDeleting;

  return (
    <div className="container mx-auto p-6 space-y-6">
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/keyword-sets"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></Link>
          <h1 className="text-3xl font-bold">Edit Keyword Set</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)} disabled={disableActions}>
              Delete Set
            </Button>
          </div>
        </div>
        {successMessage && (<Alert><AlertDescription>{successMessage}</AlertDescription></Alert>)}
        {errorMessage && (<Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>)}
        <Card className="max-w-3xl">
          <CardHeader>
            <CardTitle>Keyword Set Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" placeholder="e.g. SaaS Keywords" {...form.register('name', { required: true })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" placeholder="Short summary" {...form.register('description')} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="enabled" checked={form.watch('isEnabled')} onCheckedChange={v => form.setValue('isEnabled', !!v)} />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
              <div className="relative space-y-4 pt-2">
                <div className="sticky top-0 z-10 flex flex-wrap items-start justify-between gap-2 rounded-md border border-border/40 bg-background/90 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/75">
                  <div>
                    <p className="text-lg font-semibold">Keyword Rules</p>
                    <p className="text-sm text-muted-foreground">Build and organize the patterns associated with this set.</p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddRule}
                    disabled={disableActions}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Rule
                  </Button>
                </div>
                {fields.length === 0 && (
                  <div className="rounded border border-dashed p-4 text-sm text-muted-foreground">
                    No rules yet. Add at least one pattern to match.
                  </div>
                )}
                <div className="space-y-3">
                  {fields.map((field, index) => {
                    const patternId = `rule-${field.id}-pattern`;
                    const categoryId = `rule-${field.id}-category`;
                    const contextId = `rule-${field.id}-context`;
                    const checkboxId = `rule-${field.id}-case`;
                    return (
                      <div key={field.id} className="space-y-4 rounded-md border p-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Rule {index + 1}</p>
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Remove rule" disabled={disableActions}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={patternId}>Pattern</Label>
                            <Input
                              id={patternId}
                              placeholder="Keyword or regex"
                              disabled={disableActions}
                              {...form.register(`rules.${index}.pattern` as const, { required: true })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Rule Type</Label>
                            <Controller
                              control={form.control}
                              name={`rules.${index}.ruleType` as const}
                              render={({ field: selectField }) => (
                                <Select value={selectField.value} onValueChange={selectField.onChange} disabled={disableActions}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value={KeywordRuleType.string}>Contains string</SelectItem>
                                    <SelectItem value={KeywordRuleType.regex}>Regex</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor={categoryId}>Category</Label>
                            <Input
                              id={categoryId}
                              placeholder="Optional category"
                              disabled={disableActions}
                              {...form.register(`rules.${index}.category` as const)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={contextId}>Context Characters</Label>
                            <Input
                              id={contextId}
                              type="number"
                              min={0}
                              placeholder="0"
                              disabled={disableActions}
                              {...form.register(`rules.${index}.contextChars` as const, { valueAsNumber: true, min: 0 })}
                            />
                          </div>
                          <div className="flex items-center space-x-2 pt-6 sm:pt-0">
                            <Controller
                              control={form.control}
                              name={`rules.${index}.isCaseSensitive` as const}
                              render={({ field: checkboxField }) => (
                                <Checkbox
                                  id={checkboxId}
                                  checked={!!checkboxField.value}
                                  onCheckedChange={val => checkboxField.onChange(!!val)}
                                  disabled={disableActions}
                                />
                              )}
                            />
                            <Label htmlFor={checkboxId}>Case sensitive</Label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {fields.length > 0 && (
                  <div className="sticky bottom-4 z-10 flex justify-end">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleAddRule}
                      disabled={disableActions}
                      className="shadow-lg"
                    >
                      <Plus className="mr-2 h-4 w-4" /> Add Another Rule
                    </Button>
                  </div>
                )}
              </div>
              <Button type="submit" disabled={disableActions}>
                {(isSubmitting || isDeleting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete keyword set?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Any campaign referencing this set will stop receiving updates from it.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
