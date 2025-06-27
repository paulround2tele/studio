# ConfigApi

All URIs are relative to *http://localhost:8080*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiV2ConfigDnsGet**](#apiv2configdnsget) | **GET** /api/v2/config/dns | Get DNS config|
|[**apiV2ConfigDnsPost**](#apiv2configdnspost) | **POST** /api/v2/config/dns | Update DNS config|
|[**apiV2ConfigFeaturesGet**](#apiv2configfeaturesget) | **GET** /api/v2/config/features | Get feature flags|
|[**apiV2ConfigFeaturesPost**](#apiv2configfeaturespost) | **POST** /api/v2/config/features | Update feature flags|
|[**apiV2ConfigHttpGet**](#apiv2confighttpget) | **GET** /api/v2/config/http | Get HTTP config|
|[**apiV2ConfigHttpPost**](#apiv2confighttppost) | **POST** /api/v2/config/http | Update HTTP config|
|[**apiV2ConfigLoggingGet**](#apiv2configloggingget) | **GET** /api/v2/config/logging | Get logging config|
|[**apiV2ConfigLoggingPost**](#apiv2configloggingpost) | **POST** /api/v2/config/logging | Update logging config|
|[**apiV2ConfigServerGet**](#apiv2configserverget) | **GET** /api/v2/config/server | Get server config|
|[**apiV2ConfigServerPut**](#apiv2configserverput) | **PUT** /api/v2/config/server | Update server config|

# **apiV2ConfigDnsGet**
> apiV2ConfigDnsGet()


### Example

```typescript
import {
    ConfigApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

const { status, data } = await apiInstance.apiV2ConfigDnsGet();
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
|**200** | Config |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ConfigDnsPost**
> apiV2ConfigDnsPost(body)


### Example

```typescript
import {
    ConfigApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

let body: object; //

const { status, data } = await apiInstance.apiV2ConfigDnsPost(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ConfigFeaturesGet**
> apiV2ConfigFeaturesGet()


### Example

```typescript
import {
    ConfigApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

const { status, data } = await apiInstance.apiV2ConfigFeaturesGet();
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
|**200** | Config |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ConfigFeaturesPost**
> apiV2ConfigFeaturesPost(body)


### Example

```typescript
import {
    ConfigApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

let body: object; //

const { status, data } = await apiInstance.apiV2ConfigFeaturesPost(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ConfigHttpGet**
> apiV2ConfigHttpGet()


### Example

```typescript
import {
    ConfigApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

const { status, data } = await apiInstance.apiV2ConfigHttpGet();
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
|**200** | Config |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ConfigHttpPost**
> apiV2ConfigHttpPost(body)


### Example

```typescript
import {
    ConfigApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

let body: object; //

const { status, data } = await apiInstance.apiV2ConfigHttpPost(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ConfigLoggingGet**
> apiV2ConfigLoggingGet()


### Example

```typescript
import {
    ConfigApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

const { status, data } = await apiInstance.apiV2ConfigLoggingGet();
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
|**200** | Config |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ConfigLoggingPost**
> apiV2ConfigLoggingPost(body)


### Example

```typescript
import {
    ConfigApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

let body: object; //

const { status, data } = await apiInstance.apiV2ConfigLoggingPost(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ConfigServerGet**
> apiV2ConfigServerGet()


### Example

```typescript
import {
    ConfigApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

const { status, data } = await apiInstance.apiV2ConfigServerGet();
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
|**200** | Config |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2ConfigServerPut**
> apiV2ConfigServerPut(body)


### Example

```typescript
import {
    ConfigApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

let body: object; //

const { status, data } = await apiInstance.apiV2ConfigServerPut(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

