# SystemInfo

System information and resources

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**goVersion** | **string** | Go runtime version | [default to undefined]
**numCPU** | **number** | Number of CPU cores | [default to undefined]
**numGoroutine** | **number** | Number of active goroutines | [default to undefined]

## Example

```typescript
import { SystemInfo } from './api';

const instance: SystemInfo = {
    goVersion,
    numCPU,
    numGoroutine,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
