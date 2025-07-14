# ApiProxyManagerConfigJSON


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**initialHealthCheckTimeoutSeconds** | **number** |  | [optional] [default to undefined]
**maxConcurrentInitialChecks** | **number** |  | [optional] [default to undefined]
**testTimeoutSeconds** | **number** |  | [optional] [default to undefined]
**testUrl** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiProxyManagerConfigJSON } from './api';

const instance: ApiProxyManagerConfigJSON = {
    initialHealthCheckTimeoutSeconds,
    maxConcurrentInitialChecks,
    testTimeoutSeconds,
    testUrl,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
