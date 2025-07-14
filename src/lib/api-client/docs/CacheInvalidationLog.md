# CacheInvalidationLog


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**affectedKeysCount** | **number** |  | [optional] [default to undefined]
**cacheNamespace** | **string** |  | [optional] [default to undefined]
**campaignId** | **string** | Unique identifier | [optional] [default to undefined]
**campaignType** | **string** |  | [optional] [default to undefined]
**errorMessage** | **string** |  | [optional] [default to undefined]
**executedAt** | **string** |  | [optional] [default to undefined]
**executionTimeMs** | **number** |  | [optional] [default to undefined]
**id** | **string** | Unique identifier | [optional] [default to undefined]
**invalidationPattern** | **string** | Unique identifier | [optional] [default to undefined]
**invalidationReason** | **string** | Unique identifier | [optional] [default to undefined]
**serviceName** | **string** |  | [optional] [default to undefined]
**success** | **boolean** |  | [optional] [default to undefined]
**triggeredBy** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { CacheInvalidationLog } from './api';

const instance: CacheInvalidationLog = {
    affectedKeysCount,
    cacheNamespace,
    campaignId,
    campaignType,
    errorMessage,
    executedAt,
    executionTimeMs,
    id,
    invalidationPattern,
    invalidationReason,
    serviceName,
    success,
    triggeredBy,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
