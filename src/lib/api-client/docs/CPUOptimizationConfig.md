# CPUOptimizationConfig


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**BatchSizeScaleFactor** | **number** |  | [optional] [default to undefined]
**EnableAdaptiveBatching** | **boolean** |  | [optional] [default to undefined]
**MaxCPUUtilization** | **number** |  | [optional] [default to undefined]
**MaxWorkers** | **number** |  | [optional] [default to undefined]
**MinWorkers** | **number** |  | [optional] [default to undefined]
**ResourceMonitoringInterval** | **string** |  | [optional] [default to undefined]
**ScaleDownThreshold** | **number** |  | [optional] [default to undefined]
**ScaleUpThreshold** | **number** |  | [optional] [default to undefined]
**WorkerIdleTimeout** | **string** | Unique identifier | [optional] [default to undefined]
**WorkerTaskTimeout** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { CPUOptimizationConfig } from './api';

const instance: CPUOptimizationConfig = {
    BatchSizeScaleFactor,
    EnableAdaptiveBatching,
    MaxCPUUtilization,
    MaxWorkers,
    MinWorkers,
    ResourceMonitoringInterval,
    ScaleDownThreshold,
    ScaleUpThreshold,
    WorkerIdleTimeout,
    WorkerTaskTimeout,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
