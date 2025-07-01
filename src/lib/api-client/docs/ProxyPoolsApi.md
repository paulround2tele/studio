# ProxyPoolsApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**proxyPoolsGet**](#proxypoolsget) | **GET** /proxy-pools | List proxy pools|
|[**proxyPoolsPoolIdDelete**](#proxypoolspooliddelete) | **DELETE** /proxy-pools/{poolId} | Delete proxy pool|
|[**proxyPoolsPoolIdProxiesPost**](#proxypoolspoolidproxiespost) | **POST** /proxy-pools/{poolId}/proxies | Add proxy to pool|
|[**proxyPoolsPoolIdProxiesProxyIdDelete**](#proxypoolspoolidproxiesproxyiddelete) | **DELETE** /proxy-pools/{poolId}/proxies/{proxyId} | Remove proxy from pool|
|[**proxyPoolsPoolIdPut**](#proxypoolspoolidput) | **PUT** /proxy-pools/{poolId} | Update proxy pool|
|[**proxyPoolsPost**](#proxypoolspost) | **POST** /proxy-pools | Create proxy pool|

# **proxyPoolsGet**
> Array<GithubComFntelecomllcStudioBackendInternalModelsProxyPool> proxyPoolsGet()

Returns all proxy pools

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

const { status, data } = await apiInstance.proxyPoolsGet();
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
|**200** | OK |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxyPoolsPoolIdDelete**
> { [key: string]: boolean; } proxyPoolsPoolIdDelete()

Deletes a proxy pool by ID

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Pool ID (default to undefined)

const { status, data } = await apiInstance.proxyPoolsPoolIdDelete(
    poolId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **poolId** | [**string**] | Pool ID | defaults to undefined|


### Return type

**{ [key: string]: boolean; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxyPoolsPoolIdProxiesPost**
> GithubComFntelecomllcStudioBackendInternalModelsProxyPoolMembership proxyPoolsPoolIdProxiesPost(githubComFntelecomllcStudioBackendInternalModelsProxy)

Assigns a proxy to a pool

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration,
    GithubComFntelecomllcStudioBackendInternalModelsProxy
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Pool ID (default to undefined)
let githubComFntelecomllcStudioBackendInternalModelsProxy: GithubComFntelecomllcStudioBackendInternalModelsProxy; //Proxy

const { status, data } = await apiInstance.proxyPoolsPoolIdProxiesPost(
    poolId,
    githubComFntelecomllcStudioBackendInternalModelsProxy
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **githubComFntelecomllcStudioBackendInternalModelsProxy** | **GithubComFntelecomllcStudioBackendInternalModelsProxy**| Proxy | |
| **poolId** | [**string**] | Pool ID | defaults to undefined|


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
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxyPoolsPoolIdProxiesProxyIdDelete**
> { [key: string]: boolean; } proxyPoolsPoolIdProxiesProxyIdDelete()

Removes a proxy from a pool

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Pool ID (default to undefined)
let proxyId: string; //Proxy ID (default to undefined)

const { status, data } = await apiInstance.proxyPoolsPoolIdProxiesProxyIdDelete(
    poolId,
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **poolId** | [**string**] | Pool ID | defaults to undefined|
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

**{ [key: string]: boolean; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxyPoolsPoolIdPut**
> GithubComFntelecomllcStudioBackendInternalModelsProxyPool proxyPoolsPoolIdPut(internalApiProxyPoolRequest)

Updates a proxy pool by ID

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration,
    InternalApiProxyPoolRequest
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Pool ID (default to undefined)
let internalApiProxyPoolRequest: InternalApiProxyPoolRequest; //Proxy pool

const { status, data } = await apiInstance.proxyPoolsPoolIdPut(
    poolId,
    internalApiProxyPoolRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **internalApiProxyPoolRequest** | **InternalApiProxyPoolRequest**| Proxy pool | |
| **poolId** | [**string**] | Pool ID | defaults to undefined|


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
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxyPoolsPost**
> GithubComFntelecomllcStudioBackendInternalModelsProxyPool proxyPoolsPost(internalApiProxyPoolRequest)

Creates a new proxy pool

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration,
    InternalApiProxyPoolRequest
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let internalApiProxyPoolRequest: InternalApiProxyPoolRequest; //Proxy pool

const { status, data } = await apiInstance.proxyPoolsPost(
    internalApiProxyPoolRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **internalApiProxyPoolRequest** | **InternalApiProxyPoolRequest**| Proxy pool | |


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
|**201** | Created |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

