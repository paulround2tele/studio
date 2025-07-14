# WebsocketApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**connectWebSocket**](#connectwebsocket) | **GET** /ws | WebSocket connection|

# **connectWebSocket**
> connectWebSocket()

Upgrade HTTP connection to WebSocket for real-time communication

### Example

```typescript
import {
    WebsocketApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new WebsocketApi(configuration);

let domainflowSession: string; //Session cookie for authentication (optional) (default to undefined)

const { status, data } = await apiInstance.connectWebSocket(
    domainflowSession
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **domainflowSession** | [**string**] | Session cookie for authentication | (optional) defaults to undefined|


### Return type

void (empty response body)

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**101** | WebSocket connection established |  -  |
|**401** | Authentication required |  -  |
|**403** | Invalid origin or session security validation failed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

