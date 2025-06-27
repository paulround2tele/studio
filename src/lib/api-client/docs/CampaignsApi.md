# CampaignsApi

All URIs are relative to *http://localhost:8080*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiV2CampaignsCampaignIdCancelPost**](#apiv2campaignscampaignidcancelpost) | **POST** /api/v2/campaigns/{campaignId}/cancel | Cancel campaign|
|[**apiV2CampaignsCampaignIdChainPost**](#apiv2campaignscampaignidchainpost) | **POST** /api/v2/campaigns/{campaignId}/chain | Trigger chained phase|
|[**apiV2CampaignsCampaignIdDelete**](#apiv2campaignscampaigniddelete) | **DELETE** /api/v2/campaigns/{campaignId} | Delete campaign|
|[**apiV2CampaignsCampaignIdGet**](#apiv2campaignscampaignidget) | **GET** /api/v2/campaigns/{campaignId} | Get campaign details|
|[**apiV2CampaignsCampaignIdPausePost**](#apiv2campaignscampaignidpausepost) | **POST** /api/v2/campaigns/{campaignId}/pause | Pause campaign|
|[**apiV2CampaignsCampaignIdResultsDnsValidationGet**](#apiv2campaignscampaignidresultsdnsvalidationget) | **GET** /api/v2/campaigns/{campaignId}/results/dns-validation | DNS validation results|
|[**apiV2CampaignsCampaignIdResultsGeneratedDomainsGet**](#apiv2campaignscampaignidresultsgenerateddomainsget) | **GET** /api/v2/campaigns/{campaignId}/results/generated-domains | Generated domains|
|[**apiV2CampaignsCampaignIdResultsHttpKeywordGet**](#apiv2campaignscampaignidresultshttpkeywordget) | **GET** /api/v2/campaigns/{campaignId}/results/http-keyword | HTTP keyword results|
|[**apiV2CampaignsCampaignIdResumePost**](#apiv2campaignscampaignidresumepost) | **POST** /api/v2/campaigns/{campaignId}/resume | Resume campaign|
|[**apiV2CampaignsCampaignIdStartPost**](#apiv2campaignscampaignidstartpost) | **POST** /api/v2/campaigns/{campaignId}/start | Start campaign|
|[**apiV2CampaignsGet**](#apiv2campaignsget) | **GET** /api/v2/campaigns | List campaigns|
|[**apiV2CampaignsPost**](#apiv2campaignspost) | **POST** /api/v2/campaigns | Create campaign|

# **apiV2CampaignsCampaignIdCancelPost**
> apiV2CampaignsCampaignIdCancelPost()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

const { status, data } = await apiInstance.apiV2CampaignsCampaignIdCancelPost();
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
|**200** | Cancelled |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2CampaignsCampaignIdChainPost**
> apiV2CampaignsCampaignIdChainPost()

Manually trigger the next campaign in the automatic phase chain. Domain generation campaigns chain into DNS validation and HTTP keyword validation campaigns in sequence. 

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

const { status, data } = await apiInstance.apiV2CampaignsCampaignIdChainPost();
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
|**200** | Next phase queued |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2CampaignsCampaignIdDelete**
> apiV2CampaignsCampaignIdDelete()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)

const { status, data } = await apiInstance.apiV2CampaignsCampaignIdDelete(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|


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
|**204** | Deleted |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2CampaignsCampaignIdGet**
> CampaignAPI apiV2CampaignsCampaignIdGet()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)

const { status, data } = await apiInstance.apiV2CampaignsCampaignIdGet(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|


### Return type

**CampaignAPI**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Details |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2CampaignsCampaignIdPausePost**
> apiV2CampaignsCampaignIdPausePost()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

const { status, data } = await apiInstance.apiV2CampaignsCampaignIdPausePost();
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
|**200** | Paused |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2CampaignsCampaignIdResultsDnsValidationGet**
> apiV2CampaignsCampaignIdResultsDnsValidationGet()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

const { status, data } = await apiInstance.apiV2CampaignsCampaignIdResultsDnsValidationGet();
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
|**200** | Result list |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2CampaignsCampaignIdResultsGeneratedDomainsGet**
> apiV2CampaignsCampaignIdResultsGeneratedDomainsGet()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

const { status, data } = await apiInstance.apiV2CampaignsCampaignIdResultsGeneratedDomainsGet();
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
|**200** | Domain list |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2CampaignsCampaignIdResultsHttpKeywordGet**
> apiV2CampaignsCampaignIdResultsHttpKeywordGet()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

const { status, data } = await apiInstance.apiV2CampaignsCampaignIdResultsHttpKeywordGet();
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
|**200** | Result list |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2CampaignsCampaignIdResumePost**
> apiV2CampaignsCampaignIdResumePost()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

const { status, data } = await apiInstance.apiV2CampaignsCampaignIdResumePost();
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
|**200** | Resumed |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2CampaignsCampaignIdStartPost**
> apiV2CampaignsCampaignIdStartPost()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

const { status, data } = await apiInstance.apiV2CampaignsCampaignIdStartPost();
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
|**200** | Started |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2CampaignsGet**
> Array<CampaignAPI> apiV2CampaignsGet()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

const { status, data } = await apiInstance.apiV2CampaignsGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**Array<CampaignAPI>**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign list |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiV2CampaignsPost**
> CampaignAPI apiV2CampaignsPost(body)


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from '@domainflow/api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let body: object; //

const { status, data } = await apiInstance.apiV2CampaignsPost(
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |


### Return type

**CampaignAPI**

### Authorization

[SessionAuth](../README.md#SessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Campaign created |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

