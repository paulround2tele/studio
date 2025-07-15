# WebsocketApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**handleConnections**](#handleconnections) | **GET** /ws | WebSocket connection|

# **handleConnections**
> StreamExtractKeywords200Response handleConnections()

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

const { status, data } = await apiInstance.handleConnections(
    domainflowSession
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **domainflowSession** | [**string**] | Session cookie for authentication | (optional) defaults to undefined|


### Return type

**StreamExtractKeywords200Response**

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

