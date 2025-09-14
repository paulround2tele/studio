# CampaignsApi

All URIs are relative to *https://api.domainflow.dev/api/v2*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**allocateBulkResources**](#allocatebulkresources) | **POST** /campaigns/bulk/resources/allocate | Allocate bulk operation resources|
|[**bulkAnalyzeDomains**](#bulkanalyzedomains) | **POST** /campaigns/bulk/domains/analyze | Bulk domain analysis|
|[**bulkGenerateDomains**](#bulkgeneratedomains) | **POST** /campaigns/bulk/domains/generate | Bulk domain generation|
|[**bulkValidateDNS**](#bulkvalidatedns) | **POST** /campaigns/bulk/domains/validate-dns | Bulk DNS validation|
|[**bulkValidateHTTP**](#bulkvalidatehttp) | **POST** /campaigns/bulk/domains/validate-http | Bulk HTTP validation|
|[**campaignsBulkOperationsList**](#campaignsbulkoperationslist) | **GET** /campaigns/bulk/operations | List bulk operations|
|[**campaignsCreate**](#campaignscreate) | **POST** /campaigns | Create campaign|
|[**campaignsDelete**](#campaignsdelete) | **DELETE** /campaigns/{campaignId} | Delete campaign|
|[**campaignsDomainGenerationPatternOffset**](#campaignsdomaingenerationpatternoffset) | **POST** /campaigns/domain-generation/pattern-offset | Get current global pattern offset for domain generation config|
|[**campaignsDomainScoreBreakdown**](#campaignsdomainscorebreakdown) | **GET** /campaigns/{campaignId}/domains/{domain}/score-breakdown | Get component score breakdown for a single domain|
|[**campaignsDomainsList**](#campaignsdomainslist) | **GET** /campaigns/{campaignId}/domains | List generated domains for a campaign|
|[**campaignsEnrichedGet**](#campaignsenrichedget) | **GET** /campaigns/{campaignId}/enriched | Get enriched campaign details|
|[**campaignsGet**](#campaignsget) | **GET** /campaigns/{campaignId} | Get campaign|
|[**campaignsList**](#campaignslist) | **GET** /campaigns | List campaigns|
|[**campaignsModeUpdate**](#campaignsmodeupdate) | **PATCH** /campaigns/{campaignId}/mode | Update campaign execution mode|
|[**campaignsPhaseConfigsList**](#campaignsphaseconfigslist) | **GET** /campaigns/{campaignId}/configs | List stored phase configurations for a campaign|
|[**campaignsPhaseConfigure**](#campaignsphaseconfigure) | **POST** /campaigns/{campaignId}/phases/{phase}/configure | Configure campaign phase|
|[**campaignsPhaseExecutionDelete**](#campaignsphaseexecutiondelete) | **DELETE** /campaigns/{campaignId}/phase-executions/{phaseType} | Delete phase execution by phase type|
|[**campaignsPhaseExecutionGet**](#campaignsphaseexecutionget) | **GET** /campaigns/{campaignId}/phase-executions/{phaseType} | Get phase execution by phase type|
|[**campaignsPhaseExecutionPut**](#campaignsphaseexecutionput) | **PUT** /campaigns/{campaignId}/phase-executions/{phaseType} | Update phase execution by phase type|
|[**campaignsPhaseExecutionsList**](#campaignsphaseexecutionslist) | **GET** /campaigns/{campaignId}/phase-executions | Get campaign state and phase executions|
|[**campaignsPhaseStart**](#campaignsphasestart) | **POST** /campaigns/{campaignId}/phases/{phase}/start | Start campaign phase|
|[**campaignsPhaseStatus**](#campaignsphasestatus) | **GET** /campaigns/{campaignId}/phases/{phase}/status | Get phase status|
|[**campaignsPhaseStop**](#campaignsphasestop) | **POST** /campaigns/{campaignId}/phases/{phase}/stop | Stop campaign phase|
|[**campaignsProgress**](#campaignsprogress) | **GET** /campaigns/{campaignId}/progress | Get campaign progress|
|[**campaignsStateDelete**](#campaignsstatedelete) | **DELETE** /campaigns/{campaignId}/state | Delete campaign state|
|[**campaignsStateGet**](#campaignsstateget) | **GET** /campaigns/{campaignId}/state | Get campaign state|
|[**campaignsStatePut**](#campaignsstateput) | **PUT** /campaigns/{campaignId}/state | Update campaign state|
|[**campaignsUpdate**](#campaignsupdate) | **PUT** /campaigns/{campaignId} | Update campaign|
|[**cancelBulkOperation**](#cancelbulkoperation) | **POST** /campaigns/bulk/operations/{operationId}/cancel | Cancel bulk operation|
|[**getBulkOperationStatus**](#getbulkoperationstatus) | **GET** /campaigns/bulk/operations/{operationId}/status | Get bulk operation status|
|[**getBulkResourceStatus**](#getbulkresourcestatus) | **GET** /campaigns/bulk/resources/status/{allocationId} | Get bulk resource allocation status|

# **allocateBulkResources**
> AllocateBulkResources200Response allocateBulkResources(bulkResourceAllocationRequest)


### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    BulkResourceAllocationRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let bulkResourceAllocationRequest: BulkResourceAllocationRequest; //

const { status, data } = await apiInstance.allocateBulkResources(
    bulkResourceAllocationRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkResourceAllocationRequest** | **BulkResourceAllocationRequest**|  | |


### Return type

**AllocateBulkResources200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk resources allocated successfully |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **bulkAnalyzeDomains**
> BulkAnalyzeDomains200Response bulkAnalyzeDomains(bulkAnalyticsRequest)


### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    BulkAnalyticsRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let bulkAnalyticsRequest: BulkAnalyticsRequest; //

const { status, data } = await apiInstance.bulkAnalyzeDomains(
    bulkAnalyticsRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkAnalyticsRequest** | **BulkAnalyticsRequest**|  | |


### Return type

**BulkAnalyzeDomains200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk domain analysis initiated successfully |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **bulkGenerateDomains**
> BulkGenerateDomains200Response bulkGenerateDomains(bulkDomainGenerationRequest)


### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    BulkDomainGenerationRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let bulkDomainGenerationRequest: BulkDomainGenerationRequest; //

const { status, data } = await apiInstance.bulkGenerateDomains(
    bulkDomainGenerationRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkDomainGenerationRequest** | **BulkDomainGenerationRequest**|  | |


### Return type

**BulkGenerateDomains200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk domain generation initiated successfully |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **bulkValidateDNS**
> BulkValidateDNS200Response bulkValidateDNS(bulkDNSValidationRequest)


### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    BulkDNSValidationRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let bulkDNSValidationRequest: BulkDNSValidationRequest; //

const { status, data } = await apiInstance.bulkValidateDNS(
    bulkDNSValidationRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkDNSValidationRequest** | **BulkDNSValidationRequest**|  | |


### Return type

**BulkValidateDNS200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk DNS validation initiated successfully |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **bulkValidateHTTP**
> BulkValidateDNS200Response bulkValidateHTTP(bulkHTTPValidationRequest)


### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    BulkHTTPValidationRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let bulkHTTPValidationRequest: BulkHTTPValidationRequest; //

const { status, data } = await apiInstance.bulkValidateHTTP(
    bulkHTTPValidationRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **bulkHTTPValidationRequest** | **BulkHTTPValidationRequest**|  | |


### Return type

**BulkValidateDNS200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk HTTP validation initiated successfully |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsBulkOperationsList**
> CampaignsBulkOperationsList200Response campaignsBulkOperationsList()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

const { status, data } = await apiInstance.campaignsBulkOperationsList();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**CampaignsBulkOperationsList200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsCreate**
> CampaignsCreate201Response campaignsCreate(createCampaignRequest)


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

const { status, data } = await apiInstance.campaignsCreate(
    createCampaignRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **createCampaignRequest** | **CreateCampaignRequest**|  | |


### Return type

**CampaignsCreate201Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**409** | Conflict |  -  |
|**422** | Validation Error |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsDelete**
> campaignsDelete()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)

const { status, data } = await apiInstance.campaignsDelete(
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

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | No Content |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsDomainGenerationPatternOffset**
> CampaignsDomainGenerationPatternOffset200Response campaignsDomainGenerationPatternOffset(patternOffsetRequest)


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

const { status, data } = await apiInstance.campaignsDomainGenerationPatternOffset(
    patternOffsetRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **patternOffsetRequest** | **PatternOffsetRequest**|  | |


### Return type

**CampaignsDomainGenerationPatternOffset200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsDomainScoreBreakdown**
> CampaignsDomainScoreBreakdown200Response campaignsDomainScoreBreakdown()

Recomputes the scoring component values for the specified domain using the stored feature vector and current (or default) scoring profile weights. Does not persist anything; purely diagnostic / transparency surface. If experimental tf-lite scoring is disabled the `tf_lite` key will still be present with value 0.

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)
let domain: string; // (default to undefined)

const { status, data } = await apiInstance.campaignsDomainScoreBreakdown(
    campaignId,
    domain
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|
| **domain** | [**string**] |  | defaults to undefined|


### Return type

**CampaignsDomainScoreBreakdown200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsDomainsList**
> CampaignsDomainsList200Response campaignsDomainsList()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)
let limit: number; // (optional) (default to 100)
let offset: number; // (optional) (default to 0)
let dnsStatus: 'pending' | 'ok' | 'error' | 'timeout'; //Filter domains whose authoritative DNS status matches (pending|ok|error|timeout) (optional) (default to undefined)
let httpStatus: 'pending' | 'ok' | 'error' | 'timeout'; //Filter domains whose authoritative HTTP status matches (pending|ok|error|timeout) (optional) (default to undefined)
let dnsReason: string; //Filter domains by DNS reason (exact match). Example values: NXDOMAIN, SERVFAIL, REFUSED, NOANSWER, TIMEOUT, ERROR (optional) (default to undefined)
let httpReason: string; //Filter domains by HTTP reason (exact match). Example values: TIMEOUT, NOT_FOUND, UPSTREAM_5XX, PROXY_ERROR, TLS_ERROR, SSL_EXPIRED, CONNECTION_RESET, ERROR (optional) (default to undefined)
let minScore: number; //Minimum inclusive domain score to include (optional) (default to undefined)
let notParked: boolean; //Exclude domains detected as parked (optional) (default to undefined)
let hasContact: boolean; //Only include domains with detected contact signals (optional) (default to undefined)
let keyword: string; //Require at least one keyword match (any) (optional) (default to undefined)
let sort: 'score_desc' | 'score_asc' | 'last_http_fetched_at_desc'; //Sort ordering strategy (optional) (default to undefined)
let first: number; //Page size for cursor pagination (overrides limit when present) (optional) (default to undefined)
let after: string; //Cursor token to continue listing after (optional) (default to undefined)

const { status, data } = await apiInstance.campaignsDomainsList(
    campaignId,
    limit,
    offset,
    dnsStatus,
    httpStatus,
    dnsReason,
    httpReason,
    minScore,
    notParked,
    hasContact,
    keyword,
    sort,
    first,
    after
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|
| **limit** | [**number**] |  | (optional) defaults to 100|
| **offset** | [**number**] |  | (optional) defaults to 0|
| **dnsStatus** | [**&#39;pending&#39; | &#39;ok&#39; | &#39;error&#39; | &#39;timeout&#39;**]**Array<&#39;pending&#39; &#124; &#39;ok&#39; &#124; &#39;error&#39; &#124; &#39;timeout&#39;>** | Filter domains whose authoritative DNS status matches (pending|ok|error|timeout) | (optional) defaults to undefined|
| **httpStatus** | [**&#39;pending&#39; | &#39;ok&#39; | &#39;error&#39; | &#39;timeout&#39;**]**Array<&#39;pending&#39; &#124; &#39;ok&#39; &#124; &#39;error&#39; &#124; &#39;timeout&#39;>** | Filter domains whose authoritative HTTP status matches (pending|ok|error|timeout) | (optional) defaults to undefined|
| **dnsReason** | [**string**] | Filter domains by DNS reason (exact match). Example values: NXDOMAIN, SERVFAIL, REFUSED, NOANSWER, TIMEOUT, ERROR | (optional) defaults to undefined|
| **httpReason** | [**string**] | Filter domains by HTTP reason (exact match). Example values: TIMEOUT, NOT_FOUND, UPSTREAM_5XX, PROXY_ERROR, TLS_ERROR, SSL_EXPIRED, CONNECTION_RESET, ERROR | (optional) defaults to undefined|
| **minScore** | [**number**] | Minimum inclusive domain score to include | (optional) defaults to undefined|
| **notParked** | [**boolean**] | Exclude domains detected as parked | (optional) defaults to undefined|
| **hasContact** | [**boolean**] | Only include domains with detected contact signals | (optional) defaults to undefined|
| **keyword** | [**string**] | Require at least one keyword match (any) | (optional) defaults to undefined|
| **sort** | [**&#39;score_desc&#39; | &#39;score_asc&#39; | &#39;last_http_fetched_at_desc&#39;**]**Array<&#39;score_desc&#39; &#124; &#39;score_asc&#39; &#124; &#39;last_http_fetched_at_desc&#39;>** | Sort ordering strategy | (optional) defaults to undefined|
| **first** | [**number**] | Page size for cursor pagination (overrides limit when present) | (optional) defaults to undefined|
| **after** | [**string**] | Cursor token to continue listing after | (optional) defaults to undefined|


### Return type

**CampaignsDomainsList200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsEnrichedGet**
> CampaignsEnrichedGet200Response campaignsEnrichedGet()

Returns campaign with state and recent phase executions as a single enriched read model

### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)

const { status, data } = await apiInstance.campaignsEnrichedGet(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|


### Return type

**CampaignsEnrichedGet200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsGet**
> CampaignsCreate201Response campaignsGet()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)

const { status, data } = await apiInstance.campaignsGet(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|


### Return type

**CampaignsCreate201Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsList**
> CampaignsList200Response campaignsList()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

const { status, data } = await apiInstance.campaignsList();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**CampaignsList200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsModeUpdate**
> CampaignsModeUpdate200Response campaignsModeUpdate(campaignsModeUpdateRequest)


### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    CampaignsModeUpdateRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)
let campaignsModeUpdateRequest: CampaignsModeUpdateRequest; //

const { status, data } = await apiInstance.campaignsModeUpdate(
    campaignId,
    campaignsModeUpdateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignsModeUpdateRequest** | **CampaignsModeUpdateRequest**|  | |
| **campaignId** | [**string**] |  | defaults to undefined|


### Return type

**CampaignsModeUpdate200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Mode updated |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsPhaseConfigsList**
> CampaignsPhaseConfigsList200Response campaignsPhaseConfigsList()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)

const { status, data } = await apiInstance.campaignsPhaseConfigsList(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|


### Return type

**CampaignsPhaseConfigsList200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Phase configurations summary |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsPhaseConfigure**
> CampaignsPhaseStatus200Response campaignsPhaseConfigure(phaseConfigurationRequest)


### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    PhaseConfigurationRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)
let phase: 'discovery' | 'validation' | 'extraction' | 'analysis'; // (default to undefined)
let phaseConfigurationRequest: PhaseConfigurationRequest; //

const { status, data } = await apiInstance.campaignsPhaseConfigure(
    campaignId,
    phase,
    phaseConfigurationRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **phaseConfigurationRequest** | **PhaseConfigurationRequest**|  | |
| **campaignId** | [**string**] |  | defaults to undefined|
| **phase** | [**&#39;discovery&#39; | &#39;validation&#39; | &#39;extraction&#39; | &#39;analysis&#39;**]**Array<&#39;discovery&#39; &#124; &#39;validation&#39; &#124; &#39;extraction&#39; &#124; &#39;analysis&#39;>** |  | defaults to undefined|


### Return type

**CampaignsPhaseStatus200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Configured |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsPhaseExecutionDelete**
> campaignsPhaseExecutionDelete()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)
let phaseType: 'discovery' | 'validation' | 'extraction' | 'analysis'; // (default to undefined)

const { status, data } = await apiInstance.campaignsPhaseExecutionDelete(
    campaignId,
    phaseType
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|
| **phaseType** | [**&#39;discovery&#39; | &#39;validation&#39; | &#39;extraction&#39; | &#39;analysis&#39;**]**Array<&#39;discovery&#39; &#124; &#39;validation&#39; &#124; &#39;extraction&#39; &#124; &#39;analysis&#39;>** |  | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | No Content |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsPhaseExecutionGet**
> CampaignsPhaseExecutionGet200Response campaignsPhaseExecutionGet()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)
let phaseType: 'discovery' | 'validation' | 'extraction' | 'analysis'; // (default to undefined)

const { status, data } = await apiInstance.campaignsPhaseExecutionGet(
    campaignId,
    phaseType
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|
| **phaseType** | [**&#39;discovery&#39; | &#39;validation&#39; | &#39;extraction&#39; | &#39;analysis&#39;**]**Array<&#39;discovery&#39; &#124; &#39;validation&#39; &#124; &#39;extraction&#39; &#124; &#39;analysis&#39;>** |  | defaults to undefined|


### Return type

**CampaignsPhaseExecutionGet200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsPhaseExecutionPut**
> CampaignsPhaseExecutionGet200Response campaignsPhaseExecutionPut(phaseExecutionUpdate)


### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    PhaseExecutionUpdate
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)
let phaseType: 'discovery' | 'validation' | 'extraction' | 'analysis'; // (default to undefined)
let phaseExecutionUpdate: PhaseExecutionUpdate; //

const { status, data } = await apiInstance.campaignsPhaseExecutionPut(
    campaignId,
    phaseType,
    phaseExecutionUpdate
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **phaseExecutionUpdate** | **PhaseExecutionUpdate**|  | |
| **campaignId** | [**string**] |  | defaults to undefined|
| **phaseType** | [**&#39;discovery&#39; | &#39;validation&#39; | &#39;extraction&#39; | &#39;analysis&#39;**]**Array<&#39;discovery&#39; &#124; &#39;validation&#39; &#124; &#39;extraction&#39; &#124; &#39;analysis&#39;>** |  | defaults to undefined|


### Return type

**CampaignsPhaseExecutionGet200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsPhaseExecutionsList**
> CampaignsPhaseExecutionsList200Response campaignsPhaseExecutionsList()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)

const { status, data } = await apiInstance.campaignsPhaseExecutionsList(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|


### Return type

**CampaignsPhaseExecutionsList200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsPhaseStart**
> CampaignsPhaseStatus200Response campaignsPhaseStart()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)
let phase: 'discovery' | 'validation' | 'extraction' | 'analysis'; // (default to undefined)

const { status, data } = await apiInstance.campaignsPhaseStart(
    campaignId,
    phase
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|
| **phase** | [**&#39;discovery&#39; | &#39;validation&#39; | &#39;extraction&#39; | &#39;analysis&#39;**]**Array<&#39;discovery&#39; &#124; &#39;validation&#39; &#124; &#39;extraction&#39; &#124; &#39;analysis&#39;>** |  | defaults to undefined|


### Return type

**CampaignsPhaseStatus200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Started |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**409** | Missing downstream phase configurations (full_sequence mode gating) |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsPhaseStatus**
> CampaignsPhaseStatus200Response campaignsPhaseStatus()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)
let phase: 'discovery' | 'validation' | 'extraction' | 'analysis'; // (default to undefined)

const { status, data } = await apiInstance.campaignsPhaseStatus(
    campaignId,
    phase
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|
| **phase** | [**&#39;discovery&#39; | &#39;validation&#39; | &#39;extraction&#39; | &#39;analysis&#39;**]**Array<&#39;discovery&#39; &#124; &#39;validation&#39; &#124; &#39;extraction&#39; &#124; &#39;analysis&#39;>** |  | defaults to undefined|


### Return type

**CampaignsPhaseStatus200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsPhaseStop**
> CampaignsPhaseStatus200Response campaignsPhaseStop()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)
let phase: 'discovery' | 'validation' | 'extraction' | 'analysis'; // (default to undefined)

const { status, data } = await apiInstance.campaignsPhaseStop(
    campaignId,
    phase
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|
| **phase** | [**&#39;discovery&#39; | &#39;validation&#39; | &#39;extraction&#39; | &#39;analysis&#39;**]**Array<&#39;discovery&#39; &#124; &#39;validation&#39; &#124; &#39;extraction&#39; &#124; &#39;analysis&#39;>** |  | defaults to undefined|


### Return type

**CampaignsPhaseStatus200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Stopped |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsProgress**
> CampaignsProgress200Response campaignsProgress()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)

const { status, data } = await apiInstance.campaignsProgress(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|


### Return type

**CampaignsProgress200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsStateDelete**
> campaignsStateDelete()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)

const { status, data } = await apiInstance.campaignsStateDelete(
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

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | No Content |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsStateGet**
> CampaignsStateGet200Response campaignsStateGet()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)

const { status, data } = await apiInstance.campaignsStateGet(
    campaignId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignId** | [**string**] |  | defaults to undefined|


### Return type

**CampaignsStateGet200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsStatePut**
> CampaignsStateGet200Response campaignsStatePut(campaignStateUpdate)


### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    CampaignStateUpdate
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)
let campaignStateUpdate: CampaignStateUpdate; //

const { status, data } = await apiInstance.campaignsStatePut(
    campaignId,
    campaignStateUpdate
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **campaignStateUpdate** | **CampaignStateUpdate**|  | |
| **campaignId** | [**string**] |  | defaults to undefined|


### Return type

**CampaignsStateGet200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **campaignsUpdate**
> CampaignsCreate201Response campaignsUpdate(updateCampaignRequest)


### Example

```typescript
import {
    CampaignsApi,
    Configuration,
    UpdateCampaignRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let campaignId: string; // (default to undefined)
let updateCampaignRequest: UpdateCampaignRequest; //

const { status, data } = await apiInstance.campaignsUpdate(
    campaignId,
    updateCampaignRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **updateCampaignRequest** | **UpdateCampaignRequest**|  | |
| **campaignId** | [**string**] |  | defaults to undefined|


### Return type

**CampaignsCreate201Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **cancelBulkOperation**
> CancelBulkOperation200Response cancelBulkOperation()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let operationId: string; //Bulk operation ID to cancel (default to undefined)

const { status, data } = await apiInstance.cancelBulkOperation(
    operationId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **operationId** | [**string**] | Bulk operation ID to cancel | defaults to undefined|


### Return type

**CancelBulkOperation200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk operation cancelled successfully |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**403** | Forbidden |  -  |
|**404** | Not Found |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getBulkOperationStatus**
> GetBulkOperationStatus200Response getBulkOperationStatus()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let operationId: string; //Bulk operation ID (default to undefined)

const { status, data } = await apiInstance.getBulkOperationStatus(
    operationId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **operationId** | [**string**] | Bulk operation ID | defaults to undefined|


### Return type

**GetBulkOperationStatus200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Bulk operation status retrieved successfully |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **getBulkResourceStatus**
> GetBulkResourceStatus200Response getBulkResourceStatus()


### Example

```typescript
import {
    CampaignsApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new CampaignsApi(configuration);

let allocationId: string; //Resource allocation ID (default to undefined)

const { status, data } = await apiInstance.getBulkResourceStatus(
    allocationId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **allocationId** | [**string**] | Resource allocation ID | defaults to undefined|


### Return type

**GetBulkResourceStatus200Response**

### Authorization

[cookieAuth](../README.md#cookieAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Resource allocation status retrieved successfully |  -  |
|**400** | Bad Request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not Found |  -  |
|**429** | Rate limit exceeded |  * Retry-After - Seconds to wait before retrying <br>  |
|**500** | Internal Server Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

