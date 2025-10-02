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
import { PersonaType as ApiCreatePersonaRequestPersonaTypeEnum } from '@/lib/api-client/models/persona-type';
const personasApi = new PersonasApi(new Configuration());

// Type aliases for better readability
type Persona = ApiPersonaResponse;

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

// HTTP Persona Schema
const httpPersonaFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  tagsInput: z.string().optional(),
  userAgent: z.string().min(1, "User-Agent is required"),
  headersJson: z.string().min(1, "Headers JSON is required"),
  headerOrderInput: z.string().optional(),
  tlsClientHelloJson: z.string().optional(),
  http2SettingsJson: z.string().optional(),
  cookieHandlingJson: z.string().optional(),
  allowInsecureTls: z.boolean(),
  requestTimeoutSec: z.number().min(1),
  maxRedirects: z.number().min(0),
  useHeadless: z.boolean().optional(),
  fallbackPolicy: z.enum(['never','on_fetch_error','always']).optional(),
  viewportWidth: z.number().optional(),
  viewportHeight: z.number().optional(),
  headlessUserAgent: z.string().optional(),
  scriptExecution: z.boolean().optional(),
  loadImages: z.boolean().optional(),
  screenshot: z.boolean().optional(),
  domSnapshot: z.boolean().optional(),
  headlessTimeoutSec: z.number().optional(),
  waitDelaySec: z.number().optional(),
  fetchBodyForKeywords: z.boolean().optional(),
  notes: z.string().optional(),
});

