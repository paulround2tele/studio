# WebSocketApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**connectWebSocket**](#connectwebsocket) | **GET** /api/v2/ws | WebSocket connection endpoint|

# **connectWebSocket**
> connectWebSocket()

Upgrades HTTP connection to WebSocket for real-time communication

### Example

```typescript
import {
    WebSocketApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new WebSocketApi(configuration);

const { status, data } = await apiInstance.connectWebSocket();
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
|**101** | Switching Protocols - WebSocket connection established |  -  |
|**400** | Bad Request - Cannot upgrade connection |  -  |
|**401** | Unauthorized - Invalid session |  -  |
|**403** | Forbidden - Invalid origin or security validation failed |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

