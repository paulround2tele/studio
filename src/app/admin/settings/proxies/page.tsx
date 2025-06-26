'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import { getProxyManagerConfig, updateProxyManagerConfig } from '@/lib/services/settingsService';

const schema = z.object({
  testTimeoutSeconds: z.coerce.number().int().positive(),
  testUrl: z.string().url(),
  initialHealthCheckTimeoutSeconds: z.coerce.number().int().positive(),
  maxConcurrentInitialChecks: z.coerce.number().int().positive(),
});

type FormValues = z.infer<typeof schema>;

export default function ProxyManagerSettingsPage() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const cfg = await getProxyManagerConfig();
        form.reset({
          testTimeoutSeconds: cfg.testTimeoutSeconds,
          testUrl: cfg.testUrl,
          initialHealthCheckTimeoutSeconds: cfg.initialHealthCheckTimeoutSeconds,
          maxConcurrentInitialChecks: cfg.maxConcurrentInitialChecks,
        });
      } catch (e) {
        console.error(e);
        setError('Failed to load configuration');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [form]);

  async function onSubmit(data: FormValues) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await updateProxyManagerConfig({
        testTimeoutSeconds: data.testTimeoutSeconds,
        testUrl: data.testUrl,
        initialHealthCheckTimeoutSeconds: data.initialHealthCheckTimeoutSeconds,
        maxConcurrentInitialChecks: data.maxConcurrentInitialChecks,
      });
      setSuccess('Configuration saved');
    } catch (e) {
      console.error(e);
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/settings"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></Link>
        <h1 className="text-3xl font-bold">Proxy Manager Configuration</h1>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert><AlertDescription>{success}</AlertDescription></Alert>}
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Proxy Manager Settings</CardTitle>
          <CardDescription>Edit proxy health check parameters.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField name="testTimeoutSeconds" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Timeout (s)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="testUrl" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test URL</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="initialHealthCheckTimeoutSeconds" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Health Check Timeout (s)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="maxConcurrentInitialChecks" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Concurrent Initial Checks</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save</Button>
                  <Button type="button" variant="outline" onClick={() => form.reset()} disabled={saving}>Cancel</Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
