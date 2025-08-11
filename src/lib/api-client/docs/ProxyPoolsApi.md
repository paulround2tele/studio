# ProxyPoolsApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**listProxyPools**](#listproxypools) | **GET** /proxy-pools | List proxy pools|
|[**proxyPoolsPoolIdDelete**](#proxypoolspooliddelete) | **DELETE** /proxy-pools/{poolId} | Delete proxy pool|
|[**proxyPoolsPoolIdProxiesPost**](#proxypoolspoolidproxiespost) | **POST** /proxy-pools/{poolId}/proxies | Add proxy to pool|
|[**proxyPoolsPoolIdProxiesProxyIdDelete**](#proxypoolspoolidproxiesproxyiddelete) | **DELETE** /proxy-pools/{poolId}/proxies/{proxyId} | Remove proxy from pool|
|[**proxyPoolsPoolIdPut**](#proxypoolspoolidput) | **PUT** /proxy-pools/{poolId} | Update proxy pool|
|[**proxyPoolsPost**](#proxypoolspost) | **POST** /proxy-pools | Create proxy pool|

# **listProxyPools**
> Array<GithubComFntelecomllcStudioBackendInternalModelsProxyPool> listProxyPools()

Retrieve all proxy pools with their associated proxies

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

const { status, data } = await apiInstance.listProxyPools();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<GithubComFntelecomllcStudioBackendInternalModelsProxyPool>**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of proxy pools |  -  |
|**500** | Failed to list proxy pools |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxyPoolsPoolIdDelete**
> { [key: string]: boolean; } proxyPoolsPoolIdDelete()

Delete a proxy pool

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Proxy pool ID (default to undefined)

const { status, data } = await apiInstance.proxyPoolsPoolIdDelete(
    poolId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **poolId** | [**string**] | Proxy pool ID | defaults to undefined|


### Return type

**{ [key: string]: boolean; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Deletion confirmation |  -  |
|**400** | Invalid ID |  -  |
|**404** | Failed to delete pool |  -  |
|**500** | Failed to delete pool |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxyPoolsPoolIdProxiesPost**
> GithubComFntelecomllcStudioBackendInternalModelsProxyPoolMembership proxyPoolsPoolIdProxiesPost(proxyPoolsPoolIdProxiesPostRequest)

Assign a proxy to a proxy pool with optional weight

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration,
    ProxyPoolsPoolIdProxiesPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Proxy pool ID (default to undefined)
let proxyPoolsPoolIdProxiesPostRequest: ProxyPoolsPoolIdProxiesPostRequest; //Proxy assignment request

const { status, data } = await apiInstance.proxyPoolsPoolIdProxiesPost(
    poolId,
    proxyPoolsPoolIdProxiesPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyPoolsPoolIdProxiesPostRequest** | **ProxyPoolsPoolIdProxiesPostRequest**| Proxy assignment request | |
| **poolId** | [**string**] | Proxy pool ID | defaults to undefined|


### Return type

**GithubComFntelecomllcStudioBackendInternalModelsProxyPoolMembership**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created membership |  -  |
|**400** | Invalid pool ID, payload, or proxy ID |  -  |
|**500** | Failed to add proxy |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxyPoolsPoolIdProxiesProxyIdDelete**
> ApiProxyPoolMembershipResponse proxyPoolsPoolIdProxiesProxyIdDelete()

Remove a proxy from a specific proxy pool

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Pool ID (UUID) (default to undefined)
let proxyId: string; //Proxy ID (UUID) (default to undefined)

const { status, data } = await apiInstance.proxyPoolsPoolIdProxiesProxyIdDelete(
    poolId,
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **poolId** | [**string**] | Pool ID (UUID) | defaults to undefined|
| **proxyId** | [**string**] | Proxy ID (UUID) | defaults to undefined|


### Return type

**ApiProxyPoolMembershipResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxy removed from pool successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Pool or proxy not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxyPoolsPoolIdPut**
> GithubComFntelecomllcStudioBackendInternalModelsProxyPool proxyPoolsPoolIdPut(apiProxyPoolRequest)

Update an existing proxy pool configuration

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration,
    ApiProxyPoolRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Proxy pool ID (default to undefined)
let apiProxyPoolRequest: ApiProxyPoolRequest; //Proxy pool update request

const { status, data } = await apiInstance.proxyPoolsPoolIdPut(
    poolId,
    apiProxyPoolRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiProxyPoolRequest** | **ApiProxyPoolRequest**| Proxy pool update request | |
| **poolId** | [**string**] | Proxy pool ID | defaults to undefined|


### Return type

**GithubComFntelecomllcStudioBackendInternalModelsProxyPool**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated proxy pool |  -  |
|**400** | Invalid ID or request payload |  -  |
|**404** | Pool not found |  -  |
|**500** | Failed to update pool |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxyPoolsPost**
> GithubComFntelecomllcStudioBackendInternalModelsProxyPool proxyPoolsPost(apiProxyPoolRequest)

Create a new proxy pool with configuration settings

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration,
    ApiProxyPoolRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let apiProxyPoolRequest: ApiProxyPoolRequest; //Proxy pool creation request

const { status, data } = await apiInstance.proxyPoolsPost(
    apiProxyPoolRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiProxyPoolRequest** | **ApiProxyPoolRequest**| Proxy pool creation request | |


### Return type

**GithubComFntelecomllcStudioBackendInternalModelsProxyPool**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created proxy pool |  -  |
|**400** | Invalid request payload |  -  |
|**500** | Failed to create pool |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

