# HTTPConfigDetails

HTTP persona configuration details

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**allowedStatusCodes** | **Array&lt;number&gt;** | Allowed HTTP status codes | [optional] [default to undefined]
**cookieHandling** | [**HTTPCookieHandling**](HTTPCookieHandling.md) |  | [optional] [default to undefined]
**followRedirects** | **boolean** | Whether to follow redirects | [optional] [default to undefined]
**headerOrder** | **Array&lt;string&gt;** | Order of HTTP headers | [optional] [default to undefined]
**headers** | **{ [key: string]: string; }** | HTTP headers | [optional] [default to undefined]
**notes** | **string** | Configuration notes | [optional] [default to undefined]
**rateLimitBurst** | **number** | Rate limit burst size | [optional] [default to undefined]
**rateLimitDps** | **number** | Rate limit in requests per second | [optional] [default to undefined]
**requestTimeoutSeconds** | **number** | Request timeout in seconds | [optional] [default to undefined]
**userAgent** | **string** | User agent string | [optional] [default to undefined]

## Example

```typescript
import { HTTPConfigDetails } from 'domainflow-api-client';

const instance: HTTPConfigDetails = {
    allowedStatusCodes,
    cookieHandling,
    followRedirects,
    headerOrder,
    headers,
    notes,
    rateLimitBurst,
    rateLimitDps,
    requestTimeoutSeconds,
    userAgent,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
