# ApiHealthStatus


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**buildTime** | **string** |  | [optional] [default to undefined]
**components** | [**{ [key: string]: ApiStatus; }**](ApiStatus.md) |  | [optional] [default to undefined]
**environment** | **string** |  | [optional] [default to undefined]
**status** | **string** |  | [optional] [default to undefined]
**systemInfo** | [**ApiSystemInfo**](ApiSystemInfo.md) |  | [optional] [default to undefined]
**version** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiHealthStatus } from './api';

const instance: ApiHealthStatus = {
    buildTime,
    components,
    environment,
    status,
    systemInfo,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
