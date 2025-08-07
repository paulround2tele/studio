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
> ConfigAuthConfig serverAuthConfigGet()

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

**ConfigAuthConfig**

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
> ConfigAuthConfig serverAuthConfigPut(configAuthConfig)

Update the authentication configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ConfigAuthConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let configAuthConfig: ConfigAuthConfig; //Authentication configuration

const { status, data } = await apiInstance.serverAuthConfigPut(
    configAuthConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **configAuthConfig** | **ConfigAuthConfig**| Authentication configuration | |


### Return type

**ConfigAuthConfig**

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
> ConfigDNSValidatorConfigJSON serverDnsConfigGet()

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

**ConfigDNSValidatorConfigJSON**

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
> ConfigDNSValidatorConfigJSON serverDnsConfigPut(configDNSValidatorConfigJSON)

Update default DNS validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ConfigDNSValidatorConfigJSON
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let configDNSValidatorConfigJSON: ConfigDNSValidatorConfigJSON; //DNS validator configuration

const { status, data } = await apiInstance.serverDnsConfigPut(
    configDNSValidatorConfigJSON
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **configDNSValidatorConfigJSON** | **ConfigDNSValidatorConfigJSON**| DNS validator configuration | |


### Return type

**ConfigDNSValidatorConfigJSON**

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
> ConfigHTTPValidatorConfigJSON serverHttpConfigGet()

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

**ConfigHTTPValidatorConfigJSON**

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
> ConfigHTTPValidatorConfigJSON serverHttpConfigPut(configHTTPValidatorConfigJSON)

Update default HTTP validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ConfigHTTPValidatorConfigJSON
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let configHTTPValidatorConfigJSON: ConfigHTTPValidatorConfigJSON; //HTTP validator configuration

const { status, data } = await apiInstance.serverHttpConfigPut(
    configHTTPValidatorConfigJSON
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **configHTTPValidatorConfigJSON** | **ConfigHTTPValidatorConfigJSON**| HTTP validator configuration | |


### Return type

**ConfigHTTPValidatorConfigJSON**

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
> ConfigLoggingConfig serverLoggingConfigGet()

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

**ConfigLoggingConfig**

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
> ConfigLoggingConfig serverLoggingConfigPut(configLoggingConfig)

Update the logging configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ConfigLoggingConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let configLoggingConfig: ConfigLoggingConfig; //Logging configuration

const { status, data } = await apiInstance.serverLoggingConfigPut(
    configLoggingConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **configLoggingConfig** | **ConfigLoggingConfig**| Logging configuration | |


### Return type

**ConfigLoggingConfig**

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
> ConfigProxyManagerConfigJSON serverProxyManagerConfigGet()

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

**ConfigProxyManagerConfigJSON**

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
> ConfigProxyManagerConfigJSON serverProxyManagerConfigPut(configProxyManagerConfigJSON)

Update the proxy manager configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ConfigProxyManagerConfigJSON
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let configProxyManagerConfigJSON: ConfigProxyManagerConfigJSON; //Proxy manager configuration

const { status, data } = await apiInstance.serverProxyManagerConfigPut(
    configProxyManagerConfigJSON
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **configProxyManagerConfigJSON** | **ConfigProxyManagerConfigJSON**| Proxy manager configuration | |


### Return type

**ConfigProxyManagerConfigJSON**

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
> ConfigRateLimiterConfig serverRateLimiterConfigGet()

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

**ConfigRateLimiterConfig**

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
> ConfigRateLimiterConfig serverRateLimiterConfigPut(configRateLimiterConfig)

Update the rate limiter configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ConfigRateLimiterConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let configRateLimiterConfig: ConfigRateLimiterConfig; //Rate limiter configuration

const { status, data } = await apiInstance.serverRateLimiterConfigPut(
    configRateLimiterConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **configRateLimiterConfig** | **ConfigRateLimiterConfig**| Rate limiter configuration | |


### Return type

**ConfigRateLimiterConfig**

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
> ConfigWorkerConfig serverWorkerConfigGet()

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

**ConfigWorkerConfig**

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
> ConfigWorkerConfig serverWorkerConfigPut(configWorkerConfig)

Update the worker configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration,
    ConfigWorkerConfig
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

let configWorkerConfig: ConfigWorkerConfig; //Worker configuration

const { status, data } = await apiInstance.serverWorkerConfigPut(
    configWorkerConfig
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **configWorkerConfig** | **ConfigWorkerConfig**| Worker configuration | |


### Return type

**ConfigWorkerConfig**

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

