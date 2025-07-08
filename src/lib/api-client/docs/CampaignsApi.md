# CampaignsApi

All URIs are relative to *http://localhost:8080/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**bulkDeleteCampaigns**](#bulkdeletecampaigns) | **DELETE** /campaigns | Bulk delete campaigns|
|[**cancelCampaign**](#cancelcampaign) | **POST** /campaigns/{campaignId}/cancel | Cancel campaign|
|[**createCampaign**](#createcampaign) | **POST** /campaigns | Create campaign|
|[**deleteCampaign**](#deletecampaign) | **DELETE** /campaigns/{campaignId} | Delete campaign|
|[**getCampaignDetails**](#getcampaigndetails) | **GET** /campaigns/{campaignId} | Get campaign details|
|[**getDNSValidationResults**](#getdnsvalidationresults) | **GET** /campaigns/{campaignId}/results/dns-validation | Get DNS validation results|
|[**getGeneratedDomains**](#getgenerateddomains) | **GET** /campaigns/{campaignId}/results/generated-domains | Get generated domains|
|[**getHTTPKeywordResults**](#gethttpkeywordresults) | **GET** /campaigns/{campaignId}/results/http-keyword | Get HTTP keyword results|
|[**listCampaigns**](#listcampaigns) | **GET** /campaigns | List campaigns|
|[**pauseCampaign**](#pausecampaign) | **POST** /campaigns/{campaignId}/pause | Pause campaign|
|[**resumeCampaign**](#resumecampaign) | **POST** /campaigns/{campaignId}/resume | Resume campaign|
|[**startCampaign**](#startcampaign) | **POST** /campaigns/{campaignId}/start | Start campaign|
|[**validateDNSForCampaign**](#validatednsforcampaign) | **POST** /campaigns/{campaignId}/validate-dns | Validate DNS for campaign domains|
|[**validateHTTPForCampaign**](#validatehttpforcampaign) | **POST** /campaigns/{campaignId}/validate-http | Validate HTTP for campaign domains|

# **bulkDeleteCampaigns**
> BulkDeleteResponse bulkDeleteCampaigns(bulkDeleteRequest)

Permanently deletes multiple campaigns and all their associated data

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    BulkDeleteRequest
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let bulkDeleteRequest: BulkDeleteRequest; //

const { status, data } = await apiInstance.bulkDeleteCampaigns(
    bulkDeleteRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkDeleteRequest** | **BulkDeleteRequest**|  | |


### Return type

**BulkDeleteResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaigns bulk delete completed |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **cancelCampaign**
> CampaignOperationResponse cancelCampaign()

Cancels a campaign, setting it to cancelled status

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign UUID (default to undefined)

const { status, data } = await apiInstance.cancelCampaign(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign UUID | defaults to undefined|


### Return type

**CampaignOperationResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign cancelled successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**409** | Campaign is in an invalid state for this operation |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createCampaign**
> Campaign createCampaign(createCampaignRequest)

Creates a new campaign using unified endpoint supporting all campaign types

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    CreateCampaignRequest
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let createCampaignRequest: CreateCampaignRequest; //

const { status, data } = await apiInstance.createCampaign(
    createCampaignRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createCampaignRequest** | **CreateCampaignRequest**|  | |


### Return type

**Campaign**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Campaign created successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteCampaign**
> CampaignOperationResponse deleteCampaign()

Permanently deletes a campaign and all its associated data

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign UUID (default to undefined)

const { status, data } = await apiInstance.deleteCampaign(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign UUID | defaults to undefined|


### Return type

**CampaignOperationResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign deleted successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**409** | Campaign is in an invalid state for this operation |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCampaignDetails**
> CampaignDetailsResponse getCampaignDetails()

Gets detailed information about a campaign including type-specific parameters

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign UUID (default to undefined)

const { status, data } = await apiInstance.getCampaignDetails(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign UUID | defaults to undefined|


### Return type

**CampaignDetailsResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign details retrieved successfully |  -  |
|**400** | Bad request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getDNSValidationResults**
> DNSValidationResultsResponse getDNSValidationResults()

Gets DNS validation results for a DNS validation campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign UUID (default to undefined)
let limit: number; //Maximum number of results to return (optional) (default to 20)
let cursor: string; //Cursor for pagination (optional) (default to undefined)

const { status, data } = await apiInstance.getDNSValidationResults(
    campaignId,
    limit,
    cursor
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign UUID | defaults to undefined|
| **limit** | [**number**] | Maximum number of results to return | (optional) defaults to 20|
| **cursor** | [**string**] | Cursor for pagination | (optional) defaults to undefined|


### Return type

**DNSValidationResultsResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | DNS validation results retrieved successfully |  -  |
|**400** | Bad request |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getGeneratedDomains**
> GeneratedDomainsResponse getGeneratedDomains()

Gets generated domains for a domain generation campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign UUID (default to undefined)
let limit: number; //Maximum number of domains to return (optional) (default to 20)
let cursor: number; //Cursor for pagination (offset index) (optional) (default to 0)

const { status, data } = await apiInstance.getGeneratedDomains(
    campaignId,
    limit,
    cursor
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign UUID | defaults to undefined|
| **limit** | [**number**] | Maximum number of domains to return | (optional) defaults to 20|
| **cursor** | [**number**] | Cursor for pagination (offset index) | (optional) defaults to 0|


### Return type

**GeneratedDomainsResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Generated domains retrieved successfully |  -  |
|**400** | Bad request |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getHTTPKeywordResults**
> HTTPKeywordResultsResponse getHTTPKeywordResults()

Gets HTTP keyword validation results for an HTTP keyword validation campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign UUID (default to undefined)
let limit: number; //Maximum number of results to return (optional) (default to 20)
let cursor: string; //Cursor for pagination (optional) (default to undefined)

const { status, data } = await apiInstance.getHTTPKeywordResults(
    campaignId,
    limit,
    cursor
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign UUID | defaults to undefined|
| **limit** | [**number**] | Maximum number of results to return | (optional) defaults to 20|
| **cursor** | [**string**] | Cursor for pagination | (optional) defaults to undefined|


### Return type

**HTTPKeywordResultsResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | HTTP keyword results retrieved successfully |  -  |
|**400** | Bad request |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listCampaigns**
> CampaignListResponse listCampaigns()

Lists all campaigns with pagination and filtering support

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let limit: number; //Maximum number of campaigns to return (1-100) (optional) (default to 20)
let offset: number; //Number of campaigns to skip for pagination (optional) (default to 0)
let status: 'pending' | 'queued' | 'running' | 'pausing' | 'paused' | 'completed' | 'failed' | 'archived' | 'cancelled'; //Filter campaigns by status (optional) (default to undefined)
let type: 'domain_generation' | 'dns_validation' | 'http_keyword_validation'; //Filter campaigns by type (optional) (default to undefined)

const { status, data } = await apiInstance.listCampaigns(
    limit,
    offset,
    status,
    type
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] | Maximum number of campaigns to return (1-100) | (optional) defaults to 20|
| **offset** | [**number**] | Number of campaigns to skip for pagination | (optional) defaults to 0|
| **status** | [**&#39;pending&#39; | &#39;queued&#39; | &#39;running&#39; | &#39;pausing&#39; | &#39;paused&#39; | &#39;completed&#39; | &#39;failed&#39; | &#39;archived&#39; | &#39;cancelled&#39;**]**Array<&#39;pending&#39; &#124; &#39;queued&#39; &#124; &#39;running&#39; &#124; &#39;pausing&#39; &#124; &#39;paused&#39; &#124; &#39;completed&#39; &#124; &#39;failed&#39; &#124; &#39;archived&#39; &#124; &#39;cancelled&#39;>** | Filter campaigns by status | (optional) defaults to undefined|
| **type** | [**&#39;domain_generation&#39; | &#39;dns_validation&#39; | &#39;http_keyword_validation&#39;**]**Array<&#39;domain_generation&#39; &#124; &#39;dns_validation&#39; &#124; &#39;http_keyword_validation&#39;>** | Filter campaigns by type | (optional) defaults to undefined|


### Return type

**CampaignListResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaigns retrieved successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **pauseCampaign**
> CampaignOperationResponse pauseCampaign()

Pauses a running or queued campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign UUID (default to undefined)

const { status, data } = await apiInstance.pauseCampaign(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign UUID | defaults to undefined|


### Return type

**CampaignOperationResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign paused successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**409** | Campaign is in an invalid state for this operation |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **resumeCampaign**
> CampaignOperationResponse resumeCampaign()

Resumes a paused campaign by queuing it for execution

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign UUID (default to undefined)

const { status, data } = await apiInstance.resumeCampaign(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign UUID | defaults to undefined|


### Return type

**CampaignOperationResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign resumed successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**409** | Campaign is in an invalid state for this operation |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **startCampaign**
> CampaignOperationResponse startCampaign()

Starts a campaign by transitioning it from pending to queued status

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign UUID (default to undefined)

const { status, data } = await apiInstance.startCampaign(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign UUID | defaults to undefined|


### Return type

**CampaignOperationResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign queued for start |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**409** | Campaign is in an invalid state for this operation |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **validateDNSForCampaign**
> CampaignOperationResponse validateDNSForCampaign()

Triggers domain-centric DNS validation for all domains in a completed domain generation campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign UUID (default to undefined)

const { status, data } = await apiInstance.validateDNSForCampaign(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign UUID | defaults to undefined|


### Return type

**CampaignOperationResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | DNS validation started successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**409** | Campaign is in an invalid state for this operation |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **validateHTTPForCampaign**
> CampaignOperationResponse validateHTTPForCampaign()

Triggers domain-centric HTTP keyword validation for all domains in a completed DNS validation campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from 'api-client';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign UUID (default to undefined)

const { status, data } = await apiInstance.validateHTTPForCampaign(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign UUID | defaults to undefined|


### Return type

**CampaignOperationResponse**

### Authorization

[sessionAuth](../README.md#sessionAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | HTTP keyword validation started successfully |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Campaign not found |  -  |
|**409** | Campaign is in an invalid state for this operation |  -  |
|**500** | Internal server error |  -  |
|**0** |  |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

