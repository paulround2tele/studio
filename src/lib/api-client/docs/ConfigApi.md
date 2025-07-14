# ConfigApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**extractKeywords**](#extractkeywords) | **POST** /extract-keywords | Extract keywords|
|[**getServerSettings**](#getserversettings) | **GET** /settings | Get server settings|
|[**healthCheck**](#healthcheck) | **GET** /health | Health check|
|[**webSocketConnection**](#websocketconnection) | **GET** /ws | WebSocket connection|

# **extractKeywords**
> KeywordExtractionResponse extractKeywords(keywordExtractionRequest)

Extracts keywords from the provided text content

### Example

```typescript
import {
    ConfigApi,
    Configuration,
    KeywordExtractionRequest
} from 'domainflow-api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

let keywordExtractionRequest: KeywordExtractionRequest; //

const { status, data } = await apiInstance.extractKeywords(
    keywordExtractionRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **keywordExtractionRequest** | **KeywordExtractionRequest**|  | |


### Return type

**KeywordExtractionResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Keywords extracted successfully |  -  |
|**400** | Bad request |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getServerSettings**
> ServerSettingsResponse getServerSettings()

Retrieves current server configuration and settings

### Example

```typescript
import {
    ConfigApi,
    Configuration
} from 'domainflow-api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

const { status, data } = await apiInstance.getServerSettings();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**ServerSettingsResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Server settings retrieved successfully |  -  |
|**400** | Bad request |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **healthCheck**
> HealthCheckResponse healthCheck()

Returns the health status of the API server

### Example

```typescript
import {
    ConfigApi,
    Configuration
} from 'domainflow-api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

const { status, data } = await apiInstance.healthCheck();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**HealthCheckResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Health check successful |  -  |
|**400** | Bad request |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **webSocketConnection**
> webSocketConnection()

Establishes a WebSocket connection for real-time updates

### Example

```typescript
import {
    ConfigApi,
    Configuration
} from 'domainflow-api-client';

const configuration = new Configuration();
const apiInstance = new ConfigApi(configuration);

const { status, data } = await apiInstance.webSocketConnection();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**101** | WebSocket connection established |  -  |
|**400** | Bad request |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

