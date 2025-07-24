# APIResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**data** | **object** |  | [optional] [default to undefined]
**error** | [**ErrorInfo**](ErrorInfo.md) |  | [optional] [default to undefined]
**metadata** | [**Metadata**](Metadata.md) |  | [optional] [default to undefined]
**requestId** | **string** | Unique identifier | [optional] [default to undefined]
**success** | **boolean** |  | [optional] [default to undefined]

## Example

```typescript
import { APIResponse } from './api';

const instance: APIResponse = {
    data,
    error,
    metadata,
    requestId,
    success,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
