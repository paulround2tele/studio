# TestProxyRequest

Request to test a proxy

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**targetUrl** | **string** | URL to test the proxy against | [optional] [default to 'http://httpbin.org/ip']
**timeout** | **number** | Test timeout in seconds | [optional] [default to 30]

## Example

```typescript
import { TestProxyRequest } from 'domainflow-api-client';

const instance: TestProxyRequest = {
    targetUrl,
    timeout,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
