# KeywordSetsResponse

Response containing a list of keyword sets

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**keywordSets** | [**Array&lt;KeywordSet&gt;**](KeywordSet.md) |  | [optional] [default to undefined]
**limit** | **number** | Number of items per page | [optional] [default to undefined]
**page** | **number** | Current page number | [optional] [default to undefined]
**total** | **number** | Total number of keyword sets | [optional] [default to undefined]

## Example

```typescript
import { KeywordSetsResponse } from 'domainflow-api-client';

const instance: KeywordSetsResponse = {
    keywordSets,
    limit,
    page,
    total,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
