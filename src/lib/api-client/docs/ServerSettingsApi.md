# ServerSettingsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getAuthConfigGin**](#getauthconfiggin) | **GET** /server/auth-config | Get authentication configuration|
|[**getDNSConfigGin**](#getdnsconfiggin) | **GET** /server/dns-config | Get DNS configuration|
|[**getHTTPConfigGin**](#gethttpconfiggin) | **GET** /server/http-config | Get HTTP configuration|
|[**getLoggingConfigGin**](#getloggingconfiggin) | **GET** /server/logging-config | Get logging configuration|
|[**getProxyManagerConfigGin**](#getproxymanagerconfiggin) | **GET** /server/proxy-manager-config | Get proxy manager configuration|
|[**getRateLimiterConfigGin**](#getratelimiterconfiggin) | **GET** /server/rate-limiter-config | Get rate limiter configuration|
|[**getServerConfigGin**](#getserverconfiggin) | **GET** /server/config | Get server configuration|
|[**getWorkerConfigGin**](#getworkerconfiggin) | **GET** /server/worker-config | Get worker configuration|
|[**updateAuthConfigGin**](#updateauthconfiggin) | **PUT** /server/auth-config | Update authentication configuration|
|[**updateDNSConfigGin**](#updatednsconfiggin) | **PUT** /server/dns-config | Update DNS configuration|
|[**updateHTTPConfigGin**](#updatehttpconfiggin) | **PUT** /server/http-config | Update HTTP configuration|
|[**updateLoggingConfigGin**](#updateloggingconfiggin) | **PUT** /server/logging-config | Update logging configuration|
|[**updateProxyManagerConfigGin**](#updateproxymanagerconfiggin) | **PUT** /server/proxy-manager-config | Update proxy manager configuration|
|[**updateRateLimiterConfigGin**](#updateratelimiterconfiggin) | **PUT** /server/rate-limiter-config | Update rate limiter configuration|
|[**updateServerConfigGin**](#updateserverconfiggin) | **PUT** /server/config | Update server configuration|
|[**updateWorkerConfigGin**](#updateworkerconfiggin) | **PUT** /server/worker-config | Update worker configuration|

# **getAuthConfigGin**
> string getAuthConfigGin()

Retrieve the current authentication configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getAuthConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

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

# **getDNSConfigGin**
> string getDNSConfigGin()

Retrieve default DNS validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getDNSConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

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

# **getHTTPConfigGin**
> string getHTTPConfigGin()

Retrieve default HTTP validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getHTTPConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

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

# **getLoggingConfigGin**
> string getLoggingConfigGin()

Retrieve the current logging configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getLoggingConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

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

# **getProxyManagerConfigGin**
> string getProxyManagerConfigGin()

Retrieve the current proxy manager configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getProxyManagerConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

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

# **getRateLimiterConfigGin**
> string getRateLimiterConfigGin()

Retrieve the current rate limiter configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getRateLimiterConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

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

# **getServerConfigGin**
> ServerConfigResponse getServerConfigGin()

Retrieve current server-wide configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getServerConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ServerConfigResponse**

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

# **getWorkerConfigGin**
> string getWorkerConfigGin()

Retrieve the current worker configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.getWorkerConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

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

# **updateAuthConfigGin**
> string updateAuthConfigGin()

Update the authentication configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.updateAuthConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

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

# **updateDNSConfigGin**
> string updateDNSConfigGin()

Update default DNS validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.updateDNSConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

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

# **updateHTTPConfigGin**
> string updateHTTPConfigGin()

Update default HTTP validator configuration

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.updateHTTPConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

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

# **updateLoggingConfigGin**
> string updateLoggingConfigGin()

Update the logging configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.updateLoggingConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

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

# **updateProxyManagerConfigGin**
> string updateProxyManagerConfigGin()

Update the proxy manager configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.updateProxyManagerConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

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

# **updateRateLimiterConfigGin**
> string updateRateLimiterConfigGin()

Update the rate limiter configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.updateRateLimiterConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

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

# **updateServerConfigGin**
> ServerConfigResponse updateServerConfigGin()

Update server-wide configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.updateServerConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ServerConfigResponse**

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

# **updateWorkerConfigGin**
> string updateWorkerConfigGin()

Update the worker configuration settings

### Example

```typescript
import {
    ServerSettingsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ServerSettingsApi(configuration);

const { status, data } = await apiInstance.updateWorkerConfigGin();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**string**

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

