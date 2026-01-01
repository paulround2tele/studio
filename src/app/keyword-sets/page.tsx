"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

// TailAdmin Components
import Button from '@/components/ta/ui/button/Button';
import PageBreadcrumb from '@/components/ta/common/PageBreadCrumb';
import { Table, TableHeader, TableBody, TableRow, TableCell } from '@/components/ta/ui/table';
import Alert from '@/components/ta/ui/alert/Alert';
import { Modal } from '@/components/ta/ui/modal';

// Shared layout components (TailAdmin-compliant FROZEN PRIMITIVES)
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardBody, 
  CardFooter,
  CardEmptyState,
  TABLE_HEADER_CLASSES,
  TABLE_HEADER_CELL_CLASSES,
  TABLE_BODY_CELL_CLASSES,
  TABLE_ROW_CLASSES,
  TableActionButton
} from '@/components/shared/Card';

// TailAdmin Icons
import { PlusIcon, PencilIcon, TrashBinIcon, TagIcon } from '@/icons';

// API & Types
import { KeywordSetsApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import type { KeywordSetResponse } from '@/lib/api-client/models';
import { unwrapApiResponse } from '@/lib/utils/unwrapApiResponse';
import { useSSE } from '@/hooks/useSSE';
import type { SSEEvent } from '@/hooks/useSSE';

const keywordSetsApi = new KeywordSetsApi(apiConfiguration);

// ============================================================================
// LOADING SKELETON (TailAdmin Pattern)
// ============================================================================
function TableSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-12 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      ))}
    </div>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
