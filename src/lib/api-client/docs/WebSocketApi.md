# WebSocketApi

All URIs are relative to *http://localhost:8080*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiV2BroadcastTestGet**](#apiv2broadcasttestget) | **GET** /api/v2/broadcast-test | Test WebSocket broadcast|
|[**apiV2WsGet**](#apiv2wsget) | **GET** /api/v2/ws | WebSocket connection|

# **apiV2BroadcastTestGet**
> apiV2BroadcastTestGet()


### Example

```typescript
import {
    WebSocketApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new WebSocketApi(configuration);

const { status, data } = await apiInstance.apiV2BroadcastTestGet();
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
|**200** | Broadcast initiated |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2WsGet**
> apiV2WsGet()

Establishes a persistent WebSocket connection for real-time, bidirectional communication. Used for live updates, notifications, or interactive commands. 

### Example

```typescript
import {
    WebSocketApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new WebSocketApi(configuration);

const { status, data } = await apiInstance.apiV2WsGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

void (empty response body)

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**101** | WebSocket connection established |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

