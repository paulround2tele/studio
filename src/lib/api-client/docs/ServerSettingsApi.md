# ServerSettingsApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**serverAuthConfigGet**](#serverauthconfigget) | **GET** /server/auth-config | Get authentication configuration|
|[**serverAuthConfigPut**](#serverauthconfigput) | **PUT** /server/auth-config | Update authentication configuration|
|[**serverConfigGet**](#serverconfigget) | **GET** /server/config | Get server configuration|
|[**serverConfigPut**](#serverconfigput) | **PUT** /server/config | Update server configuration|
|[**serverDnsConfigGet**](#serverdnsconfigget) | **GET** /server/dns-config | Get DNS configuration|
|[**serverDnsConfigPut**](#serverdnsconfigput) | **PUT** /server/dns-config | Update DNS configuration|
|[**serverHttpConfigGet**](#serverhttpconfigget) | **GET** /server/http-config | Get HTTP configuration|
|[**serverHttpConfigPut**](#serverhttpconfigput) | **PUT** /server/http-config | Update HTTP configuration|
|[**serverLoggingConfigGet**](#serverloggingconfigget) | **GET** /server/logging-config | Get logging configuration|
|[**serverLoggingConfigPut**](#serverloggingconfigput) | **PUT** /server/logging-config | Update logging configuration|
|[**serverProxyManagerConfigGet**](#serverproxymanagerconfigget) | **GET** /server/proxy-manager-config | Get proxy manager configuration|
|[**serverProxyManagerConfigPut**](#serverproxymanagerconfigput) | **PUT** /server/proxy-manager-config | Update proxy manager configuration|
|[**serverRateLimiterConfigGet**](#serverratelimiterconfigget) | **GET** /server/rate-limiter-config | Get rate limiter configuration|
|[**serverRateLimiterConfigPut**](#serverratelimiterconfigput) | **PUT** /server/rate-limiter-config | Update rate limiter configuration|
|[**serverWorkerConfigGet**](#serverworkerconfigget) | **GET** /server/worker-config | Get worker configuration|
|[**serverWorkerConfigPut**](#serverworkerconfigput) | **PUT** /server/worker-config | Update worker configuration|

# **serverAuthConfigGet**
> ApiAuthConfig serverAuthConfigGet()

Retrieve the current authentication configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.serverAuthConfigGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiAuthConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Authentication configuration |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverAuthConfigPut**
> ApiAuthConfig serverAuthConfigPut(apiAuthConfig)

Update the authentication configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ApiAuthConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let apiAuthConfig: ApiAuthConfig; //Authentication configuration

const { status, data } = await apiInstance.serverAuthConfigPut(
    apiAuthConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiAuthConfig** | **ApiAuthConfig**| Authentication configuration | |


### Return type

**ApiAuthConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated authentication configuration |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverConfigGet**
> ApiServerConfigResponse serverConfigGet()

Retrieve current server-wide configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.serverConfigGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiServerConfigResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Server configuration |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverConfigPut**
> ApiServerConfigResponse serverConfigPut(apiServerConfigUpdateRequest)

Update server-wide configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ApiServerConfigUpdateRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let apiServerConfigUpdateRequest: ApiServerConfigUpdateRequest; //Server configuration update

const { status, data } = await apiInstance.serverConfigPut(
    apiServerConfigUpdateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiServerConfigUpdateRequest** | **ApiServerConfigUpdateRequest**| Server configuration update | |


### Return type

**ApiServerConfigResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated server configuration |  -  |
|**400** | Invalid request payload |  -  |
|**500** | Failed to save server configuration |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverDnsConfigGet**
> ApiDNSValidatorConfigJSON serverDnsConfigGet()

Retrieve default DNS validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.serverDnsConfigGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiDNSValidatorConfigJSON**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | DNS validator configuration |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverDnsConfigPut**
> ApiDNSValidatorConfigJSON serverDnsConfigPut(apiDNSValidatorConfigJSON)

Update default DNS validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ApiDNSValidatorConfigJSON
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let apiDNSValidatorConfigJSON: ApiDNSValidatorConfigJSON; //DNS validator configuration

const { status, data } = await apiInstance.serverDnsConfigPut(
    apiDNSValidatorConfigJSON
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiDNSValidatorConfigJSON** | **ApiDNSValidatorConfigJSON**| DNS validator configuration | |


### Return type

**ApiDNSValidatorConfigJSON**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated DNS configuration |  -  |
|**400** | Invalid request body or validation failed |  -  |
|**500** | Failed to save DNS configuration |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverHttpConfigGet**
> ApiHTTPValidatorConfigJSON serverHttpConfigGet()

Retrieve default HTTP validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.serverHttpConfigGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiHTTPValidatorConfigJSON**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | HTTP validator configuration |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverHttpConfigPut**
> ApiHTTPValidatorConfigJSON serverHttpConfigPut(apiHTTPValidatorConfigJSON)

Update default HTTP validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ApiHTTPValidatorConfigJSON
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let apiHTTPValidatorConfigJSON: ApiHTTPValidatorConfigJSON; //HTTP validator configuration

const { status, data } = await apiInstance.serverHttpConfigPut(
    apiHTTPValidatorConfigJSON
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiHTTPValidatorConfigJSON** | **ApiHTTPValidatorConfigJSON**| HTTP validator configuration | |


### Return type

**ApiHTTPValidatorConfigJSON**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated HTTP configuration |  -  |
|**400** | Invalid request body or validation failed |  -  |
|**500** | Failed to save HTTP configuration |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverLoggingConfigGet**
> ApiLoggingConfig serverLoggingConfigGet()

Retrieve the current logging configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.serverLoggingConfigGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiLoggingConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Logging configuration |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverLoggingConfigPut**
> ApiLoggingConfig serverLoggingConfigPut(apiLoggingConfig)

Update the logging configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ApiLoggingConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let apiLoggingConfig: ApiLoggingConfig; //Logging configuration

const { status, data } = await apiInstance.serverLoggingConfigPut(
    apiLoggingConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiLoggingConfig** | **ApiLoggingConfig**| Logging configuration | |


### Return type

**ApiLoggingConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated logging configuration |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverProxyManagerConfigGet**
> ApiProxyManagerConfigJSON serverProxyManagerConfigGet()

Retrieve the current proxy manager configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.serverProxyManagerConfigGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiProxyManagerConfigJSON**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Proxy manager configuration |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverProxyManagerConfigPut**
> ApiProxyManagerConfigJSON serverProxyManagerConfigPut(apiProxyManagerConfigJSON)

Update the proxy manager configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ApiProxyManagerConfigJSON
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let apiProxyManagerConfigJSON: ApiProxyManagerConfigJSON; //Proxy manager configuration

const { status, data } = await apiInstance.serverProxyManagerConfigPut(
    apiProxyManagerConfigJSON
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiProxyManagerConfigJSON** | **ApiProxyManagerConfigJSON**| Proxy manager configuration | |


### Return type

**ApiProxyManagerConfigJSON**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated proxy manager configuration |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverRateLimiterConfigGet**
> ApiRateLimiterConfig serverRateLimiterConfigGet()

Retrieve the current rate limiter configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.serverRateLimiterConfigGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiRateLimiterConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Rate limiter configuration |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverRateLimiterConfigPut**
> ApiRateLimiterConfig serverRateLimiterConfigPut(apiRateLimiterConfig)

Update the rate limiter configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ApiRateLimiterConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let apiRateLimiterConfig: ApiRateLimiterConfig; //Rate limiter configuration

const { status, data } = await apiInstance.serverRateLimiterConfigPut(
    apiRateLimiterConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiRateLimiterConfig** | **ApiRateLimiterConfig**| Rate limiter configuration | |


### Return type

**ApiRateLimiterConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated rate limiter configuration |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverWorkerConfigGet**
> ApiWorkerConfig serverWorkerConfigGet()

Retrieve the current worker configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.serverWorkerConfigGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ApiWorkerConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Worker configuration |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **serverWorkerConfigPut**
> ApiWorkerConfig serverWorkerConfigPut(apiWorkerConfig)

Update the worker configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ApiWorkerConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let apiWorkerConfig: ApiWorkerConfig; //Worker configuration

const { status, data } = await apiInstance.serverWorkerConfigPut(
    apiWorkerConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiWorkerConfig** | **ApiWorkerConfig**| Worker configuration | |


### Return type

**ApiWorkerConfig**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated worker configuration |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

