"use client";

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { KeywordSetsApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import type { CreateKeywordSetRequest } from '@/lib/api-client/models/create-keyword-set-request';
import { KeywordRuleType } from '@/lib/api-client/models/keyword-rule-type';
const keywordSetsApi = new KeywordSetsApi(apiConfiguration);

type CreateKeywordSetPayload = CreateKeywordSetRequest;

export default function NewKeywordSetPage() {
  const router = useRouter();
  const form = useForm<CreateKeywordSetPayload>({
    defaultValues: {
      name: '',
      description: '',
      isEnabled: true,
      rules: [
        {
          pattern: '',
          ruleType: KeywordRuleType.string,
          isCaseSensitive: false,
          category: '',
          contextChars: 0,
        },
      ],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'rules' });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onSubmit = useCallback(async (data: CreateKeywordSetPayload) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const payload: CreateKeywordSetPayload = {
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
      await keywordSetsApi.keywordSetsCreate(payload);
      setSuccessMessage('Keyword set created');
      // PERFORMANCE FIX: Immediate navigation instead of 500ms delay
      router.push('/keyword-sets');
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Failed to create keyword set');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return (
    <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/keyword-sets"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></Link>
          <h1 className="text-3xl font-bold">New Keyword Set</h1>
        </div>
        {successMessage && (<Alert><AlertDescription>{successMessage}</AlertDescription></Alert>)}
        {errorMessage && (<Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>)}
        <Card className="max-w-xl">
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
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold">Keyword Rules</p>
                    <p className="text-sm text-muted-foreground">Define the patterns that belong to this set.</p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      append({ pattern: '', ruleType: KeywordRuleType.string, isCaseSensitive: false, category: '', contextChars: 0 })
                    }
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
                    return (
                      <div key={field.id} className="rounded-md border p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Rule {index + 1}</p>
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} aria-label="Remove rule">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={patternId}>Pattern</Label>
                            <Input
                              id={patternId}
                              placeholder="Keyword or regex"
                              {...form.register(`rules.${index}.pattern` as const, { required: true })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Rule Type</Label>
                            <Controller
                              control={form.control}
                              name={`rules.${index}.ruleType` as const}
                              render={({ field: selectField }) => (
                                <Select value={selectField.value} onValueChange={selectField.onChange}>
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
                            <Input id={categoryId} placeholder="Optional category" {...form.register(`rules.${index}.category` as const)} />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={contextId}>Context Characters</Label>
                            <Input
                              id={contextId}
                              type="number"
                              min={0}
                              placeholder="0"
                              {...form.register(`rules.${index}.contextChars` as const, { valueAsNumber: true, min: 0 })}
                            />
                          </div>
                          <div className="flex items-center space-x-2 pt-6 sm:pt-0">
                            <Controller
                              control={form.control}
                              name={`rules.${index}.isCaseSensitive` as const}
                              render={({ field: checkboxField }) => (
                                <Checkbox
                                  checked={!!checkboxField.value}
                                  onCheckedChange={val => checkboxField.onChange(!!val)}
                                  id={`rule-${field.id}-case`}
                                />
                              )}
                            />
                            <Label htmlFor={`rule-${field.id}-case`}>Case sensitive</Label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Set</Button>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
