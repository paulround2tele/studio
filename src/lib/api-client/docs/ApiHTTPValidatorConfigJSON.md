# ApiHTTPValidatorConfigJSON


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**allowInsecureTLS** | **boolean** |  | [optional] [default to undefined]
**defaultHeaders** | **{ [key: string]: string; }** |  | [optional] [default to undefined]
**defaultUserAgent** | **string** |  | [optional] [default to undefined]
**followRedirects** | **boolean** |  | [optional] [default to undefined]
**maxBodyReadBytes** | **number** |  | [optional] [default to undefined]
**maxConcurrentGoroutines** | **number** |  | [optional] [default to undefined]
**maxDomainsPerRequest** | **number** |  | [optional] [default to undefined]
**maxRedirects** | **number** |  | [optional] [default to undefined]
**rateLimitBurst** | **number** |  | [optional] [default to undefined]
**rateLimitDps** | **number** |  | [optional] [default to undefined]
**requestTimeoutSeconds** | **number** |  | [optional] [default to undefined]
**userAgents** | **Array&lt;string&gt;** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiHTTPValidatorConfigJSON } from './api';

const instance: ApiHTTPValidatorConfigJSON = {
    allowInsecureTLS,
    defaultHeaders,
    defaultUserAgent,
    followRedirects,
    maxBodyReadBytes,
    maxConcurrentGoroutines,
    maxDomainsPerRequest,
    maxRedirects,
    rateLimitBurst,
    rateLimitDps,
    requestTimeoutSeconds,
    userAgents,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
