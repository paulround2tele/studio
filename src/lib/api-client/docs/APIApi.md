# APIApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**deleteCampaign**](#deletecampaign) | **DELETE** /{campaignId} | Delete campaign|
|[**getCampaignDetails**](#getcampaigndetails) | **GET** /{campaignId} | Get campaign details|
|[**updateCampaign**](#updatecampaign) | **PUT** /{campaignId} | Update campaign|

# **deleteCampaign**
> GetCampaignDetails200Response deleteCampaign()

Delete resource endpoint

### Example

```typescript
import {
    APIApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new APIApi(configuration);

let campaignId: string; //CampaignId UUID (default to undefined)

const { status, data } = await apiInstance.deleteCampaign(
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

# **getCampaignDetails**
> GetCampaignDetails200Response getCampaignDetails()

Get resource endpoint

### Example

```typescript
import {
    APIApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new APIApi(configuration);

let campaignId: string; //CampaignId UUID (default to undefined)

const { status, data } = await apiInstance.getCampaignDetails(
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

# **updateCampaign**
> GetCampaignDetails200Response updateCampaign()

Put resource endpoint

### Example

```typescript
import {
    APIApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new APIApi(configuration);

let campaignId: string; //CampaignId UUID (default to undefined)

const { status, data } = await apiInstance.updateCampaign(
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

