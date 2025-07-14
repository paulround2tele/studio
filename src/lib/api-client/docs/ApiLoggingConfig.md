# ApiLoggingConfig


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**enableFileLogging** | **boolean** |  | [optional] [default to undefined]
**enableJSONFormat** | **boolean** |  | [optional] [default to undefined]
**enablePerformanceLogging** | **boolean** |  | [optional] [default to undefined]
**enableRequestLogging** | **boolean** |  | [optional] [default to undefined]
**level** | **string** |  | [optional] [default to undefined]
**logDirectory** | **string** |  | [optional] [default to undefined]
**maxAge** | **number** |  | [optional] [default to undefined]
**maxBackups** | **number** |  | [optional] [default to undefined]
**maxFileSize** | **number** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiLoggingConfig } from './api';

const instance: ApiLoggingConfig = {
    enableFileLogging,
    enableJSONFormat,
    enablePerformanceLogging,
    enableRequestLogging,
    level,
    logDirectory,
    maxAge,
    maxBackups,
    maxFileSize,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
