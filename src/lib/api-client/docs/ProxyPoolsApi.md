# ProxyPoolsApi

All URIs are relative to *https://api.domainflow.dev/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**proxyPoolsAddProxy**](#proxypoolsaddproxy) | **POST** /proxy-pools/{poolId}/proxies | Add proxy to pool|
|[**proxyPoolsCreate**](#proxypoolscreate) | **POST** /proxy-pools | Create proxy pool|
|[**proxyPoolsDelete**](#proxypoolsdelete) | **DELETE** /proxy-pools/{poolId} | Delete proxy pool|
|[**proxyPoolsList**](#proxypoolslist) | **GET** /proxy-pools | List proxy pools|
|[**proxyPoolsRemoveProxy**](#proxypoolsremoveproxy) | **DELETE** /proxy-pools/{poolId}/proxies/{proxyId} | Remove proxy from pool|
|[**proxyPoolsUpdate**](#proxypoolsupdate) | **PUT** /proxy-pools/{poolId} | Update proxy pool|

# **proxyPoolsAddProxy**
> ProxyPoolMembership proxyPoolsAddProxy(proxyPoolsAddProxyRequest)


### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration,
    ProxyPoolsAddProxyRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; // (default to undefined)
let proxyPoolsAddProxyRequest: ProxyPoolsAddProxyRequest; //

const { status, data } = await apiInstance.proxyPoolsAddProxy(
    poolId,
    proxyPoolsAddProxyRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyPoolsAddProxyRequest** | **ProxyPoolsAddProxyRequest**|  | |
| **poolId** | [**string**] |  | defaults to undefined|


### Return type

**ProxyPoolMembership**

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
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxyPoolsCreate**
> ProxyPool proxyPoolsCreate(proxyPoolRequest)


### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration,
    ProxyPoolRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let proxyPoolRequest: ProxyPoolRequest; //

const { status, data } = await apiInstance.proxyPoolsCreate(
    proxyPoolRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyPoolRequest** | **ProxyPoolRequest**|  | |


### Return type

**ProxyPool**

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
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxyPoolsDelete**
> ProxyPoolDeleteResponse proxyPoolsDelete()


### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; // (default to undefined)

const { status, data } = await apiInstance.proxyPoolsDelete(
    poolId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **poolId** | [**string**] |  | defaults to undefined|


### Return type

**ProxyPoolDeleteResponse**

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

# **proxyPoolsList**
> Array<ProxyPool> proxyPoolsList()


### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

const { status, data } = await apiInstance.proxyPoolsList();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<ProxyPool>**

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
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **proxyPoolsRemoveProxy**
> ProxyPoolMembershipResponse proxyPoolsRemoveProxy()


### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; // (default to undefined)
let proxyId: string; // (default to undefined)

const { status, data } = await apiInstance.proxyPoolsRemoveProxy(
    poolId,
    proxyId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **poolId** | [**string**] |  | defaults to undefined|
| **proxyId** | [**string**] |  | defaults to undefined|


### Return type

**ProxyPoolMembershipResponse**

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

# **proxyPoolsUpdate**
> ProxyPool proxyPoolsUpdate(proxyPoolRequest)


### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration,
    ProxyPoolRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; // (default to undefined)
let proxyPoolRequest: ProxyPoolRequest; //

const { status, data } = await apiInstance.proxyPoolsUpdate(
    poolId,
    proxyPoolRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **proxyPoolRequest** | **ProxyPoolRequest**|  | |
| **poolId** | [**string**] |  | defaults to undefined|


### Return type

**ProxyPool**

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
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

