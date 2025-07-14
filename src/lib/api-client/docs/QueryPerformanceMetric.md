# QueryPerformanceMetric


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**bufferHits** | **number** |  | [optional] [default to undefined]
**bufferReads** | **number** |  | [optional] [default to undefined]
**campaignId** | **string** | Unique identifier | [optional] [default to undefined]
**campaignType** | **string** |  | [optional] [default to undefined]
**cpuTimeMs** | **number** |  | [optional] [default to undefined]
**executedAt** | **string** |  | [optional] [default to undefined]
**executionTimeMs** | **number** |  | [optional] [default to undefined]
**id** | **string** | Unique identifier | [optional] [default to undefined]
**indexUsage** | **object** |  | [optional] [default to undefined]
**ioWaitMs** | **number** |  | [optional] [default to undefined]
**lockWaitMs** | **number** |  | [optional] [default to undefined]
**memoryUsedBytes** | **number** |  | [optional] [default to undefined]
**needsOptimization** | **boolean** |  | [optional] [default to undefined]
**optimizationApplied** | **boolean** |  | [optional] [default to undefined]
**optimizationScore** | **number** |  | [optional] [default to undefined]
**optimizationSuggestions** | **object** |  | [optional] [default to undefined]
**performanceCategory** | **string** |  | [optional] [default to undefined]
**queryHash** | **string** |  | [optional] [default to undefined]
**queryPlan** | **object** |  | [optional] [default to undefined]
**querySQL** | **string** |  | [optional] [default to undefined]
**queryType** | **string** |  | [optional] [default to undefined]
**rowsExamined** | **number** |  | [optional] [default to undefined]
**rowsReturned** | **number** |  | [optional] [default to undefined]
**serviceName** | **string** |  | [optional] [default to undefined]
**tableNames** | **Array&lt;string&gt;** |  | [optional] [default to undefined]
**userId** | **string** | Unique identifier | [optional] [default to undefined]

## Example

```typescript
import { QueryPerformanceMetric } from './api';

const instance: QueryPerformanceMetric = {
    bufferHits,
    bufferReads,
    campaignId,
    campaignType,
    cpuTimeMs,
    executedAt,
    executionTimeMs,
    id,
    indexUsage,
    ioWaitMs,
    lockWaitMs,
    memoryUsedBytes,
    needsOptimization,
    optimizationApplied,
    optimizationScore,
    optimizationSuggestions,
    performanceCategory,
    queryHash,
    queryPlan,
    querySQL,
    queryType,
    rowsExamined,
    rowsReturned,
    serviceName,
    tableNames,
    userId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
