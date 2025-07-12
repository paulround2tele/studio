# BulkDeleteResponse

Response for bulk delete operation

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**errors** | **Array&lt;string&gt;** | List of error messages for failed deletions | [optional] [default to undefined]
**failedDeletions** | **number** | Number of campaigns that failed to delete | [optional] [default to undefined]
**message** | **string** | Operation result message | [optional] [default to undefined]
**successfulDeletions** | **number** | Number of campaigns successfully deleted | [optional] [default to undefined]
**totalRequested** | **number** | Total number of campaigns requested for deletion | [optional] [default to undefined]

## Example

```typescript
import { BulkDeleteResponse } from 'api-client';

const instance: BulkDeleteResponse = {
    errors,
    failedDeletions,
    message,
    successfulDeletions,
    totalRequested,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
