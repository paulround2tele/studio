# CampaignListResponse

Response for campaign list with pagination metadata

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**data** | [**Array&lt;Campaign&gt;**](Campaign.md) |  | [optional] [default to undefined]
**metadata** | [**PaginationMetadata**](PaginationMetadata.md) |  | [optional] [default to undefined]
**status** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { CampaignListResponse } from 'api-client';

const instance: CampaignListResponse = {
    data,
    metadata,
    status,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
