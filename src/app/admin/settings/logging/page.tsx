"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  getLoggingConfig,
  updateLoggingConfig,
} from "@/lib/services/settingsService";

const schema = z.object({
  level: z.enum(["DEBUG", "INFO", "WARN", "ERROR"], {
    required_error: "Level is required",
  }),
  enableFileLogging: z.boolean().optional(),
  logDirectory: z.string().optional(),
  maxFileSize: z.coerce.number().int().positive().optional(),
  maxBackups: z.coerce.number().int().nonnegative().optional(),
  maxAge: z.coerce.number().int().positive().optional(),
  enableJSONFormat: z.boolean().optional(),
  enableRequestLogging: z.boolean().optional(),
  enablePerformanceLogging: z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function LoggingSettingsPage() {
  const form = useForm<FormValues>({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const cfg = await getLoggingConfig();
        form.reset({
          level: cfg.level as FormValues["level"],
          enableFileLogging: cfg.enableFileLogging,
          logDirectory: cfg.logDirectory || "",
          maxFileSize: cfg.maxFileSize,
          maxBackups: cfg.maxBackups,
          maxAge: cfg.maxAge,
          enableJSONFormat: cfg.enableJSONFormat,
          enableRequestLogging: cfg.enableRequestLogging,
          enablePerformanceLogging: cfg.enablePerformanceLogging,
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
      await updateLoggingConfig({
        level: data.level,
        enableFileLogging: data.enableFileLogging,
        logDirectory: data.logDirectory,
        maxFileSize: data.maxFileSize,
        maxBackups: data.maxBackups,
        maxAge: data.maxAge,
        enableJSONFormat: data.enableJSONFormat,
        enableRequestLogging: data.enableRequestLogging,
        enablePerformanceLogging: data.enablePerformanceLogging,
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
        <h1 className="text-3xl font-bold">Logging Configuration</h1>
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
          <CardTitle>Logging Settings</CardTitle>
          <CardDescription>Edit server logging options.</CardDescription>
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
                  name="level"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Logging Level</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="DEBUG">DEBUG</SelectItem>
                          <SelectItem value="INFO">INFO</SelectItem>
                          <SelectItem value="WARN">WARN</SelectItem>
                          <SelectItem value="ERROR">ERROR</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="enableFileLogging"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Enable File Logging</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  name="logDirectory"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Log Directory</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="maxFileSize"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max File Size (MB)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="maxBackups"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Backups</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="maxAge"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Age (days)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  name="enableJSONFormat"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Enable JSON Format</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  name="enableRequestLogging"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Enable Request Logging</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  name="enablePerformanceLogging"
                  control={form.control}
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel>Enable Performance Logging</FormLabel>
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
