# ServicesDNSValidationResultsResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**data** | [**Array&lt;ModelsDNSValidationResult&gt;**](ModelsDNSValidationResult.md) |  | [optional] [default to undefined]
**nextCursor** | **string** | Represents the last domain_name for the next query | [optional] [default to undefined]
**totalCount** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { ServicesDNSValidationResultsResponse } from './api';

const instance: ServicesDNSValidationResultsResponse = {
    data,
    nextCursor,
    totalCount,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
