"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PersonasApi, Configuration } from '@/lib/api-client';
import type { PersonaResponse as ApiPersonaResponse } from '@/lib/api-client/models/persona-response';
import type { PersonaConfigHttp as HTTPConfigDetails } from '@/lib/api-client/models/persona-config-http';
import type { PersonaConfigDns as DNSConfigDetails } from '@/lib/api-client/models/persona-config-dns';
import type { PersonaConfigDetails } from '@/lib/api-client/models/persona-config-details';
import { PersonaType as ApiCreatePersonaRequestPersonaTypeEnum } from '@/lib/api-client/models/persona-type';
import type { CreatePersonaRequest } from '@/lib/api-client/models/create-persona-request';
import type { UpdatePersonaRequest } from '@/lib/api-client/models/update-persona-request';
const personasApi = new PersonasApi(new Configuration());

// Type aliases for better readability
type Persona = ApiPersonaResponse;

// Narrowers
function asHttpConfig(p: Persona | undefined): HTTPConfigDetails | undefined {
  const c = p?.configDetails as PersonaConfigDetails | undefined;
  if (c && 'userAgent' in c) return c as HTTPConfigDetails; // distinctive HTTP field
  return undefined;
}
function asDnsConfig(p: Persona | undefined): DNSConfigDetails | undefined {
  const c = p?.configDetails as PersonaConfigDetails | undefined;
  if (c && 'resolvers' in c) return c as DNSConfigDetails; // distinctive DNS field
  return undefined;
}

// DNS Resolver Strategy options - aligned with OpenAPI schema
type DnsResolverStrategy = "round_robin" | "random" | "weighted" | "priority";
const DNS_RESOLVER_STRATEGIES: DnsResolverStrategy[] = [
  "round_robin",
  "random",
  "weighted",
  "priority"
];

// Utility functions
function parseStringToArray(input: string | undefined): string[] {
  if (!input) return [];
  return input.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

function parseJsonOrUndefined<T>(jsonString: string | undefined): T | undefined {
  if (!jsonString || jsonString.trim() === "" || jsonString.trim() === "{}") {
    return undefined;
  }
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return undefined;
  }
}

// HTTP Persona Schema (strictly matches PersonaConfigHttp fields + request wrapper meta)
const httpPersonaFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  userAgent: z.string().min(1, "User-Agent is required"),
  headersJson: z.string().optional(),
  headerOrderInput: z.string().optional(),
  tlsClientHelloJson: z.string().optional(),
  http2SettingsJson: z.string().optional(),
  cookieHandlingJson: z.string().optional(),
  requestTimeoutSeconds: z.number().min(1).optional(),
  followRedirects: z.boolean().optional(),
  allowedStatusCodesInput: z.string().optional(), // comma separated numbers
  rateLimitDps: z.number().optional(),
  rateLimitBurst: z.number().optional(),
  notes: z.string().optional(),
  // enable toggle - default true
  isEnabled: z.boolean().default(true)
});

// DNS Persona Schema (strict to PersonaConfigDns plus wrapper meta)
const dnsPersonaFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  config_resolversInput: z.string().min(1, "At least one resolver is required"),
  config_useSystemResolvers: z.boolean(),
  config_queryTimeoutSeconds: z.number().min(1),
  config_maxDomainsPerRequest: z.number().optional(),
  config_resolverStrategy: z.enum(DNS_RESOLVER_STRATEGIES as [DnsResolverStrategy, ...DnsResolverStrategy[]]),
  config_resolversWeightedJson: z.string().optional(),
  config_resolversPreferredOrderInput: z.string().optional(),
  config_concurrentQueriesPerDomain: z.number().min(1),
  config_queryDelayMinMs: z.number().optional(),
  config_queryDelayMaxMs: z.number().optional(),
  config_maxConcurrentGoroutines: z.number().min(1),
  config_rateLimitDps: z.number().optional(),
  config_rateLimitBurst: z.number().optional(),
  isEnabled: z.boolean().default(true),
});

