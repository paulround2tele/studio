# DomainGenerationApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**getPatternOffset**](#getpatternoffset) | **POST** /domain-generation/pattern-offset | Get pattern offset|

# **getPatternOffset**
> GetCampaignDetails200Response getPatternOffset()

Post domain-generation endpoint

### Example

```typescript
import {
    DomainGenerationApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DomainGenerationApi(configuration);

const { status, data } = await apiInstance.getPatternOffset();
```

### Parameters
This endpoint does not have any parameters.


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

