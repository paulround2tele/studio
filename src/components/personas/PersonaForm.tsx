"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Checkbox from "@/components/ta/form/input/Checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PersonasApi } from '@/lib/api-client';
import { apiConfiguration } from '@/lib/api/config';
import type { PersonaResponse } from '@/lib/api-client/models/persona-response';
import type { PersonaConfigHttp as HTTPConfigDetails } from '@/lib/api-client/models/persona-config-http';
import type { PersonaConfigDns as DNSConfigDetails } from '@/lib/api-client/models/persona-config-dns';
import type { PersonaConfigDetails } from '@/lib/api-client/models/persona-config-details';
import { PersonaType as ApiCreatePersonaRequestPersonaTypeEnum } from '@/lib/api-client/models/persona-type';
import type { CreatePersonaRequest } from '@/lib/api-client/models/create-persona-request';
import type { UpdatePersonaRequest } from '@/lib/api-client/models/update-persona-request';
import { unwrapApiResponse } from '@/lib/utils/unwrapApiResponse';
const personasApi = new PersonasApi(apiConfiguration);
const HTTP_PERSONA_TYPE: HTTPConfigDetails['personaType'] = 'http';
const DNS_PERSONA_TYPE: DNSConfigDetails['personaType'] = 'dns';

// Narrowers
function asHttpConfig(p: PersonaResponse | undefined): HTTPConfigDetails | undefined {
  const c = p?.configDetails as PersonaConfigDetails | undefined;
  if (c && 'userAgent' in c) return c as HTTPConfigDetails; // distinctive HTTP field
  return undefined;
}
function asDnsConfig(p: PersonaResponse | undefined): DNSConfigDetails | undefined {
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
  persona?: PersonaResponse;
  isEditing?: boolean;
  personaType: 'http' | 'dns';
}

