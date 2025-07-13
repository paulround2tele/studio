# CampaignListResponse

Paginated list of campaigns

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**campaigns** | [**Array&lt;Campaign&gt;**](Campaign.md) | List of campaigns | [default to undefined]
**limit** | **number** | Number of items per page | [default to undefined]
**page** | **number** | Current page number | [default to undefined]
**total** | **number** | Total number of campaigns | [default to undefined]

## Example

```typescript
import { CampaignListResponse } from './api';

const instance: CampaignListResponse = {
    campaigns,
    limit,
    page,
    total,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
