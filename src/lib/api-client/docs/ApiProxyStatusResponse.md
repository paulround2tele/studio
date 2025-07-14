# ApiProxyStatusResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**isHealthy** | **boolean** |  | [optional] [default to undefined]
**lastChecked** | **string** |  | [optional] [default to undefined]
**proxyDetails** | [**ApiProxyDetailsResponse**](ApiProxyDetailsResponse.md) |  | [optional] [default to undefined]
**proxyId** | **string** |  | [optional] [default to undefined]
**responseTimeMs** | **number** |  | [optional] [default to undefined]
**status** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiProxyStatusResponse } from './api';

const instance: ApiProxyStatusResponse = {
    isHealthy,
    lastChecked,
    proxyDetails,
    proxyId,
    responseTimeMs,
    status,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
