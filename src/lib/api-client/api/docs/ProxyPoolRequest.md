# ProxyPoolRequest

Request to create or update a proxy pool

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**description** | **string** | Proxy pool description | [optional] [default to undefined]
**healthCheckEnabled** | **boolean** | Whether health checks are enabled for the pool | [optional] [default to undefined]
**healthCheckIntervalSeconds** | **number** | Health check interval in seconds | [optional] [default to undefined]
**isEnabled** | **boolean** | Whether the proxy pool is enabled | [optional] [default to undefined]
**maxRetries** | **number** | Maximum retry attempts for proxy requests | [optional] [default to undefined]
**name** | **string** | Proxy pool name | [default to undefined]
**poolStrategy** | **string** | Pool selection strategy (e.g., round_robin, random, weighted) | [optional] [default to undefined]
**timeoutSeconds** | **number** | Timeout for proxy requests in seconds | [optional] [default to undefined]

## Example

```typescript
import { ProxyPoolRequest } from 'domainflow-api-client';

const instance: ProxyPoolRequest = {
    description,
    healthCheckEnabled,
    healthCheckIntervalSeconds,
    isEnabled,
    maxRetries,
    name,
    poolStrategy,
    timeoutSeconds,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
