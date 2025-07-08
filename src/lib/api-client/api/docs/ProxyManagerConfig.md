# ProxyManagerConfig

Proxy manager configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**initialHealthCheckTimeoutSeconds** | **number** | Initial health check timeout in seconds | [optional] [default to undefined]
**maxConcurrentInitialChecks** | **number** | Maximum concurrent initial health checks | [optional] [default to undefined]
**testTimeoutSeconds** | **number** | Proxy test timeout in seconds | [default to undefined]
**testUrl** | **string** | URL to use for proxy testing | [optional] [default to undefined]

## Example

```typescript
import { ProxyManagerConfig } from 'domainflow-api-client';

const instance: ProxyManagerConfig = {
    initialHealthCheckTimeoutSeconds,
    maxConcurrentInitialChecks,
    testTimeoutSeconds,
    testUrl,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
