# ApiRateLimitInfo

Rate limiting info

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**limit** | **number** | Request limit | [optional] [default to undefined]
**remaining** | **number** | Remaining requests | [optional] [default to undefined]
**reset** | **string** | When the limit resets | [optional] [default to undefined]

## Example

```typescript
import { ApiRateLimitInfo } from './api';

const instance: ApiRateLimitInfo = {
    limit,
    remaining,
    reset,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
