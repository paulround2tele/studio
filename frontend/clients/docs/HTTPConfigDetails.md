# HTTPConfigDetails


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**allowedStatusCodes** | **Array&lt;number&gt;** |  | [optional] [default to undefined]
**cookieHandling** | **object** |  | [optional] [default to undefined]
**followRedirects** | **boolean** |  | [optional] [default to undefined]
**headerOrder** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**headers** | **{ [key: string]: string; }** |  | [optional] [default to undefined]
**http2Settings** | **object** |  | [optional] [default to undefined]
**notes** | **string** |  | [optional] [default to undefined]
**rateLimitBurst** | **number** |  | [optional] [default to undefined]
**rateLimitDps** | **number** |  | [optional] [default to undefined]
**requestTimeoutSeconds** | **number** |  | [optional] [default to undefined]
**tlsClientHello** | **object** |  | [optional] [default to undefined]
**userAgent** | **string** |  | [default to undefined]

## Example

```typescript
import { HTTPConfigDetails } from './api';

const instance: HTTPConfigDetails = {
    allowedStatusCodes,
    cookieHandling,
    followRedirects,
    headerOrder,
    headers,
    http2Settings,
    notes,
    rateLimitBurst,
    rateLimitDps,
    requestTimeoutSeconds,
    tlsClientHello,
    userAgent,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
