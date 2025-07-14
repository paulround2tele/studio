# HealthStatus


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**buildTime** | **string** |  | [optional] [default to undefined]
**components** | [**{ [key: string]: Status; }**](Status.md) |  | [optional] [default to undefined]
**environment** | **string** |  | [optional] [default to undefined]
**status** | **string** |  | [optional] [default to undefined]
**systemInfo** | [**SystemInfo**](SystemInfo.md) |  | [optional] [default to undefined]
**version** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { HealthStatus } from './api';

const instance: HealthStatus = {
    buildTime,
    components,
    environment,
    status,
    systemInfo,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
