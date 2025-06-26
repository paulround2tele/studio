"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, ArrowLeft } from "lucide-react";
import {
  getWorkerConfig,
  updateWorkerConfig,
} from "@/lib/services/settingsService";

const schema = z.object({
  numWorkers: z.coerce.number().int().positive(),
  pollIntervalSeconds: z.coerce.number().int().positive(),
  errorRetryDelaySeconds: z.coerce.number().int().positive().optional(),
  maxJobRetries: z.coerce.number().int().positive().optional(),
  jobProcessingTimeoutMinutes: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
  batchSize: z.coerce.number().int().positive().optional(),
  maxRetries: z.coerce.number().int().positive().optional(),
  retryDelaySeconds: z.coerce.number().int().positive().optional(),
  dnsSubtaskConcurrency: z.coerce.number().int().positive().optional(),
  httpKeywordSubtaskConcurrency: z.coerce
    .number()
    .int()
    .positive()
    .optional(),
});

type FormValues = z.infer<typeof schema>;

export default function WorkerSettingsPage() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const cfg = await getWorkerConfig();
        form.reset({
          numWorkers: cfg.numWorkers,
          pollIntervalSeconds: cfg.pollIntervalSeconds,
          errorRetryDelaySeconds: cfg.errorRetryDelaySeconds ?? 30,
          maxJobRetries: cfg.maxJobRetries ?? 3,
          jobProcessingTimeoutMinutes: cfg.jobProcessingTimeoutMinutes ?? 15,
          batchSize: cfg.batchSize,
          maxRetries: cfg.maxRetries,
          retryDelaySeconds: cfg.retryDelaySeconds,
          dnsSubtaskConcurrency: cfg.dnsSubtaskConcurrency ?? 0,
          httpKeywordSubtaskConcurrency:
            cfg.httpKeywordSubtaskConcurrency ?? 0,
        });
      } catch (e) {
        console.error(e);
        setError("Failed to load configuration");
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
      await updateWorkerConfig({
        numWorkers: data.numWorkers,
        pollIntervalSeconds: data.pollIntervalSeconds,
        errorRetryDelaySeconds: data.errorRetryDelaySeconds,
        maxJobRetries: data.maxJobRetries,
        jobProcessingTimeoutMinutes: data.jobProcessingTimeoutMinutes,
        batchSize: data.batchSize,
        maxRetries: data.maxRetries,
        retryDelaySeconds: data.retryDelaySeconds,
        dnsSubtaskConcurrency: data.dnsSubtaskConcurrency,
        httpKeywordSubtaskConcurrency: data.httpKeywordSubtaskConcurrency,
      });
      setSuccess("Configuration saved");
    } catch (e) {
      console.error(e);
      setError("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/settings">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>
        <h1 className="text-3xl font-bold">Worker Configuration</h1>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Worker Settings</CardTitle>
          <CardDescription>Edit background worker parameters.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  name="numWorkers"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Workers</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="pollIntervalSeconds"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Poll Interval (s)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="errorRetryDelaySeconds"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Error Retry Delay (s)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="maxJobRetries"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Job Retries</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="jobProcessingTimeoutMinutes"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Job Timeout (min)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="batchSize"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Batch Size</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="maxRetries"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Retries</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="retryDelaySeconds"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Retry Delay (s)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="dnsSubtaskConcurrency"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNS Subtask Concurrency</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="httpKeywordSubtaskConcurrency"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HTTP Keyword Subtask Concurrency</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => form.reset()}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
