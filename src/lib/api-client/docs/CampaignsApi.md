# CampaignsApi

All URIs are relative to */api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**bulkDeleteCampaigns**](#bulkdeletecampaigns) | **DELETE** /campaigns | Bulk delete campaigns|
|[**cancelCampaign**](#cancelcampaign) | **POST** /campaigns/{campaignId}/cancel | Cancel campaign|
|[**createCampaign**](#createcampaign) | **POST** /campaigns | Create new campaign|
|[**deleteCampaign**](#deletecampaign) | **DELETE** /campaigns/{campaignId} | Delete campaign|
|[**getCampaignDetails**](#getcampaigndetails) | **GET** /campaigns/{campaignId} | Get campaign details|
|[**getDNSValidationResults**](#getdnsvalidationresults) | **GET** /campaigns/{campaignId}/results/dns-validation | Get DNS validation results|
|[**getGeneratedDomains**](#getgenerateddomains) | **GET** /campaigns/{campaignId}/results/generated-domains | Get generated domains|
|[**getHTTPKeywordResults**](#gethttpkeywordresults) | **GET** /campaigns/{campaignId}/results/http-keyword | Get HTTP keyword results|
|[**getPatternOffset**](#getpatternoffset) | **POST** /campaigns/domain-generation/pattern-offset | Get domain generation pattern offset|
|[**listCampaigns**](#listcampaigns) | **GET** /campaigns | List all campaigns|
|[**pauseCampaign**](#pausecampaign) | **POST** /campaigns/{campaignId}/pause | Pause campaign|
|[**resumeCampaign**](#resumecampaign) | **POST** /campaigns/{campaignId}/resume | Resume campaign|
|[**startCampaign**](#startcampaign) | **POST** /campaigns/{campaignId}/start | Start campaign|
|[**updateCampaign**](#updatecampaign) | **PUT** /campaigns/{campaignId} | Update campaign configuration|
|[**validateDNSForCampaign**](#validatednsforcampaign) | **POST** /campaigns/{campaignId}/validate-dns | Validate DNS for campaign|
|[**validateHTTPForCampaign**](#validatehttpforcampaign) | **POST** /campaigns/{campaignId}/validate-http | Validate HTTP for campaign|

# **bulkDeleteCampaigns**
> ApiBulkDeleteResult bulkDeleteCampaigns(apiBulkDeleteRequest)

Delete multiple campaigns in a single operation

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    ApiBulkDeleteRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let apiBulkDeleteRequest: ApiBulkDeleteRequest; //Bulk delete request with campaign IDs

const { status, data } = await apiInstance.bulkDeleteCampaigns(
    apiBulkDeleteRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiBulkDeleteRequest** | **ApiBulkDeleteRequest**| Bulk delete request with campaign IDs | |


### Return type

**ApiBulkDeleteResult**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk delete results |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **cancelCampaign**
> ApiCampaignOperationResponse cancelCampaign()

Cancel the execution of a campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)

const { status, data } = await apiInstance.cancelCampaign(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**ApiCampaignOperationResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign cancelled successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createCampaign**
> ApiCampaignOperationResponse createCampaign(servicesCreateCampaignRequest)

Create a new campaign with specified configuration parameters

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    ServicesCreateCampaignRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let servicesCreateCampaignRequest: ServicesCreateCampaignRequest; //Campaign creation request

const { status, data } = await apiInstance.createCampaign(
    servicesCreateCampaignRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **servicesCreateCampaignRequest** | **ServicesCreateCampaignRequest**| Campaign creation request | |


### Return type

**ApiCampaignOperationResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign created successfully |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteCampaign**
> ApiDeletionResponse deleteCampaign()

Delete a campaign and all associated data

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)

const { status, data } = await apiInstance.deleteCampaign(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**ApiDeletionResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign deleted successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCampaignDetails**
> ApiCampaignDetailsResponse getCampaignDetails()

Retrieve detailed information about a specific campaign including its configuration parameters

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let body: object; // (optional)

const { status, data } = await apiInstance.getCampaignDetails(
    campaignId,
    body
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **body** | **object**|  | |
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**ApiCampaignDetailsResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign details retrieved successfully |  -  |
|**400** | Invalid campaign ID format |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getDNSValidationResults**
> ServicesDNSValidationResultsResponse getDNSValidationResults()

Retrieve DNS validation results for a specific campaign with pagination support

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let limit: number; //Number of results to return (default: 20) (optional) (default to undefined)
let cursor: string; //Cursor for pagination (default: empty) (optional) (default to undefined)

const { status, data } = await apiInstance.getDNSValidationResults(
    campaignId,
    limit,
    cursor
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|
| **limit** | [**number**] | Number of results to return (default: 20) | (optional) defaults to undefined|
| **cursor** | [**string**] | Cursor for pagination (default: empty) | (optional) defaults to undefined|


### Return type

**ServicesDNSValidationResultsResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Paginated list of DNS validation results |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getGeneratedDomains**
> ServicesGeneratedDomainsResponse getGeneratedDomains()

Retrieve all generated domains for a specific campaign with pagination support

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let limit: number; //Number of domains to return (default: 20, max: 1000) (optional) (default to undefined)
let cursor: number; //Cursor for pagination (offset index, default: 0) (optional) (default to undefined)

const { status, data } = await apiInstance.getGeneratedDomains(
    campaignId,
    limit,
    cursor
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|
| **limit** | [**number**] | Number of domains to return (default: 20, max: 1000) | (optional) defaults to undefined|
| **cursor** | [**number**] | Cursor for pagination (offset index, default: 0) | (optional) defaults to undefined|


### Return type

**ServicesGeneratedDomainsResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Paginated list of generated domains |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getHTTPKeywordResults**
> ServicesHTTPKeywordResultsResponse getHTTPKeywordResults()

Retrieve HTTP keyword validation results for a specific campaign with pagination support

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let limit: number; //Number of results to return (default: 20) (optional) (default to undefined)
let cursor: string; //Cursor for pagination (default: empty) (optional) (default to undefined)

const { status, data } = await apiInstance.getHTTPKeywordResults(
    campaignId,
    limit,
    cursor
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|
| **limit** | [**number**] | Number of results to return (default: 20) | (optional) defaults to undefined|
| **cursor** | [**string**] | Cursor for pagination (default: empty) | (optional) defaults to undefined|


### Return type

**ServicesHTTPKeywordResultsResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Paginated list of HTTP keyword results |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getPatternOffset**
> { [key: string]: number; } getPatternOffset(apiPatternOffsetRequest)

Gets the current offset for a domain generation pattern to prevent duplicate domains across campaigns

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    ApiPatternOffsetRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let apiPatternOffsetRequest: ApiPatternOffsetRequest; //Pattern configuration

const { status, data } = await apiInstance.getPatternOffset(
    apiPatternOffsetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiPatternOffsetRequest** | **ApiPatternOffsetRequest**| Pattern configuration | |


### Return type

**{ [key: string]: number; }**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Current offset for the pattern |  -  |
|**400** | Invalid request parameters |  -  |
|**500** | Internal server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listCampaigns**
> ApiAPIResponse listCampaigns()

Retrieve a list of all campaigns with optional filtering and pagination

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let limit: number; //Maximum number of campaigns to return (optional) (default to 20)
let offset: number; //Number of campaigns to skip (optional) (default to 0)
let status: string; //Filter by campaign status (optional) (default to undefined)

const { status, data } = await apiInstance.listCampaigns(
    limit,
    offset,
    status
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **limit** | [**number**] | Maximum number of campaigns to return | (optional) defaults to 20|
| **offset** | [**number**] | Number of campaigns to skip | (optional) defaults to 0|
| **status** | [**string**] | Filter by campaign status | (optional) defaults to undefined|


### Return type

**ApiAPIResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | List of campaigns |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **pauseCampaign**
> ApiCampaignOperationResponse pauseCampaign()

Pause the execution of a running campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)

const { status, data } = await apiInstance.pauseCampaign(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**ApiCampaignOperationResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign paused successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **resumeCampaign**
> ApiCampaignOperationResponse resumeCampaign()

Resume the execution of a paused campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)

const { status, data } = await apiInstance.resumeCampaign(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**ApiCampaignOperationResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign resumed successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **startCampaign**
> ApiCampaignOperationResponse startCampaign()

Start the execution of a campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)

const { status, data } = await apiInstance.startCampaign(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**ApiCampaignOperationResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign started successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **updateCampaign**
> ModelsCampaign updateCampaign(servicesUpdateCampaignRequest)

Update an existing campaign\'s configuration parameters

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    ServicesUpdateCampaignRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let servicesUpdateCampaignRequest: ServicesUpdateCampaignRequest; //Campaign update request

const { status, data } = await apiInstance.updateCampaign(
    campaignId,
    servicesUpdateCampaignRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **servicesUpdateCampaignRequest** | **ServicesUpdateCampaignRequest**| Campaign update request | |
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**ModelsCampaign**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Campaign updated successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **validateDNSForCampaign**
> ApiValidationOperationResponse validateDNSForCampaign()

Trigger DNS validation for all domains in a specific campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    ApiDNSValidatorConfigJSON
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let apiDNSValidatorConfigJSON: ApiDNSValidatorConfigJSON; //DNS validation configuration (optional)

const { status, data } = await apiInstance.validateDNSForCampaign(
    campaignId,
    apiDNSValidatorConfigJSON
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiDNSValidatorConfigJSON** | **ApiDNSValidatorConfigJSON**| DNS validation configuration | |
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**ApiValidationOperationResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | DNS validation started successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **validateHTTPForCampaign**
> ApiValidationOperationResponse validateHTTPForCampaign()

Trigger HTTP keyword validation for all domains in a specific campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    ApiHTTPValidatorConfigJSON
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let apiHTTPValidatorConfigJSON: ApiHTTPValidatorConfigJSON; //HTTP validation configuration (optional)

const { status, data } = await apiInstance.validateHTTPForCampaign(
    campaignId,
    apiHTTPValidatorConfigJSON
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiHTTPValidatorConfigJSON** | **ApiHTTPValidatorConfigJSON**| HTTP validation configuration | |
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**ApiValidationOperationResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | HTTP validation started successfully |  -  |
|**400** | Bad Request |  -  |
|**404** | Campaign not found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

