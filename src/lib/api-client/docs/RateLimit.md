# RateLimit


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**action** | **string** |  | [optional] [default to undefined]
**attempts** | **number** |  | [optional] [default to undefined]
**blockedUntil** | **string** |  | [optional] [default to undefined]
**id** | **number** |  | [optional] [default to undefined]
**identifier** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**windowStart** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { RateLimit } from './api';

const instance: RateLimit = {
    action,
    attempts,
    blockedUntil,
    id,
    identifier,
    windowStart,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
