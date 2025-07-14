# TestProxyResponse

Response from testing a proxy

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**details** | **object** | Detailed test results | [optional] [default to undefined]
**message** | **string** | Test result message | [optional] [default to undefined]
**responseTime** | **number** | Response time in milliseconds | [optional] [default to undefined]
**success** | **boolean** | Whether the test was successful | [optional] [default to undefined]

## Example

```typescript
import { TestProxyResponse } from 'domainflow-api-client';

const instance: TestProxyResponse = {
    details,
    message,
    responseTime,
    success,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
