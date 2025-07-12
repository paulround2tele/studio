# HTTPKeywordResultsResponse

Response for HTTP keyword validation results

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**data** | [**Array&lt;HTTPKeywordResult&gt;**](HTTPKeywordResult.md) |  | [optional] [default to undefined]
**nextCursor** | **string** | Next cursor for pagination | [optional] [default to undefined]
**totalCount** | **number** | Total number of HTTP keyword results | [optional] [default to undefined]

## Example

```typescript
import { HTTPKeywordResultsResponse } from 'api-client';

const instance: HTTPKeywordResultsResponse = {
    data,
    nextCursor,
    totalCount,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
