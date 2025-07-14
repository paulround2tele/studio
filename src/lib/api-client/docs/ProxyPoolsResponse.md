# ProxyPoolsResponse

Response containing a list of proxy pools

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**limit** | **number** | Number of items per page | [optional] [default to undefined]
**page** | **number** | Current page number | [optional] [default to undefined]
**proxyPools** | [**Array&lt;ProxyPool&gt;**](ProxyPool.md) |  | [optional] [default to undefined]
**total** | **number** | Total number of proxy pools | [optional] [default to undefined]

## Example

```typescript
import { ProxyPoolsResponse } from 'domainflow-api-client';

const instance: ProxyPoolsResponse = {
    limit,
    page,
    proxyPools,
    total,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
