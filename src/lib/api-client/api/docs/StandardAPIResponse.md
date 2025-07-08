# StandardAPIResponse

Standard API response wrapper

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**data** | **any** | Response data (only present on success) | [optional] [default to undefined]
**error** | **string** | Error details (only present on error) | [optional] [default to undefined]
**message** | **string** | Human-readable message | [default to undefined]
**status** | **string** | Status of the response | [default to undefined]

## Example

```typescript
import { StandardAPIResponse } from 'domainflow-api-client';

const instance: StandardAPIResponse = {
    data,
    error,
    message,
    status,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
