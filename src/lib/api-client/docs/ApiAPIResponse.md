# ApiAPIResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**data** | **any** |  | [optional] [default to undefined]
**error** | [**ApiErrorInfo**](ApiErrorInfo.md) |  | [optional] [default to undefined]
**metadata** | [**ApiMetadata**](ApiMetadata.md) |  | [optional] [default to undefined]
**requestId** | **string** | Unique request identifier for tracing | [optional] [default to undefined]
**success** | **boolean** | Indicates if the request was successful | [optional] [default to undefined]

## Example

```typescript
import { ApiAPIResponse } from './api';

const instance: ApiAPIResponse = {
    data,
    error,
    metadata,
    requestId,
    success,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
