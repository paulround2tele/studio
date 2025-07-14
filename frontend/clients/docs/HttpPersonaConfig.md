# HttpPersonaConfig


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**allowInsecureTls** | **boolean** | Validation settings | [optional] [default to undefined]
**cookieHandling** | **object** |  | [optional] [default to undefined]
**domSnapshot** | **boolean** |  | [optional] [default to undefined]
**fetchBodyForKeywords** | **boolean** |  | [optional] [default to undefined]
**headerOrder** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**headers** | **{ [key: string]: string; }** |  | [optional] [default to undefined]
**headlessTimeoutSeconds** | **number** |  | [optional] [default to undefined]
**headlessUserAgent** | **string** |  | [optional] [default to undefined]
**http2Settings** | [**HTTP2SettingsConfig**](HTTP2SettingsConfig.md) |  | [optional] [default to undefined]
**loadImages** | **boolean** |  | [optional] [default to undefined]
**maxRedirects** | **number** |  | [optional] [default to undefined]
**rateLimitBurst** | **number** |  | [optional] [default to undefined]
**rateLimitDps** | **number** |  | [optional] [default to undefined]
**requestTimeoutSec** | **number** |  | [optional] [default to undefined]
**requestTimeoutSeconds** | **number** |  | [optional] [default to undefined]
**screenshot** | **boolean** |  | [optional] [default to undefined]
**scriptExecution** | **boolean** |  | [optional] [default to undefined]
**tlsClientHello** | **object** |  | [optional] [default to undefined]
**useHeadless** | **boolean** | Headless browser settings | [optional] [default to undefined]
**userAgent** | **string** |  | [default to undefined]
**viewportHeight** | **number** |  | [optional] [default to undefined]
**viewportWidth** | **number** |  | [optional] [default to undefined]
**waitDelaySeconds** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { HttpPersonaConfig } from './api';

const instance: HttpPersonaConfig = {
    allowInsecureTls,
    cookieHandling,
    domSnapshot,
    fetchBodyForKeywords,
    headerOrder,
    headers,
    headlessTimeoutSeconds,
    headlessUserAgent,
    http2Settings,
    loadImages,
    maxRedirects,
    rateLimitBurst,
    rateLimitDps,
    requestTimeoutSec,
    requestTimeoutSeconds,
    screenshot,
    scriptExecution,
    tlsClientHello,
    useHeadless,
    userAgent,
    viewportHeight,
    viewportWidth,
    waitDelaySeconds,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
