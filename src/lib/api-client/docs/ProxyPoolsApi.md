# ProxyPoolsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**addProxyToPoolGin**](#addproxytopoolgin) | **POST** /proxy-pools/{poolId}/proxies | Add proxy to pool|
|[**createProxyPoolGin**](#createproxypoolgin) | **POST** /proxy-pools | Create proxy pool|
|[**deleteProxyPoolGin**](#deleteproxypoolgin) | **DELETE** /proxy-pools/{poolId} | Delete proxy pool|
|[**listProxyPoolsGin**](#listproxypoolsgin) | **GET** /proxy-pools | List proxy pools|
|[**removeProxyFromPoolGin**](#removeproxyfrompoolgin) | **DELETE** /proxy-pools/{poolId}/proxies/{proxyId} | Remove proxy from pool|
|[**updateProxyPoolGin**](#updateproxypoolgin) | **PUT** /proxy-pools/{poolId} | Update proxy pool|

# **addProxyToPoolGin**
> ListCampaigns200Response addProxyToPoolGin()

Assign a proxy to a proxy pool with optional weight

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Proxy pool ID (default to undefined)

const { status, data } = await apiInstance.addProxyToPoolGin(
    poolId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **poolId** | [**string**] | Proxy pool ID | defaults to undefined|


### Return type

**ListCampaigns200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createProxyPoolGin**
> ListCampaigns200Response createProxyPoolGin()

Create a new proxy pool with configuration settings

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

const { status, data } = await apiInstance.createProxyPoolGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ListCampaigns200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteProxyPoolGin**
> StandardSuccessResponse deleteProxyPoolGin()

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

const { status, data } = await apiInstance.deleteProxyPoolGin(
    poolId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **poolId** | [**string**] | Proxy pool ID | defaults to undefined|


### Return type

**StandardSuccessResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listProxyPoolsGin**
> ListCampaigns200Response listProxyPoolsGin()

Retrieve all proxy pools with their associated proxies

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

const { status, data } = await apiInstance.listProxyPoolsGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ListCampaigns200Response**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **removeProxyFromPoolGin**
> ProxyPoolMembershipResponse removeProxyFromPoolGin()

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

const { status, data } = await apiInstance.removeProxyFromPoolGin(
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

**ProxyPoolMembershipResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateProxyPoolGin**
> ProxyPool updateProxyPoolGin()

Update an existing proxy pool configuration

### Example

```typescript
import {
    ProxyPoolsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ProxyPoolsApi(configuration);

let poolId: string; //Proxy pool ID (default to undefined)

const { status, data } = await apiInstance.updateProxyPoolGin(
    poolId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **poolId** | [**string**] | Proxy pool ID | defaults to undefined|


### Return type

**ProxyPool**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

