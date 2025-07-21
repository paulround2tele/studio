# CampaignsApi

All URIs are relative to *http://localhost*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**bulkDeleteCampaigns**](#bulkdeletecampaigns) | **DELETE** /campaigns | Bulk delete campaigns|
|[**cancelCampaign**](#cancelcampaign) | **POST** /campaigns/{campaignId}/cancel | Cancel campaign|
|[**configureDNSValidation**](#configurednsvalidation) | **POST** /campaigns/{campaignId}/configure-dns | Configure DNS validation phase|
|[**configureHTTPValidation**](#configurehttpvalidation) | **POST** /campaigns/{campaignId}/configure-http | Configure HTTP validation phase|
|[**createCampaign**](#createcampaign) | **POST** /campaigns | Create new campaign|
|[**deleteCampaign**](#deletecampaign) | **DELETE** /campaigns/{campaignId} | Delete campaign|
|[**getBulkDomains**](#getbulkdomains) | **POST** /campaigns/bulk/domains | Get bulk domain data|
|[**getBulkEnrichedCampaignData**](#getbulkenrichedcampaigndata) | **POST** /campaigns/bulk/enriched-data | Get bulk enriched campaign data|
|[**getBulkLeads**](#getbulkleads) | **POST** /campaigns/bulk/leads | Get bulk lead data|
|[**getBulkLogs**](#getbulklogs) | **POST** /campaigns/bulk/logs | Get bulk log data|
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
> BulkDeleteResult bulkDeleteCampaigns(bulkDeleteRequest)

Delete multiple campaigns in a single operation

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    BulkDeleteRequest
} from './api';

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

**BulkDeleteResult**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **cancelCampaign**
> CampaignOperationResponse cancelCampaign()

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

**CampaignOperationResponse**

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

# **configureDNSValidation**
> APIResponse configureDNSValidation(dNSPhaseConfigRequest)

Configure DNS validation phase for a campaign and transition to dns_validation phase

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    DNSPhaseConfigRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let dNSPhaseConfigRequest: DNSPhaseConfigRequest; //

const { status, data } = await apiInstance.configureDNSValidation(
    campaignId,
    dNSPhaseConfigRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **dNSPhaseConfigRequest** | **DNSPhaseConfigRequest**|  | |
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**APIResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **configureHTTPValidation**
> APIResponse configureHTTPValidation(hTTPPhaseConfigRequest)

Configure HTTP validation phase for a campaign and transition to http_validation phase

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    HTTPPhaseConfigRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let hTTPPhaseConfigRequest: HTTPPhaseConfigRequest; //

const { status, data } = await apiInstance.configureHTTPValidation(
    campaignId,
    hTTPPhaseConfigRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **hTTPPhaseConfigRequest** | **HTTPPhaseConfigRequest**|  | |
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**APIResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **createCampaign**
> CampaignOperationResponse createCampaign(createCampaignRequest)

Create a new campaign with specified configuration parameters

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    CreateCampaignRequest
} from './api';

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

**CampaignOperationResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **deleteCampaign**
> DeletionResponse deleteCampaign()

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

**DeletionResponse**

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

# **getBulkDomains**
> APIResponse getBulkDomains(bulkDomainsRequest)

Efficiently retrieve domain data for multiple campaigns

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    BulkDomainsRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let bulkDomainsRequest: BulkDomainsRequest; //

const { status, data } = await apiInstance.getBulkDomains(
    bulkDomainsRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkDomainsRequest** | **BulkDomainsRequest**|  | |


### Return type

**APIResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getBulkEnrichedCampaignData**
> APIResponse getBulkEnrichedCampaignData(bulkEnrichedDataRequest)

Efficiently retrieve enriched data for multiple campaigns in a single request for B2B scale

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    BulkEnrichedDataRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let bulkEnrichedDataRequest: BulkEnrichedDataRequest; //

const { status, data } = await apiInstance.getBulkEnrichedCampaignData(
    bulkEnrichedDataRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkEnrichedDataRequest** | **BulkEnrichedDataRequest**|  | |


### Return type

**APIResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getBulkLeads**
> APIResponse getBulkLeads(bulkLeadsRequest)

Efficiently retrieve lead data for multiple campaigns

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    BulkLeadsRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let bulkLeadsRequest: BulkLeadsRequest; //

const { status, data } = await apiInstance.getBulkLeads(
    bulkLeadsRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkLeadsRequest** | **BulkLeadsRequest**|  | |


### Return type

**APIResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getBulkLogs**
> APIResponse getBulkLogs(bulkLogsRequest)

Efficiently retrieve log data for multiple campaigns

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    BulkLogsRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let bulkLogsRequest: BulkLogsRequest; //

const { status, data } = await apiInstance.getBulkLogs(
    bulkLogsRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkLogsRequest** | **BulkLogsRequest**|  | |


### Return type

**APIResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getCampaignDetails**
> CampaignDetailsResponse getCampaignDetails()

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

const { status, data } = await apiInstance.getCampaignDetails(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**CampaignDetailsResponse**

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

# **getDNSValidationResults**
> DNSValidationResultsResponse getDNSValidationResults()

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

**DNSValidationResultsResponse**

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
> GeneratedDomainsResponse getGeneratedDomains()

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

**GeneratedDomainsResponse**

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
> HTTPKeywordResultsResponse getHTTPKeywordResults()

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

**HTTPKeywordResultsResponse**

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

# **getPatternOffset**
> StandardAPIResponse getPatternOffset(patternOffsetRequest)

Gets the current offset for a domain generation pattern to prevent duplicate domains across campaigns

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    PatternOffsetRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let patternOffsetRequest: PatternOffsetRequest; //

const { status, data } = await apiInstance.getPatternOffset(
    patternOffsetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **patternOffsetRequest** | **PatternOffsetRequest**|  | |


### Return type

**StandardAPIResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **listCampaigns**
> APIResponse listCampaigns()

Retrieve a list of all campaigns with optional filtering and pagination

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let limit: number; //Maximum number of campaigns to return (optional) (default to undefined)
let offset: number; //Number of campaigns to skip (optional) (default to undefined)
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
| **limit** | [**number**] | Maximum number of campaigns to return | (optional) defaults to undefined|
| **offset** | [**number**] | Number of campaigns to skip | (optional) defaults to undefined|
| **status** | [**string**] | Filter by campaign status | (optional) defaults to undefined|


### Return type

**APIResponse**

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

# **pauseCampaign**
> CampaignOperationResponse pauseCampaign()

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

**CampaignOperationResponse**

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

# **resumeCampaign**
> CampaignOperationResponse resumeCampaign()

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

**CampaignOperationResponse**

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

# **startCampaign**
> CampaignOperationResponse startCampaign()

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

**CampaignOperationResponse**

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
> Campaign updateCampaign(updateCampaignRequest)

Update an existing campaign\'s configuration parameters

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    UpdateCampaignRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let updateCampaignRequest: UpdateCampaignRequest; //

const { status, data } = await apiInstance.updateCampaign(
    campaignId,
    updateCampaignRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateCampaignRequest** | **UpdateCampaignRequest**|  | |
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**Campaign**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **validateDNSForCampaign**
> ValidationOperationResponse validateDNSForCampaign(dNSValidationAPIRequest)

Trigger DNS validation for all domains in a specific campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    DNSValidationAPIRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let dNSValidationAPIRequest: DNSValidationAPIRequest; //

const { status, data } = await apiInstance.validateDNSForCampaign(
    campaignId,
    dNSValidationAPIRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **dNSValidationAPIRequest** | **DNSValidationAPIRequest**|  | |
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**ValidationOperationResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **validateHTTPForCampaign**
> ValidationOperationResponse validateHTTPForCampaign(hTTPValidationRequest)

Trigger HTTP keyword validation for all domains in a specific campaign

### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    HTTPValidationRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; //Campaign ID (UUID) (default to undefined)
let hTTPValidationRequest: HTTPValidationRequest; //

const { status, data } = await apiInstance.validateHTTPForCampaign(
    campaignId,
    hTTPValidationRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **hTTPValidationRequest** | **HTTPValidationRequest**|  | |
| **campaignId** | [**string**] | Campaign ID (UUID) | defaults to undefined|


### Return type

**ValidationOperationResponse**

### Authorization

No authorization required

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Operation successful |  -  |
|**400** | Bad Request |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

