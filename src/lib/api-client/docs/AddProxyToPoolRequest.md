# AddProxyToPoolRequest

Request to add a proxy to a pool

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**proxyId** | **string** | Proxy ID to add to the pool | [default to undefined]
**weight** | **number** | Weight for weighted pool strategies | [optional] [default to undefined]

## Example

```typescript
import { AddProxyToPoolRequest } from './api';

const instance: AddProxyToPoolRequest = {
    proxyId,
    weight,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
