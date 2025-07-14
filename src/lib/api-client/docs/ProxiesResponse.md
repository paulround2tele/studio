# ProxiesResponse

Response containing a list of proxies

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**limit** | **number** | Number of items per page | [optional] [default to undefined]
**page** | **number** | Current page number | [optional] [default to undefined]
**proxies** | [**Array&lt;Proxy&gt;**](Proxy.md) |  | [optional] [default to undefined]
**total** | **number** | Total number of proxies | [optional] [default to undefined]

## Example

```typescript
import { ProxiesResponse } from 'domainflow-api-client';

const instance: ProxiesResponse = {
    limit,
    page,
    proxies,
    total,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
