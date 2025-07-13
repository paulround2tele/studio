# BulkDeleteResult


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**deleted_campaign_ids** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**errors** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**failed_campaign_ids** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**failed_deletions** | **number** |  | [optional] [default to undefined]
**successfully_deleted** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { BulkDeleteResult } from './api';

const instance: BulkDeleteResult = {
    deleted_campaign_ids,
    errors,
    failed_campaign_ids,
    failed_deletions,
    successfully_deleted,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
