# ResourceUtilizationMetric


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**bottleneckDetected** | **boolean** |  | [optional] [default to undefined]
**campaignId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**campaignPhase** | **string** |  | [optional] [default to undefined]
**component** | **string** |  | [optional] [default to undefined]
**currentUsage** | **number** |  | [optional] [default to undefined]
**efficiencyScore** | **number** |  | [optional] [default to undefined]
**id** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**maxCapacity** | **number** |  | [optional] [default to undefined]
**optimizationApplied** | **object** |  | [optional] [default to undefined]
**recordedAt** | **string** |  | [optional] [default to undefined]
**resourceType** | **string** |  | [optional] [default to undefined]
**serviceName** | **string** |  | [optional] [default to undefined]
**utilizationPct** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { ResourceUtilizationMetric } from './api';

const instance: ResourceUtilizationMetric = {
    bottleneckDetected,
    campaignId,
    campaignPhase,
    component,
    currentUsage,
    efficiencyScore,
    id,
    maxCapacity,
    optimizationApplied,
    recordedAt,
    resourceType,
    serviceName,
    utilizationPct,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
