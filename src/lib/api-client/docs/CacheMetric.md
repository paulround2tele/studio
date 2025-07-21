# CacheMetric


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**cacheKey** | **string** |  | [optional] [default to undefined]
**cacheNamespace** | **string** |  | [optional] [default to undefined]
**cacheSizeBytes** | **number** |  | [optional] [default to undefined]
**campaignPhase** | **string** |  | [optional] [default to undefined]
**executionTimeMs** | **number** |  | [optional] [default to undefined]
**hitRatioPct** | **number** |  | [optional] [default to undefined]
**id** | **string** | Unique identifier | [optional] [default to undefined]
**operationType** | **string** |  | [optional] [default to undefined]
**recordedAt** | **string** |  | [optional] [default to undefined]
**serviceName** | **string** |  | [optional] [default to undefined]
**ttlUsedSeconds** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { CacheMetric } from './api';

const instance: CacheMetric = {
    cacheKey,
    cacheNamespace,
    cacheSizeBytes,
    campaignPhase,
    executionTimeMs,
    hitRatioPct,
    id,
    operationType,
    recordedAt,
    serviceName,
    ttlUsedSeconds,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
