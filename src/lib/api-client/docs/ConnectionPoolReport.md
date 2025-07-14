# ConnectionPoolReport


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**averageActiveConnections** | **number** |  | [optional] [default to undefined]
**averageIdleConnections** | **number** |  | [optional] [default to undefined]
**averageUtilizationPercent** | **number** |  | [optional] [default to undefined]
**averageWaitTimeMs** | **number** |  | [optional] [default to undefined]
**connectionErrorRate** | **number** |  | [optional] [default to undefined]
**maxActiveConnections** | **number** |  | [optional] [default to undefined]
**peakUtilizationPercent** | **number** |  | [optional] [default to undefined]
**period** | **string** |  | [optional] [default to undefined]
**totalConnectionErrors** | **number** |  | [optional] [default to undefined]
**totalWaitEvents** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { ConnectionPoolReport } from './api';

const instance: ConnectionPoolReport = {
    averageActiveConnections,
    averageIdleConnections,
    averageUtilizationPercent,
    averageWaitTimeMs,
    connectionErrorRate,
    maxActiveConnections,
    peakUtilizationPercent,
    period,
    totalConnectionErrors,
    totalWaitEvents,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
