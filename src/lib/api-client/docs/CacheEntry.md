# CacheEntry


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**accessFrequency** | **number** |  | [optional] [default to undefined]
**cacheKey** | **string** |  | [optional] [default to undefined]
**cacheNamespace** | **string** |  | [optional] [default to undefined]
**cacheValue** | **string** |  | [optional] [default to undefined]
**cacheValueCompressed** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**campaignId** | **string** | Unique identifier | [optional] [default to undefined]
**campaignType** | **string** |  | [optional] [default to undefined]
**contentType** | **string** |  | [optional] [default to undefined]
**createdAt** | **string** |  | [optional] [default to undefined]
**expiresAt** | **string** |  | [optional] [default to undefined]
**hitCount** | **number** |  | [optional] [default to undefined]
**id** | **string** | Unique identifier | [optional] [default to undefined]
**isCompressed** | **boolean** |  | [optional] [default to undefined]
**lastAccessed** | **string** |  | [optional] [default to undefined]
**metadata** | **object** |  | [optional] [default to undefined]
**serviceName** | **string** |  | [optional] [default to undefined]
**sizeBytes** | **number** |  | [optional] [default to undefined]
**tags** | **string** |  | [optional] [default to undefined]
**ttlSeconds** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { CacheEntry } from './api';

const instance: CacheEntry = {
    accessFrequency,
    cacheKey,
    cacheNamespace,
    cacheValue,
    cacheValueCompressed,
    campaignId,
    campaignType,
    contentType,
    createdAt,
    expiresAt,
    hitCount,
    id,
    isCompressed,
    lastAccessed,
    metadata,
    serviceName,
    sizeBytes,
    tags,
    ttlSeconds,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
