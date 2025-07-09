# HTTPConfig

HTTP validator configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**allowInsecureTLS** | **boolean** | Allow insecure TLS connections | [optional] [default to undefined]
**defaultHeaders** | **{ [key: string]: string; }** | Default HTTP headers | [optional] [default to undefined]
**defaultUserAgent** | **string** | Default User-Agent string for HTTP requests | [optional] [default to undefined]
**followRedirects** | **boolean** | Whether to follow HTTP redirects | [optional] [default to undefined]
**maxBodyReadBytes** | **number** | Maximum bytes to read from response body | [optional] [default to undefined]
**maxConcurrentGoroutines** | **number** | Maximum concurrent goroutines | [optional] [default to undefined]
**maxDomainsPerRequest** | **number** | Maximum domains per request | [optional] [default to undefined]
**maxRedirects** | **number** | Maximum number of redirects to follow | [optional] [default to undefined]
**rateLimitBurst** | **number** | Rate limit burst capacity | [optional] [default to undefined]
**rateLimitDps** | **number** | Rate limit in requests per second | [optional] [default to undefined]
**requestTimeoutSeconds** | **number** | Request timeout in seconds | [optional] [default to undefined]
**userAgents** | **Array&lt;string&gt;** | List of User-Agent strings to rotate through | [optional] [default to undefined]

## Example

```typescript
import { HTTPConfig } from './api';

const instance: HTTPConfig = {
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
