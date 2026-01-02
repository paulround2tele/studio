"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Button from "@/components/ta/ui/button/Button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import Input from "@/components/ta/form/input/InputField";
import TextAreaAdapter from "@/components/ta/adapters/TextAreaAdapter";
import Switch from "@/components/ta/form/switch/Switch";
import SelectAdapter from "@/components/ta/adapters/SelectAdapter";
import { useMemo } from "react";
import type { Proxy as ProxyType } from '@/lib/api-client/models/proxy';
import type { UpdateProxyRequestAPI as UpdateProxyRequest } from '@/lib/api-client/models/update-proxy-request-api';
import { ProxyProtocol } from '@/lib/api-client/models/proxy-protocol';

// Type aliases for better readability
import { useUpdateProxyMutation } from '@/store/api/proxyApi';
import { useToast } from '@/hooks/use-toast';
// THIN CLIENT: Removed AuthContext - backend handles auth
import { LoaderIcon } from "@/icons";
const PROXY_PROTOCOLS = ['http', 'https', 'socks4', 'socks5'] as const;
const INITIAL_PROXY_STATUSES = ['Active', 'Disabled'] as const; // For creating new proxy

type _ProxyFormProtocol = typeof PROXY_PROTOCOLS[number]; // Unused
type _ProxyFormStatus = typeof INITIAL_PROXY_STATUSES[number]; // Unused

// Proxy form schema
const proxyFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required." }),
  description: z.string().optional(),
  address: z.string().min(7, { message: "Proxy address must be at least 7 characters (e.g., 1.2.3.4:80)." })
    .regex(/^[a-zA-Z0-9.-]+:[0-9]+$/, "Invalid hostname:port format"),
  protocol: z.enum(PROXY_PROTOCOLS, { required_error: "Protocol is required." }),
  username: z.string().optional(),
  password: z.string().optional(),
  countryCode: z.string().optional(),
  notes: z.string().optional(),
  userEnabled: z.boolean().optional().default(true),
  initialStatus: z.enum(INITIAL_PROXY_STATUSES).optional(),
});

type ProxyFormValues = z.infer<typeof proxyFormSchema>;

interface ProxyFormProps {
  proxyToEdit?: ProxyType | null;
  onSaveSuccess: () => void;
  onCancel: () => void;
}