type HttpPersonaFormValues = z.infer<typeof httpPersonaFormSchema>;
type DnsPersonaFormValues = z.infer<typeof dnsPersonaFormSchema>;

interface PersonaFormProps {
  persona?: Persona;
  isEditing?: boolean;
  personaType: 'http' | 'dns';
}

// HTTP Persona Form Component
function HttpPersonaForm({ persona, isEditing = false }: { persona?: Persona; isEditing?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  // Authentication handled server-side; client form proceeds directly

  // Accept any serializable object; we only display it read/write as JSON text.
  const stringifyJsonForForm = (obj: unknown) => obj ? JSON.stringify(obj as object, null, 2) : "{}";
  const form = useForm<HttpPersonaFormValues>({
    resolver: zodResolver(httpPersonaFormSchema),
    defaultValues: persona
      ? {
          name: persona.name || "",
          description: persona.description || "",
          userAgent: asHttpConfig(persona)?.userAgent || "",
          headersJson: stringifyJsonForForm(asHttpConfig(persona)?.headers || {}),
          headerOrderInput: asHttpConfig(persona)?.headerOrder?.join(', ') || "",
          tlsClientHelloJson: stringifyJsonForForm(asHttpConfig(persona)?.tlsClientHello || {}),
          http2SettingsJson: stringifyJsonForForm(asHttpConfig(persona)?.http2Settings || {}),
          cookieHandlingJson: stringifyJsonForForm(asHttpConfig(persona)?.cookieHandling || {}),
          requestTimeoutSeconds: asHttpConfig(persona)?.requestTimeoutSeconds,
          followRedirects: asHttpConfig(persona)?.followRedirects,
          allowedStatusCodesInput: (asHttpConfig(persona)?.allowedStatusCodes || []).join(', '),
          rateLimitDps: asHttpConfig(persona)?.rateLimitDps,
          rateLimitBurst: asHttpConfig(persona)?.rateLimitBurst,
          notes: asHttpConfig(persona)?.notes || "",
          isEnabled: persona.isEnabled ?? true,
        }
      : {
          name: "",
          description: "",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
          headersJson: stringifyJsonForForm({ "Accept-Language": "en-US,en;q=0.9" }),
          headerOrderInput: "",
          tlsClientHelloJson: stringifyJsonForForm({ "cipherSuites": ["TLS_AES_128_GCM_SHA256", "TLS_CHACHA20_POLY1305_SHA256"] }),
          http2SettingsJson: stringifyJsonForForm({ "headerTableSize": 4096, "enablePush": false }),
          cookieHandlingJson: stringifyJsonForForm({ "mode": "session" }),
          requestTimeoutSeconds: 30,
          followRedirects: true,
          allowedStatusCodesInput: "200, 301, 302", // sensible defaults
          rateLimitDps: undefined,
          rateLimitBurst: undefined,
          notes: "",
          isEnabled: true,
        },
    mode: "onChange",
  });

  async function onSubmit(data: HttpPersonaFormValues) {
    const commonPayloadData: Pick<CreatePersonaRequest, 'name' | 'description' | 'isEnabled'> = {
      name: data.name,
      description: data.description || undefined,
      isEnabled: data.isEnabled
    };

    try {
      const httpConfigDetails: HTTPConfigDetails = {
        userAgent: data.userAgent,
        headers: parseJsonOrUndefined<Record<string,string>>(data.headersJson || ""),
        headerOrder: parseStringToArray(data.headerOrderInput || ""),
        tlsClientHello: parseJsonOrUndefined(data.tlsClientHelloJson || ""),
        http2Settings: parseJsonOrUndefined(data.http2SettingsJson || ""),
        cookieHandling: parseJsonOrUndefined(data.cookieHandlingJson || ""),
        requestTimeoutSeconds: data.requestTimeoutSeconds,
        followRedirects: data.followRedirects,
        allowedStatusCodes: parseStringToArray(data.allowedStatusCodesInput || '').map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n)),
        rateLimitDps: data.rateLimitDps,
        rateLimitBurst: data.rateLimitBurst,
        notes: data.notes || undefined,
      };

      const payload: CreatePersonaRequest = {
        ...commonPayloadData,
        personaType: ApiCreatePersonaRequestPersonaTypeEnum.http,
        configDetails: httpConfigDetails as PersonaConfigDetails,
      };

      let response;
      if (isEditing && persona && persona.id) {
        const updatePayload: UpdatePersonaRequest = {
          name: commonPayloadData.name,
          description: commonPayloadData.description,
          isEnabled: commonPayloadData.isEnabled,
          configDetails: httpConfigDetails as PersonaConfigDetails
        };
        response = await personasApi.personasUpdate(persona.id, updatePayload);
      } else {
        response = await personasApi.personasCreate(payload);
      }

      if (response.status >= 200 && response.status < 300) {
        // Direct resource body already returned (no envelope) via axios client
  const body = (response as { data?: Persona })?.data;
  toast({ title: `Persona ${isEditing ? "Updated" : "Created"}`, description: `Persona "${body?.name || ''}" has been successfully ${isEditing ? "updated" : "created"}.` });
        router.push("/personas");
        router.refresh();
      } else {
        toast({ title: "Save Failed", description: "Failed to save persona. Please try again.", variant: "destructive" });
      }
    } catch (error: unknown) {
      console.error("Failed to save persona:", error);
      toast({ 
        title: "Save Failed", 
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.", 
        variant: "destructive" 
      });
    }
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-xl" data-testid="persona-http-card">
      <CardHeader data-testid="persona-http-header">
        <CardTitle data-testid="persona-http-title">{isEditing ? "Edit" : "Create New"} HTTP Persona</CardTitle>
        <CardDescription data-testid="persona-http-description">
          {isEditing ? "Update details for this HTTP persona." : "Define a new HTTP persona for network operations."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form data-testid="persona-http-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem data-testid="persona-http-field-name">
                <FormLabel>Persona Name</FormLabel>
                <FormControl><Input data-testid="persona-http-input-name" placeholder="e.g., Stealth Chrome US" {...field} /></FormControl>
                <FormDescription>A unique and descriptive name for this persona.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem data-testid="persona-http-field-description">
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl><Textarea data-testid="persona-http-input-description" placeholder="Describe the purpose or key characteristics of this persona." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="userAgent" render={({ field }) => (
              <FormItem data-testid="persona-http-field-user-agent">
                <FormLabel>User-Agent String</FormLabel>
                <FormControl><Input data-testid="persona-http-input-user-agent" placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64)..." {...field} /></FormControl>
                <FormDescription>The User-Agent string this persona will use.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="headersJson" render={({ field }) => (
              <FormItem data-testid="persona-http-field-headers-json">
                <FormLabel>HTTP Headers (JSON)</FormLabel>
                <FormControl><Textarea data-testid="persona-http-input-headers-json" placeholder='{ "Accept-Language": "en-US,en;q=0.9", "X-Custom-Header": "Value" }' className="font-mono min-h-[120px]" {...field} /></FormControl>
                <FormDescription>Enter custom HTTP headers as a JSON object string.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="headerOrderInput" render={({ field }) => (
              <FormItem data-testid="persona-http-field-header-order">
                <FormLabel>Header Order (comma-separated, Optional)</FormLabel>
                <FormControl><Input data-testid="persona-http-input-header-order" placeholder="user-agent,accept-language,accept-encoding" {...field} /></FormControl>
                <FormDescription>Specify the order of headers if needed by the target.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tlsClientHelloJson" render={({ field }) => (
              <FormItem data-testid="persona-http-field-tls-client-hello">
                <FormLabel>TLS ClientHello Config (JSON, Optional)</FormLabel>
                <FormControl><Textarea data-testid="persona-http-input-tls-client-hello" placeholder='{ "minVersion": "TLS12", "cipherSuites": [...] }' className="font-mono min-h-[100px]" {...field} /></FormControl>
                <FormDescription>Define TLS handshake parameters (e.g., JA3/JA4 related).</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="http2SettingsJson" render={({ field }) => (
              <FormItem data-testid="persona-http-field-http2-settings">
                <FormLabel>HTTP/2 Settings (JSON, Optional)</FormLabel>
                <FormControl><Textarea data-testid="persona-http-input-http2-settings" placeholder='{ "headerTableSize": 4096, "enablePush": false }' className="font-mono min-h-[80px]" {...field} /></FormControl>
                <FormDescription>Configure HTTP/2 protocol parameters.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="cookieHandlingJson" render={({ field }) => (
              <FormItem data-testid="persona-http-field-cookie-handling">
                <FormLabel>Cookie Handling Config (JSON, Optional)</FormLabel>
                <FormControl><Textarea data-testid="persona-http-input-cookie-handling" placeholder='{ "mode": "session" }' className="font-mono min-h-[60px]" {...field} /></FormControl>
                <FormDescription>Define how cookies are handled (e.g., "none", "session", "file").</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="requestTimeoutSeconds" render={({ field }) => (
              <FormItem data-testid="persona-http-field-request-timeout">
                <FormLabel>Request Timeout (seconds)</FormLabel>
                <FormControl><Input data-testid="persona-http-input-request-timeout" type="number" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="followRedirects" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm" data-testid="persona-http-field-follow-redirects">
                <div className="space-y-0.5">
                  <FormLabel>Follow Redirects</FormLabel>
                </div>
                <FormControl><Switch data-testid="persona-http-input-follow-redirects" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="allowedStatusCodesInput" render={({ field }) => (
              <FormItem data-testid="persona-http-field-allowed-status-codes">
                <FormLabel>Allowed Status Codes (comma-separated)</FormLabel>
                <FormControl><Input data-testid="persona-http-input-allowed-status-codes" placeholder="200, 301, 302" {...field} /></FormControl>
                <FormDescription>Leave blank to allow any successful status code.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4" data-testid="persona-http-rate-limits">
              <FormField control={form.control} name="rateLimitDps" render={({ field }) => (
                <FormItem data-testid="persona-http-field-rate-limit-dps">
                  <FormLabel>Rate Limit (DPS)</FormLabel>
                  <FormControl><Input data-testid="persona-http-input-rate-limit-dps" type="number" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="rateLimitBurst" render={({ field }) => (
                <FormItem data-testid="persona-http-field-rate-limit-burst">
                  <FormLabel>Rate Limit Burst</FormLabel>
                  <FormControl><Input data-testid="persona-http-input-rate-limit-burst" type="number" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem data-testid="persona-http-field-notes">
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl><Textarea data-testid="persona-http-input-notes" placeholder="Internal notes about this HTTP persona." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="isEnabled" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm" data-testid="persona-http-field-is-enabled">
                <div className="space-y-0.5">
                  <FormLabel>Enabled</FormLabel>
                </div>
                <FormControl><Switch data-testid="persona-http-input-is-enabled" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-4" data-testid="persona-http-actions">
              <Button data-testid="persona-http-cancel" type="button" variant="outline" onClick={() => router.push("/personas")} disabled={form.formState.isSubmitting}>Cancel</Button>
              <Button data-testid="persona-http-submit" type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {form.formState.isSubmitting ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Persona")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// DNS Persona Form Component
function DnsPersonaForm({ persona, isEditing = false }: { persona?: Persona; isEditing?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();

  const stringifyJsonObjectForForm = (obj: Record<string, unknown> | null | undefined) => {
    if (!obj) return '{}';
    const numericOnly: Record<string, number> = {};
    for (const [k,v] of Object.entries(obj)) {
      if (typeof v === 'number' && Number.isFinite(v)) {
        numericOnly[k] = v;
      }
    }
    return JSON.stringify(numericOnly, null, 2);
  };
  const form = useForm<DnsPersonaFormValues>({
    resolver: zodResolver(dnsPersonaFormSchema),
    defaultValues: persona
      ? {
          name: persona.name || "",
          description: persona.description || "",
          config_resolversInput: asDnsConfig(persona)?.resolvers?.join(', ') || "",
          config_useSystemResolvers: asDnsConfig(persona)?.useSystemResolvers || false,
          config_queryTimeoutSeconds: asDnsConfig(persona)?.queryTimeoutSeconds || 5,
          config_maxDomainsPerRequest: asDnsConfig(persona)?.maxDomainsPerRequest || 100,
          config_resolverStrategy: (asDnsConfig(persona)?.resolverStrategy as DnsResolverStrategy) || "round_robin",
          config_resolversWeightedJson: stringifyJsonObjectForForm(asDnsConfig(persona)?.resolversWeighted || {}),
          config_resolversPreferredOrderInput: asDnsConfig(persona)?.resolversPreferredOrder?.join(', ') || "",
          config_concurrentQueriesPerDomain: asDnsConfig(persona)?.concurrentQueriesPerDomain || 2,
          config_queryDelayMinMs: asDnsConfig(persona)?.queryDelayMinMs,
          config_queryDelayMaxMs: asDnsConfig(persona)?.queryDelayMaxMs,
          config_maxConcurrentGoroutines: asDnsConfig(persona)?.maxConcurrentGoroutines || 10,
          config_rateLimitDps: asDnsConfig(persona)?.rateLimitDps,
          config_rateLimitBurst: asDnsConfig(persona)?.rateLimitBurst,
          isEnabled: persona.isEnabled ?? true,
        }
      : {
          name: "",
          description: "",
          config_resolversInput: "8.8.8.8, 1.1.1.1",
          config_useSystemResolvers: false,
          config_queryTimeoutSeconds: 5,
          config_resolverStrategy: "random" as DnsResolverStrategy,
          config_resolversWeightedJson: "{}",
          config_resolversPreferredOrderInput: "",
          config_concurrentQueriesPerDomain: 2,
          config_maxConcurrentGoroutines: 10,
          isEnabled: true,
        },
    mode: "onChange",
  });

  async function onSubmit(data: DnsPersonaFormValues) {
    const commonPayloadData: Pick<CreatePersonaRequest, 'name' | 'description' | 'isEnabled'> = {
      name: data.name,
      description: data.description || undefined,
      isEnabled: data.isEnabled,
    };

    try {
      const dnsConfigDetails: DNSConfigDetails = {
        resolvers: parseStringToArray(data.config_resolversInput || ""),
        useSystemResolvers: data.config_useSystemResolvers,
        queryTimeoutSeconds: data.config_queryTimeoutSeconds,
        maxDomainsPerRequest: data.config_maxDomainsPerRequest || 100,
        resolverStrategy: data.config_resolverStrategy as DNSConfigDetails['resolverStrategy'],
        resolversWeighted: parseJsonOrUndefined<Record<string, number>>(data.config_resolversWeightedJson || ""),
        resolversPreferredOrder: parseStringToArray(data.config_resolversPreferredOrderInput || ""),
        concurrentQueriesPerDomain: data.config_concurrentQueriesPerDomain,
        queryDelayMinMs: data.config_queryDelayMinMs,
        queryDelayMaxMs: data.config_queryDelayMaxMs,
        maxConcurrentGoroutines: data.config_maxConcurrentGoroutines,
        rateLimitDps: data.config_rateLimitDps,
        rateLimitBurst: data.config_rateLimitBurst,
      };

      const payload: CreatePersonaRequest = {
        ...commonPayloadData,
        personaType: ApiCreatePersonaRequestPersonaTypeEnum.dns,
        configDetails: dnsConfigDetails as PersonaConfigDetails,
      };

      let response;
      if (isEditing && persona && persona.id) {
        const updatePayload: UpdatePersonaRequest = {
          name: commonPayloadData.name,
          description: commonPayloadData.description,
          isEnabled: commonPayloadData.isEnabled,
          configDetails: dnsConfigDetails as PersonaConfigDetails
        };
        response = await personasApi.personasUpdate(persona.id, updatePayload);
      } else {
        response = await personasApi.personasCreate(payload);
      }

      if (response.status >= 200 && response.status < 300) {
        // Direct resource body already returned (no envelope) via axios client
  const body = (response as { data?: Persona })?.data;
  toast({ title: `Persona ${isEditing ? "Updated" : "Created"}`, description: `Persona "${body?.name || ''}" has been successfully ${isEditing ? "updated" : "created"}.` });
        router.push("/personas");
        router.refresh();
      } else {
        toast({ title: "Save Failed", description: "Failed to save persona. Please try again.", variant: "destructive" });
      }
    } catch (error: unknown) {
      console.error("Failed to save persona:", error);
      toast({ title: "Save Failed", description: (error as Error).message || "An unexpected error occurred. Please try again.", variant: "destructive" });
    }
  }

  return (
    <Card className="max-w-3xl mx-auto shadow-xl" data-testid="persona-dns-card">
      <CardHeader data-testid="persona-dns-header">
        <CardTitle data-testid="persona-dns-title">{isEditing ? "Edit" : "Create New"} DNS Persona</CardTitle>
        <CardDescription data-testid="persona-dns-description">
          {isEditing ? "Update details for this DNS persona." : "Define a new DNS persona for network operations."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form data-testid="persona-dns-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem data-testid="persona-dns-field-name">
                <FormLabel>Persona Name</FormLabel>
                <FormControl><Input data-testid="persona-dns-input-name" placeholder="e.g., Quad9 Secure DNS" {...field} /></FormControl>
                <FormDescription>A unique and descriptive name for this persona.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem data-testid="persona-dns-field-description">
                <FormLabel>Description (Optional)</FormLabel>
                <FormControl><Textarea data-testid="persona-dns-input-description" placeholder="Describe the purpose or key characteristics of this persona." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config_resolverStrategy" render={({ field }) => ( 
              <FormItem data-testid="persona-dns-field-resolver-strategy">
                <FormLabel>Resolver Strategy</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="persona-dns-input-resolver-strategy"><SelectValue placeholder="Select a strategy" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {DNS_RESOLVER_STRATEGIES.map(s => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config_resolversInput" render={({ field }) => (
              <FormItem data-testid="persona-dns-field-resolvers">
                <FormLabel>Resolvers (comma-separated)</FormLabel>
                <FormControl><Textarea data-testid="persona-dns-input-resolvers" placeholder="8.8.8.8, 1.1.1.1, https://dns.google/dns-query" {...field} /></FormControl>
                <FormDescription>List of DNS resolver IP addresses or DoH/DoT URLs.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config_useSystemResolvers" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm" data-testid="persona-dns-field-use-system-resolvers">
                <div className="space-y-0.5">
                  <FormLabel>Use System Resolvers</FormLabel>
                  <FormDescription>Fallback to system&apos;s DNS if custom resolvers fail or are not set.</FormDescription>
                </div>
                <FormControl><Switch data-testid="persona-dns-input-use-system-resolvers" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config_queryTimeoutSeconds" render={({ field }) => (
              <FormItem data-testid="persona-dns-field-query-timeout">
                <FormLabel>Query Timeout (seconds)</FormLabel>
                <FormControl><Input data-testid="persona-dns-input-query-timeout" type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config_maxDomainsPerRequest" render={({ field }) => (
              <FormItem data-testid="persona-dns-field-max-domains-per-request">
                <FormLabel>Max Domains Per Request (Optional)</FormLabel>
                <FormControl><Input data-testid="persona-dns-input-max-domains-per-request" type="number" placeholder="e.g., 10 (for DoH batching)" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl>
                <FormDescription>Relevant for protocols like DoH that support batch queries.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config_resolversWeightedJson" render={({ field }) => (
              <FormItem data-testid="persona-dns-field-resolvers-weighted-json">
                <FormLabel>Weighted Resolvers (JSON Object - Optional)</FormLabel>
                <FormControl><Textarea data-testid="persona-dns-input-resolvers-weighted-json" placeholder='{"8.8.8.8": 10, "1.1.1.1": 5}' className="font-mono min-h-[80px]" {...field} /></FormControl>
                <FormDescription>For &apos;Weighted Rotation&apos; strategy. Object with resolver as key and weight as value.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config_resolversPreferredOrderInput" render={({ field }) => (
              <FormItem data-testid="persona-dns-field-resolvers-preferred-order">
                <FormLabel>Preferred Order (comma-separated - Optional)</FormLabel>
                <FormControl><Textarea data-testid="persona-dns-input-resolvers-preferred-order" placeholder="1.1.1.1, 8.8.8.8" {...field} /></FormControl>
                <FormDescription>For &apos;Sequential Failover&apos; strategy. Order of resolvers to try.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config_concurrentQueriesPerDomain" render={({ field }) => (
              <FormItem data-testid="persona-dns-field-concurrent-queries-per-domain">
                <FormLabel>Concurrent Queries Per Domain</FormLabel>
                <FormControl><Input data-testid="persona-dns-input-concurrent-queries-per-domain" type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config_queryDelayMinMs" render={({ field }) => (
              <FormItem data-testid="persona-dns-field-query-delay-min-ms">
                <FormLabel>Query Delay Min (ms - Optional)</FormLabel>
                <FormControl><Input data-testid="persona-dns-input-query-delay-min-ms" type="number" placeholder="e.g., 0" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl>
                <FormDescription>Minimum random delay before a query.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config_queryDelayMaxMs" render={({ field }) => (
              <FormItem data-testid="persona-dns-field-query-delay-max-ms">
                <FormLabel>Query Delay Max (ms - Optional)</FormLabel>
                <FormControl><Input data-testid="persona-dns-input-query-delay-max-ms" type="number" placeholder="e.g., 100" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl>
                <FormDescription>Maximum random delay before a query. Must be &gt;= Min Delay.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config_maxConcurrentGoroutines" render={({ field }) => (
              <FormItem data-testid="persona-dns-field-max-concurrent-goroutines">
                <FormLabel>Max Concurrent Operations</FormLabel>
                <FormControl><Input data-testid="persona-dns-input-max-concurrent-goroutines" type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                <FormDescription>Overall concurrency limit for DNS operations using this persona.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config_rateLimitDps" render={({ field }) => (
              <FormItem data-testid="persona-dns-field-rate-limit-dps">
                <FormLabel>Rate Limit (DPS - Optional)</FormLabel>
                <FormControl><Input data-testid="persona-dns-input-rate-limit-dps" type="number" placeholder="e.g., 100 (Domains Per Second)" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl>
                <FormDescription>Max domains to process per second.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="config_rateLimitBurst" render={({ field }) => (
              <FormItem data-testid="persona-dns-field-rate-limit-burst">
                <FormLabel>Rate Limit Burst (Optional)</FormLabel>
                <FormControl><Input data-testid="persona-dns-input-rate-limit-burst" type="number" placeholder="e.g., 10" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl>
                <FormDescription>Allowed burst size for rate limiting.</FormDescription>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="isEnabled" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm" data-testid="persona-dns-field-is-enabled">
                <div className="space-y-0.5">
                  <FormLabel>Enabled</FormLabel>
                </div>
                <FormControl><Switch data-testid="persona-dns-input-is-enabled" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex justify-end gap-2 pt-4" data-testid="persona-dns-actions">
              <Button data-testid="persona-dns-cancel" type="button" variant="outline" onClick={() => router.push("/personas")} disabled={form.formState.isSubmitting}>Cancel</Button>
              <Button data-testid="persona-dns-submit" type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {form.formState.isSubmitting ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Persona")}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// Main component that renders the appropriate form
export default function PersonaForm({ persona, isEditing = false, personaType }: PersonaFormProps) {
  if (personaType === 'http') {
    return <HttpPersonaForm persona={persona} isEditing={isEditing} />;
  } else {
    return <DnsPersonaForm persona={persona} isEditing={isEditing} />;
  }
}
