import type { ProxyProtocol } from '@/lib/api-client/models/proxy-protocol';
import type { Proxy as GeneratedProxy } from '@/lib/api-client/models/proxy';

/**
 * Proxy form values capture editable state separate from API model.
 * Address is represented as host + port for better validation UX.
 */
export interface ProxyFormValues {
  name: string;
  description?: string;
  protocol: ProxyProtocol;
  host: string;
  port: number;
  isEnabled: boolean;
}

/** Light helper to derive form defaults from an existing proxy */
export function proxyToFormValues(proxy: GeneratedProxy): ProxyFormValues {
  const [host, portRaw] = (proxy.address || '').split(':');
  const port = Number(portRaw) || 0;
  return {
    name: proxy.name || '',
    description: proxy.description || '',
    protocol: proxy.protocol as ProxyProtocol,
    host: host || '',
    port,
    isEnabled: Boolean(proxy.isEnabled)
  };
}

/** Transform form values back into create/update payload shape */
export function formValuesToProxyPayload(values: ProxyFormValues) {
  return {
    name: values.name,
    description: values.description,
    protocol: values.protocol,
    address: `${values.host}:${values.port}`,
    isEnabled: values.isEnabled
  };
}
