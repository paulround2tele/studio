# WorkerConfig

Worker configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**batchSize** | **number** | Batch size for processing | [optional] [default to undefined]
**dnsSubtaskConcurrency** | **number** | DNS subtask concurrency | [optional] [default to undefined]
**errorRetryDelaySeconds** | **number** | Error retry delay in seconds | [optional] [default to undefined]
**httpKeywordSubtaskConcurrency** | **number** | HTTP keyword subtask concurrency | [optional] [default to undefined]
**jobProcessingTimeoutMinutes** | **number** | Job processing timeout in minutes | [optional] [default to undefined]
**maxJobRetries** | **number** | Maximum job retry attempts | [optional] [default to undefined]
**maxRetries** | **number** | Maximum retry attempts | [optional] [default to undefined]
**numWorkers** | **number** | Number of worker goroutines | [optional] [default to undefined]
**pollIntervalSeconds** | **number** | Polling interval in seconds | [optional] [default to undefined]
**retryDelaySeconds** | **number** | Retry delay in seconds | [optional] [default to undefined]

## Example

```typescript
import { WorkerConfig } from 'api-client';

const instance: WorkerConfig = {
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
