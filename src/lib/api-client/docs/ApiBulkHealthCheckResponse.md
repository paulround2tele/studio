# ApiBulkHealthCheckResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**failedProxies** | **number** |  | [optional] [default to undefined]
**healthyProxies** | **number** |  | [optional] [default to undefined]
**results** | [**Array&lt;ApiProxyHealthCheckResponse&gt;**](ApiProxyHealthCheckResponse.md) |  | [optional] [default to undefined]
**totalProxies** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiBulkHealthCheckResponse } from './api';

const instance: ApiBulkHealthCheckResponse = {
    failedProxies,
    healthyProxies,
    results,
    totalProxies,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
