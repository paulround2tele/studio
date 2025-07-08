# DNSConfigDetails

DNS persona configuration details

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**concurrentQueriesPerDomain** | **number** | Concurrent queries per domain | [optional] [default to undefined]
**maxConcurrentGoroutines** | **number** | Maximum concurrent goroutines | [optional] [default to undefined]
**maxDomainsPerRequest** | **number** | Maximum domains per request | [optional] [default to undefined]
**queryDelayMaxMs** | **number** | Maximum query delay in milliseconds | [optional] [default to undefined]
**queryDelayMinMs** | **number** | Minimum query delay in milliseconds | [optional] [default to undefined]
**queryTimeoutSeconds** | **number** | Query timeout in seconds | [optional] [default to undefined]
**rateLimitBurst** | **number** | Rate limit burst size | [optional] [default to undefined]
**rateLimitDps** | **number** | Rate limit in domains per second | [optional] [default to undefined]
**resolverStrategy** | **string** | Resolver selection strategy | [optional] [default to undefined]
**resolvers** | **Array&lt;string&gt;** | DNS resolver addresses | [optional] [default to undefined]
**useSystemResolvers** | **boolean** | Whether to use system resolvers | [optional] [default to undefined]

## Example

```typescript
import { DNSConfigDetails } from 'domainflow-api-client';

const instance: DNSConfigDetails = {
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
    useSystemResolvers,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
