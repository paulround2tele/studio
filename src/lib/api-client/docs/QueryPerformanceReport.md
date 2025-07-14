# QueryPerformanceReport


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**averageRowsReturned** | **number** |  | [optional] [default to undefined]
**averageRowsScanned** | **number** |  | [optional] [default to undefined]
**averageTimeMs** | **number** |  | [optional] [default to undefined]
**errorRate** | **number** |  | [optional] [default to undefined]
**indexUsageRate** | **number** |  | [optional] [default to undefined]
**maxTimeMs** | **number** |  | [optional] [default to undefined]
**minTimeMs** | **number** |  | [optional] [default to undefined]
**p50TimeMs** | **number** |  | [optional] [default to undefined]
**p95TimeMs** | **number** |  | [optional] [default to undefined]
**p99TimeMs** | **number** |  | [optional] [default to undefined]
**period** | **string** |  | [optional] [default to undefined]
**queryType** | **string** |  | [optional] [default to undefined]
**totalQueries** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { QueryPerformanceReport } from './api';

const instance: QueryPerformanceReport = {
    averageRowsReturned,
    averageRowsScanned,
    averageTimeMs,
    errorRate,
    indexUsageRate,
    maxTimeMs,
    minTimeMs,
    p50TimeMs,
    p95TimeMs,
    p99TimeMs,
    period,
    queryType,
    totalQueries,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
