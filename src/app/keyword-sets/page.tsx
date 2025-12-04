"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Edit, Trash2 } from 'lucide-react';
import { KeywordSetsApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import type { KeywordSetResponse } from '@/lib/api-client/models';
import { unwrapApiResponse } from '@/lib/utils/unwrapApiResponse';
import { useSSE } from '@/hooks/useSSE';
import type { SSEEvent } from '@/hooks/useSSE';
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
const keywordSetsApi = new KeywordSetsApi(apiConfiguration);

export default function KeywordSetsPage() {
  const [sets, setSets] = useState<KeywordSetResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<KeywordSetResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadSets = useCallback(async () => {
    setIsLoading(true);
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

  return (
    <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Keyword Sets</h1>
          <Link href="/keyword-sets/new">
            <Button><Plus className="h-4 w-4 mr-2" /> New Set</Button>
          </Link>
        </div>
        {errorMessage && (<Alert variant="destructive"><AlertDescription>{errorMessage}</AlertDescription></Alert>)}
        <Card>
          <CardHeader>
            <CardTitle>Existing Sets</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-6"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : sets.length === 0 ? (
              <div className="rounded border border-dashed p-6 text-center text-sm text-muted-foreground">
                No keyword sets yet. Create one to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Rules</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
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
                      <TableRow key={s.id}>
                        <TableCell>{s.name}</TableCell>
                        <TableCell>{s.description || '—'}</TableCell>
                        <TableCell>{ruleCount}</TableCell>
                        <TableCell>{s.isEnabled ? 'Yes' : 'No'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Link href={`/keyword-sets/${s.id}/edit`}>
                              <Button variant="ghost" className="h-8 w-8 p-0" aria-label="Edit keyword set">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              aria-label="Delete keyword set"
                              onClick={() => setDeleteTarget(s)}
                              disabled={isDeleting && deleteTarget?.id === s.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && !isDeleting && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete keyword set?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. Campaigns using {deleteTarget?.name ?? 'this set'} will stop matching its rules.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDelete}
              >
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
