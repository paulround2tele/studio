# UpdateProxyPoolRequest

Request to update an existing proxy pool

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**description** | **string** | Proxy pool description | [optional] [default to undefined]
**isEnabled** | **boolean** | Whether the proxy pool is enabled | [optional] [default to undefined]
**name** | **string** | Proxy pool name | [optional] [default to undefined]
**proxyIds** | **Array&lt;string&gt;** | List of proxy IDs to include in the pool | [optional] [default to undefined]

## Example

```typescript
import { UpdateProxyPoolRequest } from 'domainflow-api-client';

const instance: UpdateProxyPoolRequest = {
    description,
    isEnabled,
    name,
    proxyIds,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
