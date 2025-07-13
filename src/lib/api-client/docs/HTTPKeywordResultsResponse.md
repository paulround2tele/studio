# HTTPKeywordResultsResponse

Paginated list of HTTP keyword results

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**limit** | **number** | Number of items per page | [default to undefined]
**page** | **number** | Current page number | [default to undefined]
**results** | [**Array&lt;HTTPKeywordResult&gt;**](HTTPKeywordResult.md) | List of HTTP keyword results | [default to undefined]
**total** | **number** | Total number of results | [default to undefined]

## Example

```typescript
import { HTTPKeywordResultsResponse } from './api';

const instance: HTTPKeywordResultsResponse = {
    limit,
    page,
    results,
    total,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
