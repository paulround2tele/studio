"use client";

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

// TailAdmin components
import PageBreadcrumb from '@/components/ta/common/PageBreadCrumb';
import Button from '@/components/ta/ui/button/Button';
import Input from '@/components/ta/form/input/InputField';
import Label from '@/components/ta/form/Label';
import Checkbox from '@/components/ta/form/input/Checkbox';
import Alert from '@/components/ta/ui/alert/Alert';
import Select from '@/components/ta/form/Select';

// Local form adapter
import FormButton from '@/components/form/FormButton';

// TailAdmin Icons
import { ArrowLeftIcon, PlusIcon, TrashBinIcon, LoaderIcon } from '@/icons';

// API
import { KeywordSetsApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import type { CreateKeywordSetRequest } from '@/lib/api-client/models/create-keyword-set-request';
import { KeywordRuleType } from '@/lib/api-client/models/keyword-rule-type';

const keywordSetsApi = new KeywordSetsApi(apiConfiguration);

type CreateKeywordSetPayload = CreateKeywordSetRequest;

const RULE_TYPE_OPTIONS = [
  { value: KeywordRuleType.string, label: 'Contains string' },
  { value: KeywordRuleType.regex, label: 'Regex' },
];

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
    <>
      <PageBreadcrumb pageTitle="New Keyword Set" />
      
      <div className="space-y-6">
        {/* Back link */}
        <Link href="/keyword-sets">
          <Button variant="outline" startIcon={<ArrowLeftIcon className="h-4 w-4" />}>
            Back
          </Button>
        </Link>

        {/* Alerts */}
        {successMessage && (
          <Alert variant="success" title="Success" message={successMessage} />
        )}
        {errorMessage && (
          <Alert variant="error" title="Error" message={errorMessage} />
        )}

        {/* Main form card */}
        <div className="max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-6">
            Keyword Set Information
          </h3>
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Name field */}
            <div>
              <Label>Name <span className="text-error-500">*</span></Label>
              <Controller
                control={form.control}
                name="name"
                rules={{ required: true }}
                render={({ field }) => (
                  <Input
                    type="text"
                    placeholder="e.g. SaaS Keywords"
                    defaultValue={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Description field */}
            <div>
              <Label>Description</Label>
              <Controller
                control={form.control}
                name="description"
                render={({ field }) => (
                  <Input
                    type="text"
                    placeholder="Short summary"
                    defaultValue={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            {/* Enabled checkbox */}
            <div className="flex items-center gap-3">
              <Controller
                control={form.control}
                name="isEnabled"
                render={({ field }) => (
                  <Checkbox
                    checked={!!field.value}
                    onChange={(checked) => field.onChange(checked)}
                    label="Enabled"
                  />
                )}
              />
            </div>

            {/* Rules section */}
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white/90">Keyword Rules</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Define the patterns that belong to this set.</p>
                </div>
                <FormButton
                  type="button"
                  variant="outline"
                  onClick={() => append({ pattern: '', ruleType: KeywordRuleType.string, isCaseSensitive: false, category: '', contextChars: 0 })}
                  startIcon={<PlusIcon className="h-4 w-4" />}
                >
                  Add Rule
                </FormButton>
              </div>

              {fields.length === 0 && (
                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No rules yet. Add at least one pattern to match.
                </div>
              )}

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-800 dark:text-white/90">Rule {index + 1}</p>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-2 text-gray-400 hover:text-error-500 transition-colors"
                        aria-label="Remove rule"
                      >
                        <TrashBinIcon className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label>Pattern <span className="text-error-500">*</span></Label>
                        <Controller
                          control={form.control}
                          name={`rules.${index}.pattern` as const}
                          rules={{ required: true }}
                          render={({ field: patternField }) => (
                            <Input
                              type="text"
                              placeholder="Keyword or regex"
                              defaultValue={patternField.value}
                              onChange={patternField.onChange}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>Rule Type</Label>
                        <Controller
                          control={form.control}
                          name={`rules.${index}.ruleType` as const}
                          render={({ field: selectField }) => (
                            <Select
                              options={RULE_TYPE_OPTIONS}
                              defaultValue={selectField.value}
                              onChange={selectField.onChange}
                              placeholder="Select type"
                            />
                          )}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <Label>Category</Label>
                        <Controller
                          control={form.control}
                          name={`rules.${index}.category` as const}
                          render={({ field: categoryField }) => (
                            <Input
                              type="text"
                              placeholder="Optional category"
                              defaultValue={categoryField.value}
                              onChange={categoryField.onChange}
                            />
                          )}
                        />
                      </div>
                      <div>
                        <Label>Context Characters</Label>
                        <Controller
                          control={form.control}
                          name={`rules.${index}.contextChars` as const}
                          render={({ field: contextField }) => (
                            <Input
                              type="number"
                              placeholder="0"
                              defaultValue={contextField.value}
                              onChange={(e) => contextField.onChange(Number(e.target.value) || 0)}
                              min="0"
                            />
                          )}
                        />
                      </div>
                      <div className="flex items-end pb-2">
                        <Controller
                          control={form.control}
                          name={`rules.${index}.isCaseSensitive` as const}
                          render={({ field: checkboxField }) => (
                            <Checkbox
                              checked={!!checkboxField.value}
                              onChange={(val) => checkboxField.onChange(val)}
                              label="Case sensitive"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit button */}
            <div className="pt-4">
              <FormButton type="submit" disabled={isLoading}>
                {isLoading && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
                Create Set
              </FormButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
