# ApiWorkerConfig


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**batchSize** | **number** |  | [optional] [default to undefined]
**dnsSubtaskConcurrency** | **number** | Added | [optional] [default to undefined]
**errorRetryDelaySeconds** | **number** |  | [optional] [default to undefined]
**httpKeywordSubtaskConcurrency** | **number** | Added | [optional] [default to undefined]
**jobProcessingTimeoutMinutes** | **number** |  | [optional] [default to undefined]
**maxJobRetries** | **number** |  | [optional] [default to undefined]
**maxRetries** | **number** |  | [optional] [default to undefined]
**numWorkers** | **number** |  | [optional] [default to undefined]
**pollIntervalSeconds** | **number** |  | [optional] [default to undefined]
**retryDelaySeconds** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiWorkerConfig } from './api';

const instance: ApiWorkerConfig = {
    batchSize,
    dnsSubtaskConcurrency,
    errorRetryDelaySeconds,
    httpKeywordSubtaskConcurrency,
    jobProcessingTimeoutMinutes,
    maxJobRetries,
    maxRetries,
    numWorkers,
    pollIntervalSeconds,
    retryDelaySeconds,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
