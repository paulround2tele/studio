# ProxiesApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**proxiesGet**](#proxiesget) | **GET** /proxies | List proxies|
|[**proxiesHealthCheckPost**](#proxieshealthcheckpost) | **POST** /proxies/health-check | Force all proxies health check|
|[**proxiesPost**](#proxiespost) | **POST** /proxies | Add proxy|
|[**proxiesProxyIdDelete**](#proxiesproxyiddelete) | **DELETE** /proxies/{proxyId} | Delete proxy|
|[**proxiesProxyIdHealthCheckPost**](#proxiesproxyidhealthcheckpost) | **POST** /proxies/{proxyId}/health-check | Force single proxy health check|
|[**proxiesProxyIdPut**](#proxiesproxyidput) | **PUT** /proxies/{proxyId} | Update proxy|
|[**proxiesProxyIdTestPost**](#proxiesproxyidtestpost) | **POST** /proxies/{proxyId}/test | Test proxy|
|[**proxiesStatusGet**](#proxiesstatusget) | **GET** /proxies/status | Get proxy statuses|

# **proxiesGet**
> Array<GithubComFntelecomllcStudioBackendInternalModelsProxy> proxiesGet()

Lists all proxies

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.proxiesGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<GithubComFntelecomllcStudioBackendInternalModelsProxy>**

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

# **proxiesHealthCheckPost**
> { [key: string]: string; } proxiesHealthCheckPost()

Forces a health check on all proxies

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.proxiesHealthCheckPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**{ [key: string]: string; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: */*


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesPost**
> GithubComFntelecomllcStudioBackendInternalModelsProxy proxiesPost(githubComFntelecomllcStudioBackendInternalModelsProxy)

Adds a new proxy

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    GithubComFntelecomllcStudioBackendInternalModelsProxy
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let githubComFntelecomllcStudioBackendInternalModelsProxy: GithubComFntelecomllcStudioBackendInternalModelsProxy; //Proxy

const { status, data } = await apiInstance.proxiesPost(
    githubComFntelecomllcStudioBackendInternalModelsProxy
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **githubComFntelecomllcStudioBackendInternalModelsProxy** | **GithubComFntelecomllcStudioBackendInternalModelsProxy**| Proxy | |


### Return type

**GithubComFntelecomllcStudioBackendInternalModelsProxy**

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

# **proxiesProxyIdDelete**
> { [key: string]: boolean; } proxiesProxyIdDelete()

Deletes a proxy by ID

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (default to undefined)

const { status, data } = await apiInstance.proxiesProxyIdDelete(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
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

# **proxiesProxyIdHealthCheckPost**
> { [key: string]: string; } proxiesProxyIdHealthCheckPost()

Forces a health check on a single proxy

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (default to undefined)

const { status, data } = await apiInstance.proxiesProxyIdHealthCheckPost(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

**{ [key: string]: string; }**

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

# **proxiesProxyIdPut**
> GithubComFntelecomllcStudioBackendInternalModelsProxy proxiesProxyIdPut(githubComFntelecomllcStudioBackendInternalModelsProxy)

Updates a proxy by ID

### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    GithubComFntelecomllcStudioBackendInternalModelsProxy
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (default to undefined)
let githubComFntelecomllcStudioBackendInternalModelsProxy: GithubComFntelecomllcStudioBackendInternalModelsProxy; //Proxy

const { status, data } = await apiInstance.proxiesProxyIdPut(
    proxyId,
    githubComFntelecomllcStudioBackendInternalModelsProxy
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **githubComFntelecomllcStudioBackendInternalModelsProxy** | **GithubComFntelecomllcStudioBackendInternalModelsProxy**| Proxy | |
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

**GithubComFntelecomllcStudioBackendInternalModelsProxy**

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

# **proxiesProxyIdTestPost**
> { [key: string]: any; } proxiesProxyIdTestPost()

Tests a proxy by ID

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; //Proxy ID (default to undefined)

const { status, data } = await apiInstance.proxiesProxyIdTestPost(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] | Proxy ID | defaults to undefined|


### Return type

**{ [key: string]: any; }**

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

# **proxiesStatusGet**
> { [key: string]: any; } proxiesStatusGet()

Gets the status of all proxies

### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.proxiesStatusGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**{ [key: string]: any; }**

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

