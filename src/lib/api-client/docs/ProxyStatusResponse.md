# ProxyStatusResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**isHealthy** | **boolean** |  | [optional] [default to undefined]
**lastChecked** | **string** |  | [optional] [default to undefined]
**proxyDetails** | [**ProxyDetailsResponse**](ProxyDetailsResponse.md) |  | [optional] [default to undefined]
**proxyId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**responseTimeMs** | **number** |  | [optional] [default to undefined]
**status** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { ProxyStatusResponse } from './api';

const instance: ProxyStatusResponse = {
    isHealthy,
    lastChecked,
    proxyDetails,
    proxyId,
    responseTimeMs,
    status,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
