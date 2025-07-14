# CampaignStateTransition


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**campaignId** | **string** | Unique identifier | [optional] [default to undefined]
**completedAt** | **string** |  | [optional] [default to undefined]
**durationMs** | **string** |  | [optional] [default to undefined]
**fromState** | **string** |  | [optional] [default to undefined]
**id** | **string** | Unique identifier | [optional] [default to undefined]
**initiatedAt** | **string** |  | [optional] [default to undefined]
**isValidTransition** | **boolean** |  | [optional] [default to undefined]
**stateEventId** | **string** | Unique identifier | [optional] [default to undefined]
**toState** | **string** |  | [optional] [default to undefined]
**transitionMetadata** | **object** |  | [optional] [default to undefined]
**triggeredBy** | **string** |  | [optional] [default to undefined]
**validationErrors** | **object** |  | [optional] [default to undefined]

## Example

```typescript
import { CampaignStateTransition } from './api';

const instance: CampaignStateTransition = {
    campaignId,
    completedAt,
    durationMs,
    fromState,
    id,
    initiatedAt,
    isValidTransition,
    stateEventId,
    toState,
    transitionMetadata,
    triggeredBy,
    validationErrors,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
