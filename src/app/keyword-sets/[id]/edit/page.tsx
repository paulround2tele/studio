"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

// TailAdmin components
import PageBreadcrumb from '@/components/ta/common/PageBreadCrumb';
import Button from '@/components/ta/ui/button/Button';
import Input from '@/components/ta/form/input/InputField';
import Label from '@/components/ta/form/Label';
import Checkbox from '@/components/ta/form/input/Checkbox';
import Alert from '@/components/ta/ui/alert/Alert';
import Select from '@/components/ta/form/Select';
import { Modal } from '@/components/ta/ui/modal';

// Local form adapter
import FormButton from '@/components/form/FormButton';

// TailAdmin Icons
import { ArrowLeftIcon, PlusIcon, TrashBinIcon, LoaderIcon } from '@/icons';

// API
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

const RULE_TYPE_OPTIONS = [
  { value: KeywordRuleType.string, label: 'Contains string' },
  { value: KeywordRuleType.regex, label: 'Regex' },
];

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
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
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
      setIsDeleteModalOpen(false);
    }
  }, [keywordSetId, router]);

  if (isPageLoading) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <LoaderIcon className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  const disableActions = isSubmitting || isPageLoading || isDeleting;

  return (
    <>
      <PageBreadcrumb pageTitle="Edit Keyword Set" />
      
      <div className="space-y-6">
        {/* Header with back and delete */}
        <div className="flex flex-wrap items-center gap-4">
          <Link href="/keyword-sets">
            <Button variant="outline" startIcon={<ArrowLeftIcon className="h-4 w-4" />}>
              Back
            </Button>
          </Link>
          <div className="ml-auto">
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={disableActions}
              className="inline-flex items-center gap-2 rounded-lg bg-error-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-error-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <TrashBinIcon className="h-4 w-4" />
              Delete Set
            </button>
          </div>
        </div>

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
                    disabled={disableActions}
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
                    disabled={disableActions}
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
                    disabled={disableActions}
                  />
                )}
              />
            </div>

            {/* Rules section */}
            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white/90">Keyword Rules</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Build and organize the patterns associated with this set.</p>
                </div>
                <FormButton
                  type="button"
                  variant="outline"
                  onClick={handleAddRule}
                  disabled={disableActions}
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
                        disabled={disableActions}
                        className="p-2 text-gray-400 hover:text-error-500 disabled:opacity-50 transition-colors"
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
                              disabled={disableActions}
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
                              disabled={disableActions}
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
                              disabled={disableActions}
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
                              disabled={disableActions}
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
              <FormButton type="submit" disabled={disableActions}>
                {isSubmitting && <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </FormButton>
            </div>
          </form>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
        <div className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/10">
            <TrashBinIcon className="h-6 w-6 text-error-500" />
          </div>
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            Delete keyword set?
          </h3>
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone. Any campaign referencing this set will stop receiving updates from it.
          </p>
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-lg bg-error-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-error-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting && <LoaderIcon className="h-4 w-4 animate-spin" />}
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
