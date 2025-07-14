# CancelApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**cancelCampaign**](#cancelcampaign) | **POST** /{campaignId}/cancel | Cancel campaign|

# **cancelCampaign**
> GetCampaignDetails200Response cancelCampaign()

Post cancel endpoint

### Example

```typescript
import {
    CancelApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CancelApi(configuration);

let campaignId: string; //CampaignId UUID (default to undefined)

const { status, data } = await apiInstance.cancelCampaign(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | CampaignId UUID | defaults to undefined|


### Return type

**GetCampaignDetails200Response**

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