export default function KeywordSetsPage() {
  const [sets, setSets] = useState<KeywordSetResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KeywordSetResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSets = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const resp = await keywordSetsApi.keywordSetsList();
      const body = unwrapApiResponse<KeywordSetResponse[]>(resp) ?? [];
      setSets(Array.isArray(body) ? body : []);
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Failed to load keyword sets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSseEvent = useCallback((evt: SSEEvent) => {
    const eventName = evt.event;
    if (
      eventName === 'keyword_set_created' ||
      eventName === 'keyword_set_updated' ||
      eventName === 'keyword_set_deleted'
    ) {
      loadSets();
    }
  }, [loadSets]);

  useSSE('/api/v2/sse/events', handleSseEvent, {
    autoReconnect: true,
    maxReconnectAttempts: 10,
    reconnectDelay: 2000,
    withCredentials: true
  });

  useEffect(() => {
    loadSets();
  }, [loadSets]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget?.id) {
      return;
    }
    setIsDeleting(true);
    try {
      await keywordSetsApi.keywordSetsDelete(deleteTarget.id);
      setDeleteTarget(null);
      loadSets();
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Failed to delete keyword set');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, loadSets]);

  // ===========================================================================
  // RENDER - TailAdmin Layout Structure
  // ===========================================================================
  return (
    <>
      {/* ===== BREADCRUMB (TailAdmin Pattern) ===== */}
      <PageBreadcrumb pageTitle="Keyword Sets" />
      
      {/* ===== MAIN CONTENT with space-y-6 ===== */}
      <div className="space-y-6">

        {/* ===== HEADER ACTIONS BAR ===== */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage keyword matching rules for domain generation.
          </p>
          <Link href="/keyword-sets/new">
            <Button startIcon={<PlusIcon className="h-4 w-4" />}>
              New Set
            </Button>
          </Link>
        </div>

        {/* ===== ERROR ALERT ===== */}
        {errorMessage && (
          <Alert
            variant="error"
            title="Error"
            message={errorMessage}
          />
        )}

        {/* ===== MAIN CONTENT CARD (TailAdmin Pattern) ===== */}
        {isLoading ? (
          <Card>
            <CardBody noPadding>
              <TableSkeleton />
            </CardBody>
          </Card>
        ) : sets.length === 0 ? (
          <Card>
            <CardBody>
              <CardEmptyState
                icon={<TagIcon className="h-12 w-12" />}
                title="No Keyword Sets Yet"
                description="Create your first keyword set to start generating domain patterns."
                action={
                  <Link href="/keyword-sets/new">
                    <Button startIcon={<PlusIcon className="h-4 w-4" />}>
                      Create First Set
                    </Button>
                  </Link>
                }
              />
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle icon={<TagIcon className="h-5 w-5" />}>
                Existing Sets
              </CardTitle>
              <CardDescription>
                Keyword matching rules used by campaigns for domain generation.
              </CardDescription>
            </CardHeader>
            <CardBody noPadding>
              <div className="overflow-x-auto">
                <Table className="w-full">
                  {/* Table Header - Using frozen TABLE_HEADER_CLASSES for stronger contrast */}
                  <TableHeader className={TABLE_HEADER_CLASSES}>
                    <TableRow>
                      <TableCell isHeader className={TABLE_HEADER_CELL_CLASSES}>
                        Name
                      </TableCell>
                      <TableCell isHeader className={TABLE_HEADER_CELL_CLASSES}>
                        Description
                      </TableCell>
                      <TableCell isHeader className={`${TABLE_HEADER_CELL_CLASSES} text-center`}>
                        Rules
                      </TableCell>
                      <TableCell isHeader className={`${TABLE_HEADER_CELL_CLASSES} text-center`}>
                        Enabled
                      </TableCell>
                      <TableCell isHeader className={`${TABLE_HEADER_CELL_CLASSES} text-right`}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sets.map(s => {
                      const ruleCount = typeof s.ruleCount === 'number'
                        ? s.ruleCount
                        : Array.isArray(s.rules)
                          ? s.rules.length
                          : 0;
                      return (
                        <TableRow key={s.id} className={TABLE_ROW_CLASSES}>
                          <TableCell className={TABLE_BODY_CELL_CLASSES}>
                            <span className="font-medium text-gray-900 dark:text-white">{s.name}</span>
                          </TableCell>
                          <TableCell className={`${TABLE_BODY_CELL_CLASSES} text-gray-500 dark:text-gray-400`}>
                            {s.description || '—'}
                          </TableCell>
                          <TableCell className={`${TABLE_BODY_CELL_CLASSES} text-center`}>
                            <span className="inline-flex items-center justify-center min-w-[2rem] rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                              {ruleCount}
                            </span>
                          </TableCell>
                          <TableCell className={`${TABLE_BODY_CELL_CLASSES} text-center`}>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                              s.isEnabled 
                                ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400' 
                                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                            }`}>
                              {s.isEnabled ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className={`${TABLE_BODY_CELL_CLASSES} text-right`}>
                            <div className="flex justify-end items-center gap-1">
                              <Link href={`/keyword-sets/${s.id}/edit`}>
                                <TableActionButton 
                                  icon={<PencilIcon className="h-4 w-4" />}
                                  title="Edit"
                                />
                              </Link>
                              <TableActionButton
                                icon={<TrashBinIcon className="h-4 w-4" />}
                                variant="danger"
                                onClick={() => setDeleteTarget(s)}
                                disabled={isDeleting && deleteTarget?.id === s.id}
                                title="Delete"
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardBody>
            {/* Footer provides visual "end" to the card - reduces dead space */}
            <CardFooter>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {sets.length} keyword {sets.length === 1 ? 'set' : 'sets'} configured
              </p>
            </CardFooter>
          </Card>
        )}

      </div>

      {/* ===== DELETE CONFIRMATION MODAL (TailAdmin Pattern) ===== */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        className="max-w-md p-6 lg:p-8"
      >
        <div className="text-center">
          {/* Icon */}
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-error-50 dark:bg-error-500/15">
            <TrashBinIcon className="h-6 w-6 text-error-500" />
          </div>
          
          {/* Title */}
          <h3 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
            Delete keyword set?
          </h3>
          
          {/* Description */}
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            This action cannot be undone. Campaigns using &ldquo;{deleteTarget?.name ?? 'this set'}&rdquo; will stop matching its rules.
          </p>
          
          {/* Actions */}
          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-error-500 hover:bg-error-600 disabled:bg-error-300"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
