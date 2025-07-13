# DNSValidationResultsResponse

Paginated list of DNS validation results

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**limit** | **number** | Number of items per page | [default to undefined]
**page** | **number** | Current page number | [default to undefined]
**results** | [**Array&lt;DNSValidationResult&gt;**](DNSValidationResult.md) | List of DNS validation results | [default to undefined]
**total** | **number** | Total number of results | [default to undefined]

## Example

```typescript
import { DNSValidationResultsResponse } from './api';

const instance: DNSValidationResultsResponse = {
    limit,
    page,
    results,
    total,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
