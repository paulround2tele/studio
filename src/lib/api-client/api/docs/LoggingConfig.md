# LoggingConfig

Logging configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**enableFileLogging** | **boolean** | Enable file-based logging | [optional] [default to undefined]
**enableJSONFormat** | **boolean** | Enable JSON log format | [optional] [default to undefined]
**enablePerformanceLogging** | **boolean** | Enable performance logging | [optional] [default to undefined]
**enableRequestLogging** | **boolean** | Enable request logging | [optional] [default to undefined]
**level** | **string** | Log level | [optional] [default to undefined]
**logDirectory** | **string** | Directory for log files | [optional] [default to undefined]
**maxAge** | **number** | Maximum age of log files in days | [optional] [default to undefined]
**maxBackups** | **number** | Maximum number of backup log files | [optional] [default to undefined]
**maxFileSize** | **number** | Maximum log file size in MB | [optional] [default to undefined]

## Example

```typescript
import { LoggingConfig } from 'domainflow-api-client';

const instance: LoggingConfig = {
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
