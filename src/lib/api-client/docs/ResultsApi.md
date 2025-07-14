# ResultsApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getDNSValidationResults**](#getdnsvalidationresults) | **GET** /{campaignId}/results/dns-validation | Get dnsvalidation results|
|[**getGeneratedDomains**](#getgenerateddomains) | **GET** /{campaignId}/results/generated-domains | Get generated domains|
|[**getHTTPKeywordResults**](#gethttpkeywordresults) | **GET** /{campaignId}/results/http-keyword | Get httpkeyword results|

# **getDNSValidationResults**
> GetCampaignDetails200Response getDNSValidationResults()

Get results endpoint

### Example

```typescript
import {
    ResultsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ResultsApi(configuration);

let campaignId: string; //CampaignId UUID (default to undefined)

const { status, data } = await apiInstance.getDNSValidationResults(
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

# **getGeneratedDomains**
> GetCampaignDetails200Response getGeneratedDomains()

Get results endpoint

### Example

```typescript
import {
    ResultsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ResultsApi(configuration);

let campaignId: string; //CampaignId UUID (default to undefined)

const { status, data } = await apiInstance.getGeneratedDomains(
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

# **getHTTPKeywordResults**
> GetCampaignDetails200Response getHTTPKeywordResults()

Get results endpoint

### Example

```typescript
import {
    ResultsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new ResultsApi(configuration);

let campaignId: string; //CampaignId UUID (default to undefined)

const { status, data } = await apiInstance.getHTTPKeywordResults(
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

