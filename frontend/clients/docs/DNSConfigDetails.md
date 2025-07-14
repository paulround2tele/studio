# DNSConfigDetails


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**concurrentQueriesPerDomain** | **number** |  | [optional] [default to undefined]
**maxConcurrentGoroutines** | **number** |  | [optional] [default to undefined]
**maxDomainsPerRequest** | **number** |  | [optional] [default to undefined]
**queryDelayMaxMs** | **number** |  | [optional] [default to undefined]
**queryDelayMinMs** | **number** |  | [optional] [default to undefined]
**queryTimeoutSeconds** | **number** |  | [optional] [default to undefined]
**rateLimitBurst** | **number** |  | [optional] [default to undefined]
**rateLimitDps** | **number** |  | [optional] [default to undefined]
**resolverStrategy** | **string** |  | [optional] [default to undefined]
**resolvers** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**resolversPreferredOrder** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**resolversWeighted** | **{ [key: string]: number; }** |  | [optional] [default to undefined]
**useSystemResolvers** | **boolean** |  | [optional] [default to undefined]

## Example

```typescript
import { DNSConfigDetails } from './api';

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
    resolversPreferredOrder,
    resolversWeighted,
    useSystemResolvers,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