export default function ProxyForm({ proxyToEdit, onSaveSuccess, onCancel }: ProxyFormProps) {
  const { toast } = useToast();
  const [updateProxy] = useUpdateProxyMutation();
  // THIN CLIENT: Removed useAuth - backend handles authentication
  const user = null; // Backend provides user data when needed
  const isEditing = !!proxyToEdit;

  // Build options for SelectAdapter
  const protocolOptions = useMemo(() => PROXY_PROTOCOLS.map(p => ({ value: p, label: p.toUpperCase() })), []);
  const statusOptions = useMemo(() => INITIAL_PROXY_STATUSES.map(s => ({ value: s, label: s })), []);

  const form = useForm<ProxyFormValues>({
    resolver: zodResolver(proxyFormSchema),
    defaultValues: isEditing && proxyToEdit ? {
      name: proxyToEdit.name,
      description: typeof proxyToEdit.description === 'string' ? proxyToEdit.description : (proxyToEdit.description || ""),
      address: proxyToEdit.address,
      protocol: (proxyToEdit.protocol as typeof PROXY_PROTOCOLS[number]) || "http",
      username: typeof proxyToEdit.username === 'string' ? proxyToEdit.username : (proxyToEdit.username || ""),
      password: "",
      countryCode: typeof proxyToEdit.countryCode === 'string' ? proxyToEdit.countryCode : (proxyToEdit.countryCode || ""),
      notes: typeof proxyToEdit.notes === 'string' ? proxyToEdit.notes : (proxyToEdit.notes || ""),
      userEnabled: proxyToEdit.isEnabled,
      // initialStatus is not used for editing, status is managed by test/toggle
    } : {
      name: "",
      description: "",
      address: "",
      protocol: 'http',
      username: "",
      password: "",
      countryCode: "",
      notes: "",
      userEnabled: true,
      initialStatus: 'Disabled',
    },
    mode: "onChange",
  });

  async function onSubmit(data: ProxyFormValues) {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to create or edit proxies.", variant: "destructive" });
      return;
    }

    try {
      let response;
      if (isEditing && proxyToEdit) {
        const payload: UpdateProxyRequest = {
          name: data.name,
          description: data.description,
          address: data.address,
          protocol: data.protocol as ProxyProtocol,
          username: data.username,
          password: data.password,
          countryCode: data.countryCode,
          isEnabled: data.userEnabled,
          // Status is generally not updated via this form directly in edit mode
        };
        if (!proxyToEdit.id) {
          toast({ title: "Error", description: "Invalid proxy ID", variant: "destructive" });
          return;
        }
        response = await updateProxy({ proxyId: proxyToEdit.id, request: payload });
      } else {
        // CREATE FUNCTIONALITY NOT IMPLEMENTED
        toast({ 
          title: "Feature Not Available", 
          description: "Proxy creation is not yet implemented. Please use the API directly.", 
          variant: "destructive" 
        });
        return;
      }

      if (response && 'data' in response) {
        onSaveSuccess();
      } else {
        toast({ 
          title: `Error ${isEditing ? "Updating" : "Creating"} Proxy`, 
          description: "Operation failed. Please try again.", 
          variant: "destructive" 
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({ title: "Operation Failed", description: errorMessage, variant: "destructive" });
    }
  }

  return (
    <Form {...form}>
      <form data-testid="proxy-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem data-testid="proxy-field-name">
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input data-testid="proxy-input-name" placeholder="Proxy name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem data-testid="proxy-field-description">
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <TextAreaAdapter data-testid="proxy-input-description" placeholder="Proxy description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem data-testid="proxy-field-address">
              <FormLabel>Proxy Address</FormLabel>
              <FormControl>
                <Input data-testid="proxy-input-address" placeholder="e.g., 127.0.0.1:8080 or socks5://user:pass@host:port" {...field} />
              </FormControl>
              <FormDescription>
                Include IP/hostname and port. For authenticated proxies, use format: protocol://user:password@host:port
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="protocol"
          render={({ field }) => (
            <FormItem data-testid="proxy-field-protocol">
              <FormLabel>Protocol</FormLabel>
              <FormControl>
                <SelectAdapter
                  data-testid="proxy-input-protocol"
                  options={protocolOptions}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Select a protocol"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem data-testid="proxy-field-username">
              <FormLabel>Username (Optional)</FormLabel>
              <FormControl>
                <Input data-testid="proxy-input-username" placeholder="Auth username" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem data-testid="proxy-field-password">
              <FormLabel>Password (Optional)</FormLabel>
              <FormControl>
                <Input data-testid="proxy-input-password" type="password" placeholder="Auth password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="countryCode"
          render={({ field }) => (
            <FormItem data-testid="proxy-field-country-code">
              <FormLabel>Country Code (Optional)</FormLabel>
              <FormControl>
                <Input data-testid="proxy-input-country-code" placeholder="US" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem data-testid="proxy-field-notes">
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <TextAreaAdapter data-testid="proxy-input-notes" placeholder="Any notes about this proxy (e.g., provider, location)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="userEnabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm" data-testid="proxy-field-user-enabled">
              <FormControl>
                <Switch 
                  label="User Enabled" 
                  defaultChecked={field.value} 
                  onChange={field.onChange} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {!isEditing && (
            <FormField
            control={form.control}
            name="initialStatus"
            render={({ field }) => (
                <FormItem data-testid="proxy-field-initial-status">
                <FormLabel>Initial Status</FormLabel>
                <FormControl>
                  <SelectAdapter
                    data-testid="proxy-input-initial-status"
                    options={statusOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Select initial status"
                  />
                </FormControl>
                <FormDescription>Set the initial status for this new proxy. It&apos;s recommended to start as &apos;Disabled&apos; until tested.</FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        )}

        <div className="flex justify-end gap-2 pt-4" data-testid="proxy-actions">
          <Button data-testid="proxy-cancel" type="button" variant="outline" onClick={onCancel} disabled={form.formState.isSubmitting}>
            Cancel
          </Button>
          <Button data-testid="proxy-submit" type="submit" disabled={form.formState.isSubmitting} startIcon={form.formState.isSubmitting ? <LoaderIcon className="h-4 w-4 animate-spin" /> : undefined}>
            {isEditing ? 'Save Changes' : 'Add Proxy'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
