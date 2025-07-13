# CampaignDependencyInfo


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**campaign** | [**Campaign**](Campaign.md) |  | [optional] [default to undefined]
**canDelete** | **boolean** |  | [optional] [default to undefined]
**dependentCampaigns** | [**Array&lt;Campaign&gt;**](Campaign.md) |  | [optional] [default to undefined]
**hasDependencies** | **boolean** |  | [optional] [default to undefined]

## Example

```typescript
import { CampaignDependencyInfo } from './api';

const instance: CampaignDependencyInfo = {
    campaign,
    canDelete,
    dependentCampaigns,
    hasDependencies,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
