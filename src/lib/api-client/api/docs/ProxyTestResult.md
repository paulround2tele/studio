# ProxyTestResult

Result of proxy test operation

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**durationMs** | **number** | Test duration in milliseconds | [optional] [default to undefined]
**error** | **string** | Error message if test failed | [optional] [default to undefined]
**proxyId** | **string** | Proxy ID that was tested | [optional] [default to undefined]
**returnedIp** | **string** | IP address returned by the proxy test | [optional] [default to undefined]
**statusCode** | **number** | HTTP status code from test request | [optional] [default to undefined]
**success** | **boolean** | Whether the test was successful | [optional] [default to undefined]

## Example

```typescript
import { ProxyTestResult } from 'domainflow-api-client';

const instance: ProxyTestResult = {
    durationMs,
    error,
    proxyId,
    returnedIp,
    statusCode,
    success,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
