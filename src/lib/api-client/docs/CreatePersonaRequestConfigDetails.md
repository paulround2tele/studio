# CreatePersonaRequestConfigDetails

Type-specific configuration details

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**allowInsecureTls** | **boolean** | Allow insecure TLS connections | [optional] [default to undefined]
**allowedStatusCodes** | **Array&lt;number&gt;** | Allowed HTTP status codes | [optional] [default to undefined]
**cookieHandling** | [**CookieHandling**](CookieHandling.md) |  | [optional] [default to undefined]
**domSnapshot** | **boolean** | Capture DOM snapshots in headless browser | [optional] [default to undefined]
**fetchBodyForKeywords** | **boolean** | Fetch response body for keyword scanning | [optional] [default to undefined]
**followRedirects** | **boolean** | Whether to follow HTTP redirects | [optional] [default to undefined]
**headerOrder** | **Array&lt;string&gt;** | Order of HTTP headers | [optional] [default to undefined]
**headers** | **{ [key: string]: string; }** | Custom HTTP headers | [optional] [default to undefined]
**headlessTimeoutSeconds** | **number** | Headless browser timeout in seconds | [optional] [default to undefined]
**headlessUserAgent** | **string** | User agent for headless browser | [optional] [default to undefined]
**http2Settings** | [**HTTP2SettingsConfig**](HTTP2SettingsConfig.md) |  | [optional] [default to undefined]
**insecureSkipVerify** | **boolean** | Skip TLS certificate verification | [optional] [default to undefined]
**loadImages** | **boolean** | Load images in headless browser | [optional] [default to undefined]
**maxRedirects** | **number** | Maximum number of redirects to follow | [optional] [default to undefined]
**rateLimitBurst** | **number** | Rate limit burst capacity | [optional] [default to undefined]
**rateLimitDps** | **number** | Rate limit in queries per second | [optional] [default to undefined]
**requestTimeoutSec** | **number** | Request timeout in seconds | [optional] [default to undefined]
**screenshot** | **boolean** | Take screenshots in headless browser | [optional] [default to undefined]
**scriptExecution** | **boolean** | Enable JavaScript execution in headless browser | [optional] [default to undefined]
**tlsClientHello** | [**TLSClientHello**](TLSClientHello.md) |  | [optional] [default to undefined]
**useHeadless** | **boolean** | Use headless browser for requests | [optional] [default to undefined]
**userAgent** | **string** | User agent string for HTTP requests | [default to undefined]
**viewportHeight** | **number** | Viewport height for headless browser | [optional] [default to undefined]
**viewportWidth** | **number** | Viewport width for headless browser | [optional] [default to undefined]
**waitDelaySeconds** | **number** | Wait delay before capturing content | [optional] [default to undefined]
**concurrentQueriesPerDomain** | **number** | Concurrent queries per domain | [optional] [default to undefined]
**maxConcurrentGoroutines** | **number** | Maximum concurrent goroutines | [optional] [default to undefined]
**maxDomainsPerRequest** | **number** | Maximum domains per request | [default to undefined]
**queryDelayMaxMs** | **number** | Maximum query delay in milliseconds | [optional] [default to undefined]
**queryDelayMinMs** | **number** | Minimum query delay in milliseconds | [optional] [default to undefined]
**queryTimeoutSeconds** | **number** | DNS query timeout in seconds | [default to undefined]
**resolverStrategy** | **string** | Strategy for selecting DNS resolvers | [default to undefined]
**resolvers** | **Array&lt;string&gt;** | DNS resolver IP addresses | [default to undefined]
**resolversPreferredOrder** | **Array&lt;string&gt;** | Preferred order of resolvers | [optional] [default to undefined]
**resolversWeighted** | **{ [key: string]: number; }** | Weighted resolver configuration | [optional] [default to undefined]
**useSystemResolvers** | **boolean** | Use system DNS resolvers | [optional] [default to undefined]

## Example

```typescript
import { CreatePersonaRequestConfigDetails } from 'api-client';

const instance: CreatePersonaRequestConfigDetails = {
    allowInsecureTls,
    allowedStatusCodes,
    cookieHandling,
    domSnapshot,
    fetchBodyForKeywords,
    followRedirects,
    headerOrder,
    headers,
    headlessTimeoutSeconds,
    headlessUserAgent,
    http2Settings,
    insecureSkipVerify,
    loadImages,
    maxRedirects,
    rateLimitBurst,
    rateLimitDps,
    requestTimeoutSec,
    screenshot,
    scriptExecution,
    tlsClientHello,
    useHeadless,
    userAgent,
    viewportHeight,
    viewportWidth,
    waitDelaySeconds,
    concurrentQueriesPerDomain,
    maxConcurrentGoroutines,
    maxDomainsPerRequest,
    queryDelayMaxMs,
    queryDelayMinMs,
    queryTimeoutSeconds,
    resolverStrategy,
    resolvers,
    resolversPreferredOrder,
    resolversWeighted,
    useSystemResolvers,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