// HTTP Persona Form Component
function HttpPersonaForm({ persona, isEditing = false }: { persona?: PersonaResponse; isEditing?: boolean }) {
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
        personaType: HTTP_PERSONA_TYPE,
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
        const body = unwrapApiResponse<PersonaResponse>(response);
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
    /* TailAdmin migration: Card replaced with Tailwind card pattern */
    <div className="max-w-3xl mx-auto rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-white/[0.03]" data-testid="persona-http-card">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800" data-testid="persona-http-header">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid="persona-http-title">
          {isEditing ? "Edit" : "Create New"} HTTP Persona
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400" data-testid="persona-http-description">
          {isEditing ? "Update details for this HTTP persona." : "Define a new HTTP persona for network operations."}
        </p>
      </div>
      <div className="p-6">
        {/* TailAdmin migration: Form components replaced with inline Tailwind + react-hook-form register */}
        <form data-testid="persona-http-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Persona Name */}
          <div data-testid="persona-http-field-name">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Persona Name</label>
            <input
              data-testid="persona-http-input-name"
              placeholder="e.g., Stealth Chrome US"
              {...form.register("name")}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">A unique and descriptive name for this persona.</p>
            {form.formState.errors.name && <p className="mt-1 text-xs text-error-500">{form.formState.errors.name.message}</p>}
          </div>

          {/* Description */}
          <div data-testid="persona-http-field-description">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
            <textarea
              data-testid="persona-http-input-description"
              placeholder="Describe the purpose or key characteristics of this persona."
              {...form.register("description")}
              className="dark:bg-dark-900 min-h-[80px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            {form.formState.errors.description && <p className="mt-1 text-xs text-error-500">{form.formState.errors.description.message}</p>}
          </div>

          {/* User-Agent */}
          <div data-testid="persona-http-field-user-agent">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">User-Agent String</label>
            <input
              data-testid="persona-http-input-user-agent"
              placeholder="Mozilla/5.0 (Windows NT 10.0; Win64; x64)..."
              {...form.register("userAgent")}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">The User-Agent string this persona will use.</p>
            {form.formState.errors.userAgent && <p className="mt-1 text-xs text-error-500">{form.formState.errors.userAgent.message}</p>}
          </div>

          {/* Headers JSON */}
          <div data-testid="persona-http-field-headers-json">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">HTTP Headers (JSON)</label>
            <textarea
              data-testid="persona-http-input-headers-json"
              placeholder='{ "Accept-Language": "en-US,en;q=0.9", "X-Custom-Header": "Value" }'
              {...form.register("headersJson")}
              className="dark:bg-dark-900 min-h-[120px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 font-mono text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Enter custom HTTP headers as a JSON object string.</p>
            {form.formState.errors.headersJson && <p className="mt-1 text-xs text-error-500">{form.formState.errors.headersJson.message}</p>}
          </div>

          {/* Header Order */}
          <div data-testid="persona-http-field-header-order">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Header Order (comma-separated, Optional)</label>
            <input
              data-testid="persona-http-input-header-order"
              placeholder="user-agent,accept-language,accept-encoding"
              {...form.register("headerOrderInput")}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Specify the order of headers if needed by the target.</p>
          </div>

          {/* TLS ClientHello JSON */}
          <div data-testid="persona-http-field-tls-client-hello">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">TLS ClientHello Config (JSON, Optional)</label>
            <textarea
              data-testid="persona-http-input-tls-client-hello"
              placeholder='{ "minVersion": "TLS12", "cipherSuites": [...] }'
              {...form.register("tlsClientHelloJson")}
              className="dark:bg-dark-900 min-h-[100px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 font-mono text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Define TLS handshake parameters (e.g., JA3/JA4 related).</p>
          </div>

          {/* HTTP/2 Settings JSON */}
          <div data-testid="persona-http-field-http2-settings">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">HTTP/2 Settings (JSON, Optional)</label>
            <textarea
              data-testid="persona-http-input-http2-settings"
              placeholder='{ "headerTableSize": 4096, "enablePush": false }'
              {...form.register("http2SettingsJson")}
              className="dark:bg-dark-900 min-h-[80px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 font-mono text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Configure HTTP/2 protocol parameters.</p>
          </div>

          {/* Cookie Handling JSON */}
          <div data-testid="persona-http-field-cookie-handling">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Cookie Handling Config (JSON, Optional)</label>
            <textarea
              data-testid="persona-http-input-cookie-handling"
              placeholder='{ "mode": "session" }'
              {...form.register("cookieHandlingJson")}
              className="dark:bg-dark-900 min-h-[60px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 font-mono text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Define how cookies are handled (e.g., &quot;none&quot;, &quot;session&quot;, &quot;file&quot;).</p>
          </div>

          {/* Request Timeout */}
          <div data-testid="persona-http-field-request-timeout">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Request Timeout (seconds)</label>
            <input
              data-testid="persona-http-input-request-timeout"
              type="number"
              {...form.register("requestTimeoutSeconds", { valueAsNumber: true })}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            {form.formState.errors.requestTimeoutSeconds && <p className="mt-1 text-xs text-error-500">{form.formState.errors.requestTimeoutSeconds.message}</p>}
          </div>

          {/* Follow Redirects - TailAdmin Checkbox */}
          <div className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700" data-testid="persona-http-field-follow-redirects">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Follow Redirects</span>
            <Checkbox
              data-testid="persona-http-input-follow-redirects"
              checked={form.watch("followRedirects") ?? false}
              onChange={(checked) => form.setValue("followRedirects", checked)}
            />
          </div>

          {/* Allowed Status Codes */}
          <div data-testid="persona-http-field-allowed-status-codes">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Allowed Status Codes (comma-separated)</label>
            <input
              data-testid="persona-http-input-allowed-status-codes"
              placeholder="200, 301, 302"
              {...form.register("allowedStatusCodesInput")}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Leave blank to allow any successful status code.</p>
          </div>

          {/* Rate Limits */}
          <div className="grid grid-cols-2 gap-4" data-testid="persona-http-rate-limits">
            <div data-testid="persona-http-field-rate-limit-dps">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Rate Limit (DPS)</label>
              <input
                data-testid="persona-http-input-rate-limit-dps"
                type="number"
                {...form.register("rateLimitDps", { valueAsNumber: true })}
                className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>
            <div data-testid="persona-http-field-rate-limit-burst">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Rate Limit Burst</label>
              <input
                data-testid="persona-http-input-rate-limit-burst"
                type="number"
                {...form.register("rateLimitBurst", { valueAsNumber: true })}
                className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              />
            </div>
          </div>

          {/* Notes */}
          <div data-testid="persona-http-field-notes">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Notes (Optional)</label>
            <textarea
              data-testid="persona-http-input-notes"
              placeholder="Internal notes about this HTTP persona."
              {...form.register("notes")}
              className="dark:bg-dark-900 min-h-[80px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          {/* Enabled - TailAdmin Checkbox */}
          <div className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700" data-testid="persona-http-field-is-enabled">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enabled</span>
            <Checkbox
              data-testid="persona-http-input-is-enabled"
              checked={form.watch("isEnabled") ?? true}
              onChange={(checked) => form.setValue("isEnabled", checked)}
            />
          </div>

          {/* Actions - inline Tailwind buttons since TailAdmin Button lacks type prop */}
          <div className="flex justify-end gap-2 pt-4" data-testid="persona-http-actions">
            <button
              data-testid="persona-http-cancel"
              type="button"
              onClick={() => router.push("/personas")}
              disabled={form.formState.isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              data-testid="persona-http-submit"
              type="submit"
              disabled={form.formState.isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.formState.isSubmitting ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Persona")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// DNS Persona Form Component
function DnsPersonaForm({ persona, isEditing = false }: { persona?: PersonaResponse; isEditing?: boolean }) {
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
        personaType: DNS_PERSONA_TYPE,
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
        const body = unwrapApiResponse<PersonaResponse>(response);
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
    /* TailAdmin migration: Card replaced with Tailwind card pattern */
    <div className="max-w-3xl mx-auto rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-white/[0.03]" data-testid="persona-dns-card">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800" data-testid="persona-dns-header">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white" data-testid="persona-dns-title">
          {isEditing ? "Edit" : "Create New"} DNS Persona
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400" data-testid="persona-dns-description">
          {isEditing ? "Update details for this DNS persona." : "Define a new DNS persona for network operations."}
        </p>
      </div>
      <div className="p-6">
        {/* TailAdmin migration: Form components replaced with inline Tailwind + react-hook-form register */}
        <form data-testid="persona-dns-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Persona Name */}
          <div data-testid="persona-dns-field-name">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Persona Name</label>
            <input
              data-testid="persona-dns-input-name"
              placeholder="e.g., Quad9 Secure DNS"
              {...form.register("name")}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">A unique and descriptive name for this persona.</p>
            {form.formState.errors.name && <p className="mt-1 text-xs text-error-500">{form.formState.errors.name.message}</p>}
          </div>

          {/* Description */}
          <div data-testid="persona-dns-field-description">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
            <textarea
              data-testid="persona-dns-input-description"
              placeholder="Describe the purpose or key characteristics of this persona."
              {...form.register("description")}
              className="dark:bg-dark-900 min-h-[80px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            {form.formState.errors.description && <p className="mt-1 text-xs text-error-500">{form.formState.errors.description.message}</p>}
          </div>

          {/* Resolver Strategy - inline Tailwind select */}
          <div data-testid="persona-dns-field-resolver-strategy">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Resolver Strategy</label>
            <select
              data-testid="persona-dns-input-resolver-strategy"
              {...form.register("config_resolverStrategy")}
              className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-10 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
            >
              {DNS_RESOLVER_STRATEGIES.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</option>
              ))}
            </select>
            {form.formState.errors.config_resolverStrategy && <p className="mt-1 text-xs text-error-500">{form.formState.errors.config_resolverStrategy.message}</p>}
          </div>

          {/* Resolvers */}
          <div data-testid="persona-dns-field-resolvers">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Resolvers (comma-separated)</label>
            <textarea
              data-testid="persona-dns-input-resolvers"
              placeholder="8.8.8.8, 1.1.1.1, https://dns.google/dns-query"
              {...form.register("config_resolversInput")}
              className="dark:bg-dark-900 min-h-[80px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">List of DNS resolver IP addresses or DoH/DoT URLs.</p>
            {form.formState.errors.config_resolversInput && <p className="mt-1 text-xs text-error-500">{form.formState.errors.config_resolversInput.message}</p>}
          </div>

          {/* Use System Resolvers - TailAdmin Checkbox */}
          <div className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700" data-testid="persona-dns-field-use-system-resolvers">
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Use System Resolvers</span>
              <p className="text-xs text-gray-500 dark:text-gray-400">Fallback to system&apos;s DNS if custom resolvers fail or are not set.</p>
            </div>
            <Checkbox
              data-testid="persona-dns-input-use-system-resolvers"
              checked={form.watch("config_useSystemResolvers") ?? false}
              onChange={(checked) => form.setValue("config_useSystemResolvers", checked)}
            />
          </div>

          {/* Query Timeout */}
          <div data-testid="persona-dns-field-query-timeout">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Query Timeout (seconds)</label>
            <input
              data-testid="persona-dns-input-query-timeout"
              type="number"
              {...form.register("config_queryTimeoutSeconds", { valueAsNumber: true })}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            {form.formState.errors.config_queryTimeoutSeconds && <p className="mt-1 text-xs text-error-500">{form.formState.errors.config_queryTimeoutSeconds.message}</p>}
          </div>

          {/* Max Domains Per Request */}
          <div data-testid="persona-dns-field-max-domains-per-request">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Max Domains Per Request (Optional)</label>
            <input
              data-testid="persona-dns-input-max-domains-per-request"
              type="number"
              placeholder="e.g., 10 (for DoH batching)"
              {...form.register("config_maxDomainsPerRequest", { valueAsNumber: true })}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Relevant for protocols like DoH that support batch queries.</p>
          </div>

          {/* Weighted Resolvers JSON */}
          <div data-testid="persona-dns-field-resolvers-weighted-json">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Weighted Resolvers (JSON Object - Optional)</label>
            <textarea
              data-testid="persona-dns-input-resolvers-weighted-json"
              placeholder='{"8.8.8.8": 10, "1.1.1.1": 5}'
              {...form.register("config_resolversWeightedJson")}
              className="dark:bg-dark-900 min-h-[80px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 font-mono text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">For &apos;Weighted Rotation&apos; strategy. Object with resolver as key and weight as value.</p>
          </div>

          {/* Preferred Order */}
          <div data-testid="persona-dns-field-resolvers-preferred-order">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Preferred Order (comma-separated - Optional)</label>
            <textarea
              data-testid="persona-dns-input-resolvers-preferred-order"
              placeholder="1.1.1.1, 8.8.8.8"
              {...form.register("config_resolversPreferredOrderInput")}
              className="dark:bg-dark-900 min-h-[60px] w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">For &apos;Sequential Failover&apos; strategy. Order of resolvers to try.</p>
          </div>

          {/* Concurrent Queries Per Domain */}
          <div data-testid="persona-dns-field-concurrent-queries-per-domain">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Concurrent Queries Per Domain</label>
            <input
              data-testid="persona-dns-input-concurrent-queries-per-domain"
              type="number"
              {...form.register("config_concurrentQueriesPerDomain", { valueAsNumber: true })}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            {form.formState.errors.config_concurrentQueriesPerDomain && <p className="mt-1 text-xs text-error-500">{form.formState.errors.config_concurrentQueriesPerDomain.message}</p>}
          </div>

          {/* Query Delay Min */}
          <div data-testid="persona-dns-field-query-delay-min-ms">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Query Delay Min (ms - Optional)</label>
            <input
              data-testid="persona-dns-input-query-delay-min-ms"
              type="number"
              placeholder="e.g., 0"
              {...form.register("config_queryDelayMinMs", { valueAsNumber: true })}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Minimum random delay before a query.</p>
          </div>

          {/* Query Delay Max */}
          <div data-testid="persona-dns-field-query-delay-max-ms">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Query Delay Max (ms - Optional)</label>
            <input
              data-testid="persona-dns-input-query-delay-max-ms"
              type="number"
              placeholder="e.g., 100"
              {...form.register("config_queryDelayMaxMs", { valueAsNumber: true })}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Maximum random delay before a query. Must be &gt;= Min Delay.</p>
          </div>

          {/* Max Concurrent Goroutines */}
          <div data-testid="persona-dns-field-max-concurrent-goroutines">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Max Concurrent Operations</label>
            <input
              data-testid="persona-dns-input-max-concurrent-goroutines"
              type="number"
              {...form.register("config_maxConcurrentGoroutines", { valueAsNumber: true })}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Overall concurrency limit for DNS operations using this persona.</p>
            {form.formState.errors.config_maxConcurrentGoroutines && <p className="mt-1 text-xs text-error-500">{form.formState.errors.config_maxConcurrentGoroutines.message}</p>}
          </div>

          {/* Rate Limit DPS */}
          <div data-testid="persona-dns-field-rate-limit-dps">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Rate Limit (DPS - Optional)</label>
            <input
              data-testid="persona-dns-input-rate-limit-dps"
              type="number"
              placeholder="e.g., 100 (Domains Per Second)"
              {...form.register("config_rateLimitDps", { valueAsNumber: true })}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Max domains to process per second.</p>
          </div>

          {/* Rate Limit Burst */}
          <div data-testid="persona-dns-field-rate-limit-burst">
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">Rate Limit Burst (Optional)</label>
            <input
              data-testid="persona-dns-input-rate-limit-burst"
              type="number"
              placeholder="e.g., 10"
              {...form.register("config_rateLimitBurst", { valueAsNumber: true })}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Allowed burst size for rate limiting.</p>
          </div>

          {/* Enabled - TailAdmin Checkbox */}
          <div className="flex flex-row items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700" data-testid="persona-dns-field-is-enabled">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enabled</span>
            <Checkbox
              data-testid="persona-dns-input-is-enabled"
              checked={form.watch("isEnabled") ?? true}
              onChange={(checked) => form.setValue("isEnabled", checked)}
            />
          </div>

          {/* Actions - inline Tailwind buttons since TailAdmin Button lacks type prop */}
          <div className="flex justify-end gap-2 pt-4" data-testid="persona-dns-actions">
            <button
              data-testid="persona-dns-cancel"
              type="button"
              onClick={() => router.push("/personas")}
              disabled={form.formState.isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs transition-colors hover:bg-gray-50 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            >
              Cancel
            </button>
            <button
              data-testid="persona-dns-submit"
              type="submit"
              disabled={form.formState.isSubmitting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form.formState.isSubmitting ? (isEditing ? "Saving..." : "Creating...") : (isEditing ? "Save Changes" : "Create Persona")}
            </button>
          </div>
        </form>
      </div>
    </div>
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
