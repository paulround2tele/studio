# ApiErrorDetail


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**code** | **string** | Primary error code | [optional] [default to undefined]
**context** | **any** |  | [optional] [default to undefined]
**field** | **string** | Field that caused the error (for validation) | [optional] [default to undefined]
**message** | **string** | Human-readable error message | [optional] [default to undefined]

## Example

```typescript
import { ApiErrorDetail } from './api';

const instance: ApiErrorDetail = {
    code,
    context,
    field,
    message,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
