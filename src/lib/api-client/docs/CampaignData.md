# CampaignData


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**createdAt** | **string** |  | [optional] [default to undefined]
**currentPhase** | **string** | Phases-based architecture fields | [optional] [default to undefined]
**description** | **string** |  | [optional] [default to undefined]
**id** | **string** | Unique identifier | [optional] [default to undefined]
**name** | **string** |  | [optional] [default to undefined]
**phaseStatus** | **string** | @Description Status of the current phase | [optional] [default to undefined]
**progress** | **{ [key: string]: object; }** | @Description Overall progress percentage (0-100) | [optional] [default to undefined]
**updatedAt** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { CampaignData } from './api';

const instance: CampaignData = {
    createdAt,
    currentPhase,
    description,
    id,
    name,
    phaseStatus,
    progress,
    updatedAt,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
