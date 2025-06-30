# GithubComFntelecomllcStudioBackendInternalModelsProxyPool


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**createdAt** | **string** |  | [optional] [default to undefined]
**description** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**healthCheckEnabled** | **boolean** |  | [optional] [default to undefined]
**healthCheckIntervalSeconds** | **number** |  | [optional] [default to undefined]
**id** | **string** |  | [optional] [default to undefined]
**isEnabled** | **boolean** |  | [optional] [default to undefined]
**maxRetries** | **number** |  | [optional] [default to undefined]
**name** | **string** |  | [default to undefined]
**poolStrategy** | [**SqlNullString**](SqlNullString.md) | round_robin, random, weighted, failover | [optional] [default to undefined]
**proxies** | [**Array&lt;GithubComFntelecomllcStudioBackendInternalModelsProxy&gt;**](GithubComFntelecomllcStudioBackendInternalModelsProxy.md) | Computed fields (not stored in DB) | [optional] [default to undefined]
**timeoutSeconds** | **number** |  | [optional] [default to undefined]
**updatedAt** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { GithubComFntelecomllcStudioBackendInternalModelsProxyPool } from '@domainflow/api-client';

const instance: GithubComFntelecomllcStudioBackendInternalModelsProxyPool = {
    createdAt,
    description,
    healthCheckEnabled,
    healthCheckIntervalSeconds,
    id,
    isEnabled,
    maxRetries,
    name,
    poolStrategy,
    proxies,
    timeoutSeconds,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
