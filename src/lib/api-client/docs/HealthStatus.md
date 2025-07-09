# HealthStatus

Health status of the application and its components

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**buildTime** | **string** | Build timestamp | [default to undefined]
**components** | [**{ [key: string]: ComponentStatus; }**](ComponentStatus.md) | Status of individual components | [default to undefined]
**environment** | **string** | Runtime environment | [default to undefined]
**status** | **string** | Overall health status | [default to undefined]
**systemInfo** | [**SystemInfo**](SystemInfo.md) |  | [default to undefined]
**version** | **string** | Application version | [default to undefined]

## Example

```typescript
import { HealthStatus } from './api';

const instance: HealthStatus = {
    buildTime,
    components,
    environment,
    status,
    systemInfo,
    version,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
