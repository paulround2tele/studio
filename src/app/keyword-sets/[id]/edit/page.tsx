"use client";

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import { KeywordSetsApi, Configuration } from '@/lib/api-client';
import type { KeywordSetResponse, UpdateKeywordSetRequest } from '@/lib/api-client/models';
import { unwrapApiResponse } from '@/lib/utils/unwrapApiResponse';
const keywordSetsApi = new KeywordSetsApi(new Configuration());

type UpdateKeywordSetPayload = UpdateKeywordSetRequest & {
  name: string;
  isEnabled: boolean;
};

export default function EditKeywordSetPage() {
  const params = useParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const rawKeywordSetId = params?.id;
  const keywordSetId = Array.isArray(rawKeywordSetId) ? rawKeywordSetId[0] : rawKeywordSetId;

  const form = useForm<UpdateKeywordSetPayload>({
    defaultValues: { name: '', description: '', isEnabled: true },
  });

  useEffect(() => {
    async function load() {
      if (!keywordSetId) {
        setErrorMessage('Keyword set identifier is missing.');
        setIsLoading(false);
        return;
      }
      try {
        const resp = await keywordSetsApi.keywordSetsGet(keywordSetId);
        const payload = unwrapApiResponse<KeywordSetResponse>(resp);
        if (!payload) {
          throw new Error('Empty keyword set response');
        }
        form.reset({
          name: payload.name,
          description: payload.description || '',
          isEnabled: payload.isEnabled ?? true,
        });
      } catch (e) {
        console.error(e);
        setErrorMessage(e instanceof Error ? e.message : 'Failed to load keyword set');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [keywordSetId, form]);

  const onSubmit = useCallback(async (data: UpdateKeywordSetPayload) => {
    if (!keywordSetId) {
      setErrorMessage('Keyword set identifier is missing.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // Use the correct method name from the generated API
      const request: UpdateKeywordSetRequest = {
        name: data.name,
        description: data.description,
        isEnabled: data.isEnabled,
      };
      await keywordSetsApi.keywordSetsUpdate(keywordSetId, request);
      setSuccessMessage('Keyword set updated');
      // PERFORMANCE FIX: Immediate navigation instead of 500ms delay
      router.push('/keyword-sets');
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Failed to update keyword set');
    } finally {
      setIsLoading(false);
    }
  }, [keywordSetId, router]);

  if (isLoading) {
    return <div className="flex justify-center p-6"><Loader2 className="h-4 w-4 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/keyword-sets"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></Link>
          <h1 className="text-3xl font-bold">Edit Keyword Set</h1>
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
                <Input id="name" {...form.register('name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" {...form.register('description')} />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="enabled" checked={form.watch('isEnabled')} onCheckedChange={v => form.setValue('isEnabled', !!v)} />
                <Label htmlFor="enabled">Enabled</Label>
              </div>
              <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save Changes</Button>
            </form>
          </CardContent>
        </Card>
    </div>
  );
}
