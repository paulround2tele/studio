# ApiErrorInfo

Error information (only present on failure)

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**code** | **string** | Primary error code | [optional] [default to undefined]
**details** | [**Array&lt;ApiErrorDetail&gt;**](ApiErrorDetail.md) | Detailed error information | [optional] [default to undefined]
**message** | **string** | Primary error message | [optional] [default to undefined]
**path** | **string** | API path that generated the error | [optional] [default to undefined]
**timestamp** | **string** | When the error occurred | [optional] [default to undefined]

## Example

```typescript
import { ApiErrorInfo } from './api';

const instance: ApiErrorInfo = {
    code,
    details,
    message,
    path,
    timestamp,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
