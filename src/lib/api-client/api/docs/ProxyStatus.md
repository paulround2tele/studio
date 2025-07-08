# ProxyStatus

Proxy status information

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**address** | **string** | Proxy address | [optional] [default to undefined]
**consecutiveFailures** | **number** | Number of consecutive failures | [optional] [default to undefined]
**description** | **string** | Proxy description | [optional] [default to undefined]
**id** | **string** | Proxy ID | [optional] [default to undefined]
**isHealthy** | **boolean** | Whether the proxy is healthy | [optional] [default to undefined]
**lastFailure** | **string** | Last failure timestamp | [optional] [default to undefined]
**name** | **string** | Proxy name | [optional] [default to undefined]
**password** | **string** | Proxy password (may be masked) | [optional] [default to undefined]
**protocol** | **string** | Proxy protocol | [optional] [default to undefined]
**userEnabled** | **boolean** | Whether the proxy is enabled by user | [optional] [default to undefined]
**username** | **string** | Proxy username | [optional] [default to undefined]

## Example

```typescript
import { ProxyStatus } from 'domainflow-api-client';

const instance: ProxyStatus = {
    address,
    consecutiveFailures,
    description,
    id,
    isHealthy,
    lastFailure,
    name,
    password,
    protocol,
    userEnabled,
    username,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
