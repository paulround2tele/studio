# ConnectionPoolMetrics


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**activeConnections** | **number** |  | [optional] [default to undefined]
**connectionErrors** | **number** |  | [optional] [default to undefined]
**id** | **number** |  | [optional] [default to undefined]
**idleConnections** | **number** |  | [optional] [default to undefined]
**maxConnections** | **number** |  | [optional] [default to undefined]
**poolUtilizationPercent** | **number** |  | [optional] [default to undefined]
**recordedAt** | **string** |  | [optional] [default to undefined]
**waitCount** | **number** |  | [optional] [default to undefined]
**waitDurationMs** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { ConnectionPoolMetrics } from './api';

const instance: ConnectionPoolMetrics = {
    activeConnections,
    connectionErrors,
    id,
    idleConnections,
    maxConnections,
    poolUtilizationPercent,
    recordedAt,
    waitCount,
    waitDurationMs,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
