# ApiMetadata

Optional metadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**extra** | **{ [key: string]: any; }** | Additional metadata | [optional] [default to undefined]
**page** | [**ApiPageInfo**](ApiPageInfo.md) |  | [optional] [default to undefined]
**processing** | [**ApiProcessingInfo**](ApiProcessingInfo.md) |  | [optional] [default to undefined]
**rateLimit** | [**ApiRateLimitInfo**](ApiRateLimitInfo.md) |  | [optional] [default to undefined]

## Example

```typescript
import { ApiMetadata } from './api';

const instance: ApiMetadata = {
    extra,
    page,
    processing,
    rateLimit,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
