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
import { proxyPoolsApi } from "@/lib/api-client/client";
import type { ProxyPool } from '@/lib/api-client/professional-types';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const poolSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isEnabled: z.boolean().default(true),
});

type PoolFormValues = z.infer<typeof poolSchema>;

interface ProxyPoolFormProps {
  pool?: ProxyPool | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function ProxyPoolForm({
  pool,
  onSuccess,
  onCancel,
}: ProxyPoolFormProps) {
  const { toast } = useToast();
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
      if (isEditing && pool && pool.id) {
        await proxyPoolsApi.proxyPoolsPoolIdPut(pool.id, values);
        toast({ title: "Pool updated" });
        onSuccess();
      } else {
        await proxyPoolsApi.proxyPoolsPost(values);
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
