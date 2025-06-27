# ProxiesApi

All URIs are relative to *http://localhost:8080*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiV2ProxiesGet**](#apiv2proxiesget) | **GET** /api/v2/proxies | List proxies|
|[**apiV2ProxiesHealthCheckPost**](#apiv2proxieshealthcheckpost) | **POST** /api/v2/proxies/health-check | Force all proxies health check|
|[**apiV2ProxiesPost**](#apiv2proxiespost) | **POST** /api/v2/proxies | Add proxy|
|[**apiV2ProxiesProxyIdDelete**](#apiv2proxiesproxyiddelete) | **DELETE** /api/v2/proxies/{proxyId} | Delete proxy|
|[**apiV2ProxiesProxyIdHealthCheckPost**](#apiv2proxiesproxyidhealthcheckpost) | **POST** /api/v2/proxies/{proxyId}/health-check | Force single proxy health check|
|[**apiV2ProxiesProxyIdPut**](#apiv2proxiesproxyidput) | **PUT** /api/v2/proxies/{proxyId} | Update proxy|
|[**apiV2ProxiesStatusGet**](#apiv2proxiesstatusget) | **GET** /api/v2/proxies/status | Proxy statuses|
|[**testProxy**](#testproxy) | **POST** /api/v2/proxies/{proxyId} | Test proxy|

# **apiV2ProxiesGet**
> Array<ProxyResponse> apiV2ProxiesGet()


### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.apiV2ProxiesGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<ProxyResponse>**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of proxies |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ProxiesHealthCheckPost**
> apiV2ProxiesHealthCheckPost()


### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.apiV2ProxiesHealthCheckPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Health check triggered |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ProxiesPost**
> ProxyResponse apiV2ProxiesPost(body)


### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let body: object; //

const { status, data } = await apiInstance.apiV2ProxiesPost(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

**ProxyResponse**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ProxiesProxyIdDelete**
> apiV2ProxiesProxyIdDelete()


### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; // (default to undefined)

const { status, data } = await apiInstance.apiV2ProxiesProxyIdDelete(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] |  | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ProxiesProxyIdHealthCheckPost**
> apiV2ProxiesProxyIdHealthCheckPost()


### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.apiV2ProxiesProxyIdHealthCheckPost();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Health check triggered |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ProxiesProxyIdPut**
> ProxyResponse apiV2ProxiesProxyIdPut(body)


### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; // (default to undefined)
let body: object; //

const { status, data } = await apiInstance.apiV2ProxiesProxyIdPut(
    proxyId,
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |
| **proxyId** | [**string**] |  | defaults to undefined|


### Return type

**ProxyResponse**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ProxiesStatusGet**
> apiV2ProxiesStatusGet()


### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.apiV2ProxiesStatusGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Status list |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **testProxy**
> testProxy()


### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; // (default to undefined)

const { status, data } = await apiInstance.testProxy(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] |  | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Test results |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

