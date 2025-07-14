# BulkHealthCheckResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**failedProxies** | **number** |  | [optional] [default to undefined]
**healthyProxies** | **number** |  | [optional] [default to undefined]
**results** | [**Array&lt;ProxyHealthCheckResponse&gt;**](ProxyHealthCheckResponse.md) |  | [optional] [default to undefined]
**totalProxies** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { BulkHealthCheckResponse } from './api';

const instance: BulkHealthCheckResponse = {
    failedProxies,
    healthyProxies,
    results,
    totalProxies,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
