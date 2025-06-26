'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import { getDNSConfig, updateDNSConfig } from '@/lib/services/settingsService';

const schema = z.object({
  resolvers: z.string().min(1, 'Resolvers are required'),
  queryTimeoutSeconds: z.coerce.number().int().positive(),
  maxDomainsPerRequest: z.coerce.number().int().positive(),
  resolverStrategy: z.string().min(1, 'Strategy is required'),
  resolversWeighted: z.string().optional(),
  resolversPreferredOrder: z.string().optional(),
  concurrentQueriesPerDomain: z.coerce.number().int().positive(),
  queryDelayMinMs: z.coerce.number().int().nonnegative(),
  queryDelayMaxMs: z.coerce.number().int().nonnegative(),
  maxConcurrentGoroutines: z.coerce.number().int().positive(),
  rateLimitDps: z.coerce.number().nonnegative().optional(),
  rateLimitBurst: z.coerce.number().int().nonnegative().optional(),
});

type FormValues = z.infer<typeof schema>;

function parseStringToArray(input: string | undefined): string[] {
  if (!input) return [];
  return input.split(',').map(s => s.trim()).filter(Boolean);
}

function parseJsonOrUndefined<T>(jsonString: string | undefined): T | undefined {
  if (!jsonString) return undefined;
  try {
    const parsed = JSON.parse(jsonString);
    return parsed as T;
  } catch {
    return undefined;
  }
}

export default function DNSSettingsPage() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const cfg = await getDNSConfig();
        form.reset({
          resolvers: cfg.resolvers?.join(', ') || '',
          queryTimeoutSeconds: cfg.queryTimeoutSeconds,
          maxDomainsPerRequest: cfg.maxDomainsPerRequest,
          resolverStrategy: cfg.resolverStrategy,
          resolversWeighted: cfg.resolversWeighted ? JSON.stringify(cfg.resolversWeighted, null, 2) : '',
          resolversPreferredOrder: cfg.resolversPreferredOrder?.join(', ') || '',
          concurrentQueriesPerDomain: cfg.concurrentQueriesPerDomain,
          queryDelayMinMs: cfg.queryDelayMinMs,
          queryDelayMaxMs: cfg.queryDelayMaxMs,
          maxConcurrentGoroutines: cfg.maxConcurrentGoroutines,
          rateLimitDps: cfg.rateLimitDps,
          rateLimitBurst: cfg.rateLimitBurst,
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
      await updateDNSConfig({
        resolvers: parseStringToArray(data.resolvers),
        queryTimeoutSeconds: data.queryTimeoutSeconds,
        maxDomainsPerRequest: data.maxDomainsPerRequest,
        resolverStrategy: data.resolverStrategy,
        resolversWeighted: parseJsonOrUndefined<Record<string, number>>(data.resolversWeighted),
        resolversPreferredOrder: parseStringToArray(data.resolversPreferredOrder),
        concurrentQueriesPerDomain: data.concurrentQueriesPerDomain,
        queryDelayMinMs: data.queryDelayMinMs ?? 0,
        queryDelayMaxMs: data.queryDelayMaxMs ?? 0,
        maxConcurrentGoroutines: data.maxConcurrentGoroutines,
        rateLimitDps: data.rateLimitDps,
        rateLimitBurst: data.rateLimitBurst,
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
        <h1 className="text-3xl font-bold">DNS Configuration</h1>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {success && <Alert><AlertDescription>{success}</AlertDescription></Alert>}
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>DNS Validator Settings</CardTitle>
          <CardDescription>Edit DNS validation parameters.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField name="resolvers" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolvers (comma separated)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="queryTimeoutSeconds" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Query Timeout (s)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="maxDomainsPerRequest" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Domains Per Request</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="resolverStrategy" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolver Strategy</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="resolversWeighted" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weighted Resolvers (JSON)</FormLabel>
                    <FormControl>
                      <Textarea className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="resolversPreferredOrder" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Order (comma separated)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="concurrentQueriesPerDomain" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Concurrent Queries Per Domain</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="queryDelayMinMs" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Query Delay Min (ms)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="queryDelayMaxMs" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Query Delay Max (ms)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="maxConcurrentGoroutines" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Concurrent Goroutines</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="rateLimitDps" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate Limit DPS</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <FormField name="rateLimitBurst" control={form.control} render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rate Limit Burst</FormLabel>
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
