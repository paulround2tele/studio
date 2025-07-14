"use client";

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import { keywordSetsApi, type CreateKeywordSetRequest } from '@/lib/api-client/client';

type CreateKeywordSetPayload = CreateKeywordSetRequest;
import StrictProtectedRoute from '@/components/auth/StrictProtectedRoute';

export default function NewKeywordSetPage() {
  const router = useRouter();
  const form = useForm<CreateKeywordSetPayload>({
    defaultValues: { name: '', description: '', isEnabled: true },
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const onSubmit = useCallback(async (data: CreateKeywordSetPayload) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // Remove rules from payload since this form doesn't handle them
      const { rules: _rules, ...cleanData } = data;
      await keywordSetsApi.keywordSetsPost(cleanData);
      setSuccessMessage('Keyword set created');
      setTimeout(() => router.push('/keyword-sets'), 500);
    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Failed to create keyword set');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  return (
    <StrictProtectedRoute>
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
              <Button type="submit" disabled={isLoading}>{isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Set</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </StrictProtectedRoute>
  );
}
