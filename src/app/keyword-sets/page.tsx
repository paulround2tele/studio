"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, Edit } from 'lucide-react';
import { keywordSetsApi, type components } from '@/lib/api-client/client';

type KeywordSet = components['schemas']['KeywordSetResponse'];

export default function KeywordSetsPage() {
  const [sets, setSets] = useState<KeywordSet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSets = useCallback(async () => {
    setIsLoading(true);
    try {
      const resp = await keywordSetsApi.listKeywordSets();
      setSets(resp.data as any);
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Failed to load keyword sets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSets();
    
    let wsCleanup: (() => void) | null = null;

    const connectWebSocket = async () => {
      try {
        // Import the WebSocket service dynamically to avoid SSR issues
        const { websocketService } = await import('@/lib/services/websocketService.simple');
        
        console.log('[KeywordSetsPage] Connecting to WebSocket for keyword set updates...');
        
        // Connect to WebSocket for keyword set updates
        wsCleanup = websocketService.connect('keyword-sets', {
          onMessage: (message) => {
            console.log('[KeywordSetsPage] WebSocket message received:', message);
            
            // Route keyword set-specific messages
            if (message.type === 'keyword_set_list_update') {
              console.log('[KeywordSetsPage] Keyword set list update detected, refreshing data...');
              // Refresh the data without loading spinner
              loadSets();
            }
          },
          onConnect: () => {
            console.log('[KeywordSetsPage] WebSocket connected for keyword set push updates');
          },
          onError: (error) => {
            console.error('[KeywordSetsPage] WebSocket error:', error);
          },
          onDisconnect: () => {
            console.log('[KeywordSetsPage] WebSocket disconnected');
          }
        });
        
      } catch (error) {
        console.error('[KeywordSetsPage] Failed to connect WebSocket:', error);
      }
    };

    // Connect WebSocket for real-time updates
    connectWebSocket();
    
    return () => {
      // Cleanup WebSocket connection
      if (wsCleanup) {
        wsCleanup();
      }
    };
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
