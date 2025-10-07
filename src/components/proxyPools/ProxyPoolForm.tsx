"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
// TODO: Replace with actual generated API client once endpoint mapping updated
// import { proxyPoolsApi } from "@/lib/api-client/compat";
import type { ProxyPool as ProxyPoolType, ProxyPoolRequest } from '@/lib/api-client/models';
import React from 'react';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const poolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isEnabled: z.boolean().default(true),
});

type PoolFormValues = z.infer<typeof poolSchema>;

interface ProxyPoolFormProps {
  pool?: ProxyPoolType | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProxyPoolForm({
  pool,
  onSuccess,
  onCancel,
}: ProxyPoolFormProps) {
  const { toast } = useToast();
  // Minimal proxy pools API implementation leveraging generic client
  const proxyPoolsApi = React.useMemo(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v2';
    const headers = { 'Content-Type': 'application/json' };
    return {
      proxyPoolsCreate: async (body: Partial<ProxyPoolRequest>) => {
        const res = await fetch(`${base}/proxy-pools`, { method: 'POST', headers, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Failed to create pool');
        return res.json().catch(()=>undefined);
      },
      proxyPoolsUpdate: async (id: string, body: Partial<ProxyPoolRequest>) => {
        const res = await fetch(`${base}/proxy-pools/${id}`, { method: 'PUT', headers, body: JSON.stringify(body) });
        if (!res.ok) throw new Error('Failed to update pool');
        return res.json().catch(()=>undefined);
      }
    };
  }, []);
  const isEditing = !!pool;

  const form = useForm<PoolFormValues>({
    resolver: zodResolver(poolSchema),
    defaultValues: pool
      ? {
          name: pool.name,
          description: typeof pool.description === 'string' ? pool.description : (pool.description || ""),
          isEnabled: pool.isEnabled,
        }
      : { name: "", description: "", isEnabled: true },
  });

  async function onSubmit(values: PoolFormValues) {
    try {
      // Convert form values to API request format
      const requestData: ProxyPoolRequest = {
        name: values.name,
        description: values.description || undefined,
        isEnabled: values.isEnabled
      };
      
      if (isEditing && pool && pool.id) {
        await proxyPoolsApi.proxyPoolsUpdate(pool.id, requestData);
        toast({ title: "Pool updated" });
        onSuccess();
      } else {
        await proxyPoolsApi.proxyPoolsCreate(requestData);
        toast({ title: "Pool created" });
        onSuccess();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="isEnabled"
          render={({ field }) => (
            <FormItem className="flex items-center gap-2">
              <FormLabel>Enabled</FormLabel>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            )}
            {isEditing ? "Save" : "Create"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
