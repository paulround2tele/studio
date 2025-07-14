# PerformanceThreshold


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**maxConnectionWaitTimeMs** | **number** |  | [optional] [default to undefined]
**maxExecutionTimeMs** | **number** |  | [optional] [default to undefined]
**maxMemoryUsageKb** | **number** |  | [optional] [default to undefined]
**maxRowsScannedRatio** | **number** |  | [optional] [default to undefined]
**minIndexUsageRate** | **number** |  | [optional] [default to undefined]
**queryType** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { PerformanceThreshold } from './api';

const instance: PerformanceThreshold = {
    maxConnectionWaitTimeMs,
    maxExecutionTimeMs,
    maxMemoryUsageKb,
    maxRowsScannedRatio,
    minIndexUsageRate,
    queryType,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
