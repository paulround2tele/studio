"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Edit } from 'lucide-react';
import { keywordSetsApi } from '@/lib/api-client/compat';
import type { KeywordSetResponse as ApiKeywordSetResponse } from '@/lib/api-client/models';

type KeywordSet = ApiKeywordSetResponse;

export default function KeywordSetsPage() {
  const [sets, setSets] = useState<KeywordSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSets = useCallback(async () => {
    setIsLoading(true);
    try {
      setIsLoading(true);
      // Use the correct method name from the generated API
  const resp = await keywordSetsApi.keywordSetsList();
  // Envelope may wrap the list; attempt minimal unwrap
  const data = (resp as any)?.data?.data ?? (resp as any)?.data;
  setSets((data as KeywordSet[]) || []);
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Failed to load keyword sets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSets();
    
    // TODO: Replace with Server-Sent Events (SSE) for real-time updates
    // WebSocket infrastructure removed during RTK consolidation
  }, [loadSets]);

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
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Enabled</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sets.map(s => (
                    <TableRow key={s.id}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell>{s.description}</TableCell>
                      <TableCell>{s.isEnabled ? 'Yes' : 'No'}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/keyword-sets/${s.id}/edit`}><Button variant="ghost" className="h-8 w-8 p-0"><Edit className="h-4 w-4" /></Button></Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
    </div>
  );
}
