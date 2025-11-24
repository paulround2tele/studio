# ProxiesApi

All URIs are relative to *https://api.domainflow.dev/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**proxiesBulkDelete**](#proxiesbulkdelete) | **DELETE** /proxies/bulk/delete | Bulk delete proxies|
|[**proxiesBulkTest**](#proxiesbulktest) | **POST** /proxies/bulk/test | Bulk test proxies|
|[**proxiesBulkUpdate**](#proxiesbulkupdate) | **PUT** /proxies/bulk/update | Bulk update proxies|
|[**proxiesCreate**](#proxiescreate) | **POST** /proxies | Create proxy|
|[**proxiesDelete**](#proxiesdelete) | **DELETE** /proxies/{proxyId} | Delete proxy|
|[**proxiesHealthCheckAll**](#proxieshealthcheckall) | **POST** /proxies/health-check | Health check all proxies|
|[**proxiesHealthCheckSingle**](#proxieshealthchecksingle) | **POST** /proxies/{proxyId}/health-check | Health check single proxy|
|[**proxiesList**](#proxieslist) | **GET** /proxies | List proxies|
|[**proxiesStatus**](#proxiesstatus) | **GET** /proxies/status | Get proxy statuses|
|[**proxiesTest**](#proxiestest) | **POST** /proxies/{proxyId}/test | Test proxy|
|[**proxiesUpdate**](#proxiesupdate) | **PUT** /proxies/{proxyId} | Update proxy|

# **proxiesBulkDelete**
> proxiesBulkDelete(bulkDeleteProxiesRequest)


### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    BulkDeleteProxiesRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let bulkDeleteProxiesRequest: BulkDeleteProxiesRequest; //

const { status, data } = await apiInstance.proxiesBulkDelete(
    bulkDeleteProxiesRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkDeleteProxiesRequest** | **BulkDeleteProxiesRequest**|  | |


### Return type

void (empty response body)

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | No Content |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesBulkTest**
> BulkProxyTestResponse proxiesBulkTest(proxiesBulkTestRequest)


### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    ProxiesBulkTestRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxiesBulkTestRequest: ProxiesBulkTestRequest; //

const { status, data } = await apiInstance.proxiesBulkTest(
    proxiesBulkTestRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxiesBulkTestRequest** | **ProxiesBulkTestRequest**|  | |


### Return type

**BulkProxyTestResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesBulkUpdate**
> BulkProxyOperationResponse proxiesBulkUpdate(bulkUpdateProxiesRequest)


### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    BulkUpdateProxiesRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let bulkUpdateProxiesRequest: BulkUpdateProxiesRequest; //

const { status, data } = await apiInstance.proxiesBulkUpdate(
    bulkUpdateProxiesRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkUpdateProxiesRequest** | **BulkUpdateProxiesRequest**|  | |


### Return type

**BulkProxyOperationResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesCreate**
> Proxy proxiesCreate(createProxyRequestAPI)


### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    CreateProxyRequestAPI
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let createProxyRequestAPI: CreateProxyRequestAPI; //

const { status, data } = await apiInstance.proxiesCreate(
    createProxyRequestAPI
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createProxyRequestAPI** | **CreateProxyRequestAPI**|  | |


### Return type

**Proxy**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**409** | Conflict |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesDelete**
> proxiesDelete()


### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; // (default to undefined)

const { status, data } = await apiInstance.proxiesDelete(
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

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | No Content |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesHealthCheckAll**
> BulkHealthCheckResponse proxiesHealthCheckAll()


### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    ProxiesHealthCheckAllRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxiesHealthCheckAllRequest: ProxiesHealthCheckAllRequest; // (optional)

const { status, data } = await apiInstance.proxiesHealthCheckAll(
    proxiesHealthCheckAllRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxiesHealthCheckAllRequest** | **ProxiesHealthCheckAllRequest**|  | |


### Return type

**BulkHealthCheckResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**202** | Accepted |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesHealthCheckSingle**
> ProxyHealthCheckResponse proxiesHealthCheckSingle()


### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; // (default to undefined)

const { status, data } = await apiInstance.proxiesHealthCheckSingle(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] |  | defaults to undefined|


### Return type

**ProxyHealthCheckResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesList**
> Array<Proxy> proxiesList()


### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let limit: number; //Page size (items per page) (optional) (default to 50)
let offset: number; //Zero-based offset (optional) (default to 0)
let protocol: ProxyProtocol; //Filter proxies by protocol (optional) (default to undefined)
let countryCode: string; //Filter proxies by ISO country code (optional) (default to undefined)
let isEnabled: boolean; //Filter by enabled state (optional) (default to undefined)
let isHealthy: boolean; //Filter by health status (optional) (default to undefined)

const { status, data } = await apiInstance.proxiesList(
    limit,
    offset,
    protocol,
    countryCode,
    isEnabled,
    isHealthy
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] | Page size (items per page) | (optional) defaults to 50|
| **offset** | [**number**] | Zero-based offset | (optional) defaults to 0|
| **protocol** | **ProxyProtocol** | Filter proxies by protocol | (optional) defaults to undefined|
| **countryCode** | [**string**] | Filter proxies by ISO country code | (optional) defaults to undefined|
| **isEnabled** | [**boolean**] | Filter by enabled state | (optional) defaults to undefined|
| **isHealthy** | [**boolean**] | Filter by health status | (optional) defaults to undefined|


### Return type

**Array<Proxy>**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesStatus**
> Array<ProxyStatusResponse> proxiesStatus()


### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

const { status, data } = await apiInstance.proxiesStatus();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<ProxyStatusResponse>**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesTest**
> ProxyTestResponse proxiesTest()


### Example

```typescript
import {
    ProxiesApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; // (default to undefined)

const { status, data } = await apiInstance.proxiesTest(
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyId** | [**string**] |  | defaults to undefined|


### Return type

**ProxyTestResponse**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |
|**422** | Validation Error |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxiesUpdate**
> Proxy proxiesUpdate(updateProxyRequestAPI)


### Example

```typescript
import {
    ProxiesApi,
    Configuration,
    UpdateProxyRequestAPI
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxiesApi(configuration);

let proxyId: string; // (default to undefined)
let updateProxyRequestAPI: UpdateProxyRequestAPI; //

const { status, data } = await apiInstance.proxiesUpdate(
    proxyId,
    updateProxyRequestAPI
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateProxyRequestAPI** | **UpdateProxyRequestAPI**|  | |
| **proxyId** | [**string**] |  | defaults to undefined|


### Return type

**Proxy**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

