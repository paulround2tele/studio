# UpdateProxyRequest

Request to update an existing proxy

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**address** | **string** | Proxy address (host:port) | [optional] [default to undefined]
**countryCode** | **string** | Country code for the proxy location | [optional] [default to undefined]
**description** | **string** | Proxy description | [optional] [default to undefined]
**isEnabled** | **boolean** | Whether the proxy is enabled | [optional] [default to undefined]
**name** | **string** | Proxy name | [optional] [default to undefined]
**password** | **string** | Proxy password for authentication | [optional] [default to undefined]
**protocol** | **string** | Proxy protocol | [optional] [default to undefined]
**username** | **string** | Proxy username for authentication | [optional] [default to undefined]

## Example

```typescript
import { UpdateProxyRequest } from 'domainflow-api-client';

const instance: UpdateProxyRequest = {
    address,
    countryCode,
    description,
    isEnabled,
    name,
    password,
    protocol,
    username,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
