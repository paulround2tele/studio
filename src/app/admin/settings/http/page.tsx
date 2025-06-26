'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import { getHTTPConfig, updateHTTPConfig } from '@/lib/services/settingsService';

const schema = z.object({
  defaultUserAgent: z.string().min(1, 'User agent required'),
  requestTimeoutSeconds: z.coerce.number().int().positive(),
  maxRedirects: z.coerce.number().int().positive(),
  allowInsecureTLS: z.boolean().optional().default(false),
});

type FormValues = z.infer<typeof schema>;

export default function HTTPSettingsPage() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const cfg = await getHTTPConfig();
        form.reset({
          defaultUserAgent: cfg.defaultUserAgent,
          requestTimeoutSeconds: cfg.requestTimeoutSeconds,
          maxRedirects: cfg.maxRedirects,
          allowInsecureTLS: cfg.allowInsecureTLS,
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
      await updateHTTPConfig({
        defaultUserAgent: data.defaultUserAgent,
        requestTimeoutSeconds: data.requestTimeoutSeconds,
        maxRedirects: data.maxRedirects,
        allowInsecureTLS: data.allowInsecureTLS || false,
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
        <h1 className="text-3xl font-bold">HTTP Configuration</h1>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert><AlertDescription>{success}</AlertDescription></Alert>}
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>HTTP Validator Settings</CardTitle>
          <CardDescription>Edit HTTP validation parameters.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField name="defaultUserAgent" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Default User Agent</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="requestTimeoutSeconds" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Request Timeout (s)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="maxRedirects" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Redirects</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="allowInsecureTLS" control={form.control} render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel>Allow Insecure TLS</FormLabel>
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
