# DNSConfig

DNS validator configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**concurrentQueriesPerDomain** | **number** | Concurrent queries per domain | [optional] [default to undefined]
**maxConcurrentGoroutines** | **number** | Maximum concurrent goroutines | [optional] [default to undefined]
**maxDomainsPerRequest** | **number** | Maximum domains per request | [optional] [default to undefined]
**queryDelayMaxMs** | **number** | Maximum query delay in milliseconds | [optional] [default to undefined]
**queryDelayMinMs** | **number** | Minimum query delay in milliseconds | [optional] [default to undefined]
**queryTimeoutSeconds** | **number** | DNS query timeout in seconds | [optional] [default to undefined]
**rateLimitBurst** | **number** | Rate limit burst capacity | [optional] [default to undefined]
**rateLimitDps** | **number** | Rate limit in queries per second | [optional] [default to undefined]
**resolverStrategy** | **string** | Strategy for selecting DNS resolvers | [optional] [default to undefined]
**resolvers** | **Array&lt;string&gt;** | DNS resolver IP addresses | [optional] [default to undefined]
**resolversPreferredOrder** | **Array&lt;string&gt;** | Preferred order of resolvers | [optional] [default to undefined]
**resolversWeighted** | **{ [key: string]: number; }** | Weighted resolver configuration | [optional] [default to undefined]
**useSystemResolvers** | **boolean** | Use system DNS resolvers | [optional] [default to undefined]

## Example

```typescript
import { DNSConfig } from './api';

const instance: DNSConfig = {
    concurrentQueriesPerDomain,
    maxConcurrentGoroutines,
    maxDomainsPerRequest,
    queryDelayMaxMs,
    queryDelayMinMs,
    queryTimeoutSeconds,
    rateLimitBurst,
    rateLimitDps,
    resolverStrategy,
    resolvers,
    resolversPreferredOrder,
    resolversWeighted,
    useSystemResolvers,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