// DNS Persona Schema
const dnsPersonaFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  tagsInput: z.string().optional(),
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
  // THIN CLIENT: Removed useAuth - backend handles authentication
  const user = null; // Backend provides user data when needed

  const stringifyJsonForForm = (obj: Record<string, unknown> | null | undefined) => obj ? JSON.stringify(obj, null, 2) : "{}";
  const form = useForm<HttpPersonaFormValues>({
    resolver: zodResolver(httpPersonaFormSchema),
    defaultValues: persona
      ? {
          name: persona.name || "",
          description: persona.description || "",
          tagsInput: "", // Tags not in OpenAPI persona response
          userAgent: (persona as any).configDetails?.userAgent || "",
          headersJson: stringifyJsonForForm((persona.configDetails as any)?.headers || {}),
          headerOrderInput: ((persona.configDetails as any) as unknown as HTTPConfigDetails)?.headerOrder?.join(', ') || "",
          tlsClientHelloJson: stringifyJsonForForm((persona.configDetails as any)?.tlsClientHello as unknown as Record<string, unknown> || {}),
          http2SettingsJson: stringifyJsonForForm((persona.configDetails as any)?.http2Settings as unknown as Record<string, unknown> || {}),
          cookieHandlingJson: stringifyJsonForForm((persona.configDetails as any)?.cookieHandling as unknown as Record<string, unknown> || {}),
          allowInsecureTls: (persona.configDetails as any)?.allowInsecureTls || false,
          requestTimeoutSec: (persona.configDetails as any)?.requestTimeoutSeconds || 30,
          maxRedirects: (persona.configDetails as any)?.maxRedirects || 5,
          useHeadless: (persona.configDetails as any)?.useHeadless ?? false,
          fallbackPolicy: 'never', // Not in OpenAPI HTTP config
          viewportWidth: (persona.configDetails as any)?.viewportWidth,
          viewportHeight: (persona.configDetails as any)?.viewportHeight,
          headlessUserAgent: (persona.configDetails as any)?.headlessUserAgent || '',
          scriptExecution: (persona.configDetails as any)?.scriptExecution ?? false,
          loadImages: (persona.configDetails as any)?.loadImages ?? false,
          screenshot: (persona.configDetails as any)?.screenshot ?? false,
          domSnapshot: (persona.configDetails as any)?.domSnapshot ?? false,
          headlessTimeoutSec: (persona.configDetails as any)?.headlessTimeoutSeconds,
          waitDelaySec: (persona.configDetails as any)?.waitDelaySeconds,
          fetchBodyForKeywords: (persona.configDetails as any)?.fetchBodyForKeywords ?? false,
          notes: "", // Notes not in OpenAPI HTTP config
        }
      : {
          name: "",
          description: "",
          tagsInput: "",
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
          headersJson: stringifyJsonForForm({ "Accept-Language": "en-US,en;q=0.9" }),
          headerOrderInput: "",
          tlsClientHelloJson: stringifyJsonForForm({ "cipherSuites": ["TLS_AES_128_GCM_SHA256", "TLS_CHACHA20_POLY1305_SHA256"] }),
          http2SettingsJson: stringifyJsonForForm({ "headerTableSize": 4096, "enablePush": false }),
          cookieHandlingJson: stringifyJsonForForm({ "mode": "session" }),
          allowInsecureTls: false,
          requestTimeoutSec: 30,
          maxRedirects: 5,
          useHeadless: false,
          fallbackPolicy: 'never',
          viewportWidth: undefined,
          viewportHeight: undefined,
          headlessUserAgent: '',
          scriptExecution: false,
          loadImages: false,
          screenshot: false,
          domSnapshot: false,
          headlessTimeoutSec: undefined,
          waitDelaySec: undefined,
          fetchBodyForKeywords: false,
          notes: "",
        },
    mode: "onChange",
  });

  async function onSubmit(data: HttpPersonaFormValues) {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to create or edit personas.", variant: "destructive" });
      return;
    }

    const commonPayloadData = {
        name: data.name,
        description: data.description || undefined,
        tags: parseStringToArray(data.tagsInput || ""),
    };

    try {
      const httpConfigDetails = {
        userAgent: data.userAgent,
        headers: parseJsonOrUndefined<Record<string,string>>(data.headersJson || ""),
        headerOrder: parseStringToArray(data.headerOrderInput || ""),
        tlsClientHello: parseJsonOrUndefined(data.tlsClientHelloJson || ""),
        http2Settings: parseJsonOrUndefined(data.http2SettingsJson || ""),
        cookieHandling: parseJsonOrUndefined(data.cookieHandlingJson || ""),
        allowInsecureTls: data.allowInsecureTls,
        requestTimeoutSec: data.requestTimeoutSec,
        maxRedirects: data.maxRedirects,
        useHeadless: data.useHeadless,
        viewportWidth: data.viewportWidth,
        viewportHeight: data.viewportHeight,
        headlessUserAgent: data.headlessUserAgent || undefined,
        scriptExecution: data.scriptExecution,
        loadImages: data.loadImages,
        screenshot: data.screenshot,
        domSnapshot: data.domSnapshot,
        headlessTimeoutSeconds: data.headlessTimeoutSec,
        waitDelaySeconds: data.waitDelaySec,
        fetchBodyForKeywords: data.fetchBodyForKeywords,
      };

      const payload = {
        ...commonPayloadData,
  personaType: ApiCreatePersonaRequestPersonaTypeEnum.http,
        isEnabled: true,
        configDetails: httpConfigDetails
      };

  let response;
      if (isEditing && persona && persona.id) {
        const updatePayload = {
          ...commonPayloadData,
          configDetails: httpConfigDetails
        };
        response = await personasApi.personasUpdate(persona.id, updatePayload as any);
      } else {
        response = await personasApi.personasCreate(payload as any);
      }

      if (response.status >= 200 && response.status < 300) {
        // Direct resource body already returned (no envelope) via axios client
        const data: any = (response as any).data;
        toast({ title: `Persona ${isEditing ? "Updated" : "Created"}`, description: `Persona "${data?.name || ''}" has been successfully ${isEditing ? "updated" : "created"}.` });
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
            <FormField control={form.control} name="requestTimeoutSec" render={({ field }) => (
              <FormItem data-testid="persona-http-field-request-timeout">
                <FormLabel>Request Timeout (seconds)</FormLabel>
                <FormControl><Input data-testid="persona-http-input-request-timeout" type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="maxRedirects" render={({ field }) => (
              <FormItem data-testid="persona-http-field-max-redirects">
                <FormLabel>Max Redirects</FormLabel>
                <FormControl><Input data-testid="persona-http-input-max-redirects" type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="useHeadless" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm" data-testid="persona-http-field-use-headless">
                <div className="space-y-0.5">
                  <FormLabel>Use Headless Browser</FormLabel>
                </div>
                <FormControl><Switch data-testid="persona-http-input-use-headless" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="fallbackPolicy" render={({ field }) => (
              <FormItem data-testid="persona-http-field-fallback-policy">
                <FormLabel>Fallback Policy</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="persona-http-input-fallback-policy"><SelectValue placeholder="Select policy" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="never">never</SelectItem>
                    <SelectItem value="on_fetch_error">on_fetch_error</SelectItem>
                    <SelectItem value="always">always</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4" data-testid="persona-http-dimensions">
              <FormField control={form.control} name="viewportWidth" render={({ field }) => (
                <FormItem data-testid="persona-http-field-viewport-width">
                  <FormLabel>Viewport Width</FormLabel>
                  <FormControl><Input data-testid="persona-http-input-viewport-width" type="number" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="viewportHeight" render={({ field }) => (
                <FormItem data-testid="persona-http-field-viewport-height">
                  <FormLabel>Viewport Height</FormLabel>
                  <FormControl><Input data-testid="persona-http-input-viewport-height" type="number" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="headlessUserAgent" render={({ field }) => (
              <FormItem data-testid="persona-http-field-headless-user-agent">
                <FormLabel>Headless User-Agent</FormLabel>
                <FormControl><Input data-testid="persona-http-input-headless-user-agent" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="scriptExecution" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm" data-testid="persona-http-field-script-execution">
                <div className="space-y-0.5">
                  <FormLabel>Enable Script Execution</FormLabel>
                </div>
                <FormControl><Switch data-testid="persona-http-input-script-execution" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="loadImages" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm" data-testid="persona-http-field-load-images">
                <div className="space-y-0.5">
                  <FormLabel>Load Images</FormLabel>
                </div>
                <FormControl><Switch data-testid="persona-http-input-load-images" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="screenshot" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm" data-testid="persona-http-field-screenshot">
                <div className="space-y-0.5">
                  <FormLabel>Capture Screenshot</FormLabel>
                </div>
                <FormControl><Switch data-testid="persona-http-input-screenshot" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="domSnapshot" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm" data-testid="persona-http-field-dom-snapshot">
                <div className="space-y-0.5">
                  <FormLabel>Capture DOM Snapshot</FormLabel>
                </div>
                <FormControl><Switch data-testid="persona-http-input-dom-snapshot" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="headlessTimeoutSec" render={({ field }) => (
              <FormItem data-testid="persona-http-field-headless-timeout">
                <FormLabel>Headless Timeout (seconds)</FormLabel>
                <FormControl><Input data-testid="persona-http-input-headless-timeout" type="number" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="waitDelaySec" render={({ field }) => (
              <FormItem data-testid="persona-http-field-wait-delay">
                <FormLabel>Wait Delay (seconds)</FormLabel>
                <FormControl><Input data-testid="persona-http-input-wait-delay" type="number" {...field} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="fetchBodyForKeywords" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm" data-testid="persona-http-field-fetch-body-for-keywords">
                <div className="space-y-0.5">
                  <FormLabel>Fetch Body For Keywords</FormLabel>
                </div>
                <FormControl><Switch data-testid="persona-http-input-fetch-body-for-keywords" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="allowInsecureTls" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm" data-testid="persona-http-field-allow-insecure-tls">
                <div className="space-y-0.5">
                  <FormLabel>Allow Insecure TLS</FormLabel>
                  <FormDescription>Allow connections to servers with invalid/self-signed TLS certificates.</FormDescription>
                </div>
                <FormControl><Switch data-testid="persona-http-input-allow-insecure-tls" checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem data-testid="persona-http-field-notes">
                <FormLabel>Notes (Optional)</FormLabel>
                <FormControl><Textarea data-testid="persona-http-input-notes" placeholder="Internal notes about this HTTP persona." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="tagsInput" render={({ field }) => (
              <FormItem data-testid="persona-http-field-tags">
                <FormLabel>Tags (comma-separated - Optional)</FormLabel>
                <FormControl><Input data-testid="persona-http-input-tags" placeholder="e.g., stealth, primary-dns, us-region-proxy" {...field} /></FormControl>
                <FormDescription>Help organize and filter personas. Use for grouping or classification.</FormDescription>
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
  // THIN CLIENT: Removed useAuth - backend handles authentication
  const user = null; // Backend provides user data when needed

  const stringifyJsonObjectForForm = (obj: Record<string, number> | null | undefined) => obj ? JSON.stringify(obj, null, 2) : "{}";
  const form = useForm<DnsPersonaFormValues>({
    resolver: zodResolver(dnsPersonaFormSchema),
    defaultValues: persona
      ? {
          name: persona.name || "",
          description: persona.description || "",
          tagsInput: "", // Tags not in OpenAPI persona response
          config_resolversInput: ((persona.configDetails as any) as unknown as DNSConfigDetails)?.resolvers?.join(', ') || "",
          config_useSystemResolvers: ((persona.configDetails as any) as unknown as DNSConfigDetails)?.useSystemResolvers || false,
          config_queryTimeoutSeconds: ((persona.configDetails as any) as unknown as DNSConfigDetails)?.queryTimeoutSeconds || 5,
          config_maxDomainsPerRequest: ((persona.configDetails as any) as unknown as DNSConfigDetails)?.maxDomainsPerRequest || 100,
          config_resolverStrategy: (((persona.configDetails as any) as unknown as DNSConfigDetails)?.resolverStrategy as DnsResolverStrategy) || "round_robin",
          config_resolversWeightedJson: stringifyJsonObjectForForm(((persona.configDetails as any) as unknown as DNSConfigDetails)?.resolversWeighted || {}),
          config_resolversPreferredOrderInput: ((persona.configDetails as any) as unknown as DNSConfigDetails)?.resolversPreferredOrder?.join(', ') || "",
          config_concurrentQueriesPerDomain: ((persona.configDetails as any) as unknown as DNSConfigDetails)?.concurrentQueriesPerDomain || 2,
          config_queryDelayMinMs: ((persona.configDetails as any) as unknown as DNSConfigDetails)?.queryDelayMinMs,
          config_queryDelayMaxMs: ((persona.configDetails as any) as unknown as DNSConfigDetails)?.queryDelayMaxMs,
          config_maxConcurrentGoroutines: ((persona.configDetails as any) as unknown as DNSConfigDetails)?.maxConcurrentGoroutines || 10,
          config_rateLimitDps: ((persona.configDetails as any) as unknown as DNSConfigDetails)?.rateLimitDps,
          config_rateLimitBurst: ((persona.configDetails as any) as unknown as DNSConfigDetails)?.rateLimitBurst,
        }
      : {
          name: "",
          description: "",
          tagsInput: "",
          config_resolversInput: "8.8.8.8, 1.1.1.1",
          config_useSystemResolvers: false,
          config_queryTimeoutSeconds: 5,
          config_resolverStrategy: "random" as DnsResolverStrategy,
          config_resolversWeightedJson: "{}",
          config_resolversPreferredOrderInput: "",
          config_concurrentQueriesPerDomain: 2,
          config_maxConcurrentGoroutines: 10,
        },
    mode: "onChange",
  });

  async function onSubmit(data: DnsPersonaFormValues) {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to create or edit personas.", variant: "destructive" });
      return;
    }

    const commonPayloadData = {
        name: data.name,
        description: data.description || undefined,
        tags: parseStringToArray(data.tagsInput || ""),
    };

    try {
      const dnsConfigDetails = {
          resolvers: parseStringToArray(data.config_resolversInput || ""),
          useSystemResolvers: data.config_useSystemResolvers,
          queryTimeoutSeconds: data.config_queryTimeoutSeconds,
          maxDomainsPerRequest: data.config_maxDomainsPerRequest || 100,
          resolverStrategy: data.config_resolverStrategy,
          resolversWeighted: parseJsonOrUndefined<Record<string, number>>(data.config_resolversWeightedJson || ""),
          resolversPreferredOrder: parseStringToArray(data.config_resolversPreferredOrderInput || ""),
          concurrentQueriesPerDomain: data.config_concurrentQueriesPerDomain,
          queryDelayMinMs: data.config_queryDelayMinMs || 100,
          queryDelayMaxMs: data.config_queryDelayMaxMs || 1000,
          maxConcurrentGoroutines: data.config_maxConcurrentGoroutines,
          rateLimitDps: data.config_rateLimitDps || 100,
          rateLimitBurst: data.config_rateLimitBurst || 10,
      };

      const payload = {
          ...commonPayloadData,
          personaType: ApiCreatePersonaRequestPersonaTypeEnum.dns,
          isEnabled: true,
          configDetails: dnsConfigDetails,
      };

      let response;
      if (isEditing && persona && persona.id) {
        const updatePayload = {
          ...commonPayloadData,
          configDetails: dnsConfigDetails
        };
        response = await personasApi.personasUpdate(persona.id, updatePayload as any);
      } else {
        response = await personasApi.personasCreate(payload as any);
      }

      if (response.status >= 200 && response.status < 300) {
        // Direct resource body already returned (no envelope) via axios client
        const data: any = (response as any).data;
        toast({ title: `Persona ${isEditing ? "Updated" : "Created"}`, description: `Persona "${data?.name || ''}" has been successfully ${isEditing ? "updated" : "created"}.` });
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
            <FormField control={form.control} name="tagsInput" render={({ field }) => (
              <FormItem data-testid="persona-dns-field-tags">
                <FormLabel>Tags (comma-separated - Optional)</FormLabel>
                <FormControl><Input data-testid="persona-dns-input-tags" placeholder="e.g., stealth, primary-dns, us-region-proxy" {...field} /></FormControl>
                <FormDescription>Help organize and filter personas. Use for grouping or classification.</FormDescription>
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
