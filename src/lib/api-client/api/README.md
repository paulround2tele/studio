## domainflow-api-client@2.0.0

This generator creates TypeScript/JavaScript client that utilizes [axios](https://github.com/axios/axios). The generated Node module can be used in the following environments:

Environment
* Node.js
* Webpack
* Browserify

Language level
* ES5 - you must have a Promises/A+ library installed
* ES6

Module system
* CommonJS
* ES6 module system

It can be used in both TypeScript and JavaScript. In TypeScript, the definition will be automatically resolved via `package.json`. ([Reference](https://www.typescriptlang.org/docs/handbook/declaration-files/consumption.html))

### Building

To build and compile the typescript sources to javascript use:
```
npm install
npm run build
```

### Publishing

First build the package then run `npm publish`

### Consuming

navigate to the folder of your consuming project and run one of the following commands.

_published:_

```
npm install domainflow-api-client@2.0.0 --save
```

_unPublished (not recommended):_

```
npm install PATH_TO_GENERATED_PACKAGE --save
```

### Documentation for API Endpoints

All URIs are relative to */api/v2*

Class | Method | HTTP request | Description
------------ | ------------- | ------------- | -------------
*AuthApi* | [**changePassword**](docs/AuthApi.md#changepassword) | **POST** /change-password | Change password
*AuthApi* | [**getCurrentUser**](docs/AuthApi.md#getcurrentuser) | **GET** /me | Get current user
*AuthApi* | [**login**](docs/AuthApi.md#login) | **POST** /auth/login | User login
*AuthApi* | [**logout**](docs/AuthApi.md#logout) | **POST** /auth/logout | User logout
*AuthApi* | [**refreshSession**](docs/AuthApi.md#refreshsession) | **POST** /auth/refresh | Refresh session
*CampaignsApi* | [**bulkDeleteCampaigns**](docs/CampaignsApi.md#bulkdeletecampaigns) | **DELETE** /campaigns | Bulk delete campaigns
*CampaignsApi* | [**cancelCampaign**](docs/CampaignsApi.md#cancelcampaign) | **POST** /campaigns/{campaignId}/cancel | Cancel campaign
*CampaignsApi* | [**createCampaign**](docs/CampaignsApi.md#createcampaign) | **POST** /campaigns | Create campaign
*CampaignsApi* | [**deleteCampaign**](docs/CampaignsApi.md#deletecampaign) | **DELETE** /campaigns/{campaignId} | Delete campaign
*CampaignsApi* | [**getCampaignDetails**](docs/CampaignsApi.md#getcampaigndetails) | **GET** /campaigns/{campaignId} | Get campaign details
*CampaignsApi* | [**getDNSValidationResults**](docs/CampaignsApi.md#getdnsvalidationresults) | **GET** /campaigns/{campaignId}/results/dns-validation | Get DNS validation results
*CampaignsApi* | [**getDomainGenerationPatternOffset**](docs/CampaignsApi.md#getdomaingenerationpatternoffset) | **POST** /campaigns/domain-generation/pattern-offset | Get domain generation pattern offset
*CampaignsApi* | [**getGeneratedDomains**](docs/CampaignsApi.md#getgenerateddomains) | **GET** /campaigns/{campaignId}/results/generated-domains | Get generated domains
*CampaignsApi* | [**getHTTPKeywordResults**](docs/CampaignsApi.md#gethttpkeywordresults) | **GET** /campaigns/{campaignId}/results/http-keyword | Get HTTP keyword results
*CampaignsApi* | [**listCampaigns**](docs/CampaignsApi.md#listcampaigns) | **GET** /campaigns | List campaigns
*CampaignsApi* | [**pauseCampaign**](docs/CampaignsApi.md#pausecampaign) | **POST** /campaigns/{campaignId}/pause | Pause campaign
*CampaignsApi* | [**resumeCampaign**](docs/CampaignsApi.md#resumecampaign) | **POST** /campaigns/{campaignId}/resume | Resume campaign
*CampaignsApi* | [**startCampaign**](docs/CampaignsApi.md#startcampaign) | **POST** /campaigns/{campaignId}/start | Start campaign
*CampaignsApi* | [**validateDNSForCampaign**](docs/CampaignsApi.md#validatednsforcampaign) | **POST** /campaigns/{campaignId}/validate-dns | Validate DNS for campaign domains
*CampaignsApi* | [**validateHTTPForCampaign**](docs/CampaignsApi.md#validatehttpforcampaign) | **POST** /campaigns/{campaignId}/validate-http | Validate HTTP for campaign domains
*ConfigApi* | [**getFeatureFlags**](docs/ConfigApi.md#getfeatureflags) | **GET** /config/features | Get feature flags
*ConfigApi* | [**updateFeatureFlags**](docs/ConfigApi.md#updatefeatureflags) | **POST** /config/features | Update feature flags
*ConfigurationApi* | [**getAuthConfig**](docs/ConfigurationApi.md#getauthconfig) | **GET** /api/v2/config/auth | Get authentication configuration
*ConfigurationApi* | [**getDNSConfig**](docs/ConfigurationApi.md#getdnsconfig) | **GET** /api/v2/config/dns | Get DNS configuration
*ConfigurationApi* | [**getHTTPConfig**](docs/ConfigurationApi.md#gethttpconfig) | **GET** /api/v2/config/http | Get HTTP configuration
*ConfigurationApi* | [**getLoggingConfig**](docs/ConfigurationApi.md#getloggingconfig) | **GET** /api/v2/config/logging | Get logging configuration
*ConfigurationApi* | [**getProxyManagerConfig**](docs/ConfigurationApi.md#getproxymanagerconfig) | **GET** /api/v2/config/proxy-manager | Get proxy manager configuration
*ConfigurationApi* | [**getRateLimiterConfig**](docs/ConfigurationApi.md#getratelimiterconfig) | **GET** /api/v2/config/rate-limit | Get rate limiter configuration
*ConfigurationApi* | [**getServerConfig**](docs/ConfigurationApi.md#getserverconfig) | **GET** /api/v2/config/server | Get server configuration
*ConfigurationApi* | [**getWorkerConfig**](docs/ConfigurationApi.md#getworkerconfig) | **GET** /api/v2/config/worker | Get worker configuration
*ConfigurationApi* | [**updateAuthConfig**](docs/ConfigurationApi.md#updateauthconfig) | **POST** /api/v2/config/auth | Update authentication configuration
*ConfigurationApi* | [**updateDNSConfig**](docs/ConfigurationApi.md#updatednsconfig) | **POST** /api/v2/config/dns | Update DNS configuration
*ConfigurationApi* | [**updateHTTPConfig**](docs/ConfigurationApi.md#updatehttpconfig) | **POST** /api/v2/config/http | Update HTTP configuration
*ConfigurationApi* | [**updateLoggingConfig**](docs/ConfigurationApi.md#updateloggingconfig) | **POST** /api/v2/config/logging | Update logging configuration
*ConfigurationApi* | [**updateProxyManagerConfig**](docs/ConfigurationApi.md#updateproxymanagerconfig) | **POST** /api/v2/config/proxy-manager | Update proxy manager configuration
*ConfigurationApi* | [**updateRateLimiterConfig**](docs/ConfigurationApi.md#updateratelimiterconfig) | **POST** /api/v2/config/rate-limit | Update rate limiter configuration
*ConfigurationApi* | [**updateServerConfig**](docs/ConfigurationApi.md#updateserverconfig) | **PUT** /api/v2/config/server | Update server configuration
*ConfigurationApi* | [**updateWorkerConfig**](docs/ConfigurationApi.md#updateworkerconfig) | **POST** /api/v2/config/worker | Update worker configuration
*HealthApi* | [**getHealthCheck**](docs/HealthApi.md#gethealthcheck) | **GET** /health | Basic health check
*HealthApi* | [**getLivenessCheck**](docs/HealthApi.md#getlivenesscheck) | **GET** /health/live | Liveness probe
*HealthApi* | [**getReadinessCheck**](docs/HealthApi.md#getreadinesscheck) | **GET** /health/ready | Readiness probe
*KeywordSetsApi* | [**createKeywordSet**](docs/KeywordSetsApi.md#createkeywordset) | **POST** /keywords/sets | Create keyword set
*KeywordSetsApi* | [**deleteKeywordSet**](docs/KeywordSetsApi.md#deletekeywordset) | **DELETE** /keywords/sets/{setId} | Delete keyword set
*KeywordSetsApi* | [**getKeywordSet**](docs/KeywordSetsApi.md#getkeywordset) | **GET** /keywords/sets/{setId} | Get keyword set
*KeywordSetsApi* | [**listKeywordSets**](docs/KeywordSetsApi.md#listkeywordsets) | **GET** /keywords/sets | List keyword sets
*KeywordSetsApi* | [**updateKeywordSet**](docs/KeywordSetsApi.md#updatekeywordset) | **PUT** /keywords/sets/{setId} | Update keyword set
*KeywordsApi* | [**batchExtractKeywords**](docs/KeywordsApi.md#batchextractkeywords) | **POST** /api/v2/extract/keywords | Batch keyword extraction
*KeywordsApi* | [**streamExtractKeywords**](docs/KeywordsApi.md#streamextractkeywords) | **GET** /api/v2/extract/keywords/stream | Streaming keyword extraction
*PersonasApi* | [**createPersona**](docs/PersonasApi.md#createpersona) | **POST** /personas | Create persona
*PersonasApi* | [**deletePersona**](docs/PersonasApi.md#deletepersona) | **DELETE** /personas/{id} | Delete persona
*PersonasApi* | [**getDnsPersonaById**](docs/PersonasApi.md#getdnspersonabyid) | **GET** /personas/dns/{id} | Get DNS persona by ID
*PersonasApi* | [**getHttpPersonaById**](docs/PersonasApi.md#gethttppersonabyid) | **GET** /personas/http/{id} | Get HTTP persona by ID
*PersonasApi* | [**getPersonaById**](docs/PersonasApi.md#getpersonabyid) | **GET** /personas/{id} | Get persona by ID
*PersonasApi* | [**listPersonas**](docs/PersonasApi.md#listpersonas) | **GET** /personas | List personas
*PersonasApi* | [**testPersona**](docs/PersonasApi.md#testpersona) | **POST** /personas/{id}/test | Test persona
*PersonasApi* | [**updatePersona**](docs/PersonasApi.md#updatepersona) | **PUT** /personas/{id} | Update persona
*ProxiesApi* | [**createProxy**](docs/ProxiesApi.md#createproxy) | **POST** /proxies | Add proxy
*ProxiesApi* | [**deleteProxy**](docs/ProxiesApi.md#deleteproxy) | **DELETE** /proxies/{proxyId} | Delete proxy
*ProxiesApi* | [**forceCheckAllProxies**](docs/ProxiesApi.md#forcecheckallproxies) | **POST** /proxies/health-check | Force all proxies health check
*ProxiesApi* | [**forceCheckSingleProxy**](docs/ProxiesApi.md#forcechecksingleproxy) | **POST** /proxies/{proxyId}/health-check | Force single proxy health check
*ProxiesApi* | [**getProxyStatuses**](docs/ProxiesApi.md#getproxystatuses) | **GET** /proxies/status | Get proxy statuses
*ProxiesApi* | [**listProxies**](docs/ProxiesApi.md#listproxies) | **GET** /proxies | List proxies
*ProxiesApi* | [**testProxy**](docs/ProxiesApi.md#testproxy) | **POST** /proxies/{proxyId}/test | Test proxy
*ProxiesApi* | [**updateProxy**](docs/ProxiesApi.md#updateproxy) | **PUT** /proxies/{proxyId} | Update proxy
*ProxyPoolsApi* | [**addProxyToPool**](docs/ProxyPoolsApi.md#addproxytopool) | **POST** /proxy-pools/{poolId}/proxies | Add proxy to pool
*ProxyPoolsApi* | [**createProxyPool**](docs/ProxyPoolsApi.md#createproxypool) | **POST** /proxy-pools | Create proxy pool
*ProxyPoolsApi* | [**deleteProxyPool**](docs/ProxyPoolsApi.md#deleteproxypool) | **DELETE** /proxy-pools/{poolId} | Delete proxy pool
*ProxyPoolsApi* | [**listProxyPools**](docs/ProxyPoolsApi.md#listproxypools) | **GET** /proxy-pools | List proxy pools
*ProxyPoolsApi* | [**removeProxyFromPool**](docs/ProxyPoolsApi.md#removeproxyfrompool) | **DELETE** /proxy-pools/{poolId}/proxies/{proxyId} | Remove proxy from pool
*ProxyPoolsApi* | [**updateProxyPool**](docs/ProxyPoolsApi.md#updateproxypool) | **PUT** /proxy-pools/{poolId} | Update proxy pool
*UtilitiesApi* | [**ping**](docs/UtilitiesApi.md#ping) | **GET** /ping | Basic connectivity test
*WebSocketApi* | [**connectWebSocket**](docs/WebSocketApi.md#connectwebsocket) | **GET** /api/v2/ws | WebSocket connection endpoint


### Documentation For Models

 - [AddProxyToPoolRequest](docs/AddProxyToPoolRequest.md)
 - [AuthConfig](docs/AuthConfig.md)
 - [BatchKeywordExtractionRequest](docs/BatchKeywordExtractionRequest.md)
 - [BatchKeywordExtractionResponse](docs/BatchKeywordExtractionResponse.md)
 - [BulkDeleteRequest](docs/BulkDeleteRequest.md)
 - [BulkDeleteResponse](docs/BulkDeleteResponse.md)
 - [Campaign](docs/Campaign.md)
 - [CampaignDetailsResponse](docs/CampaignDetailsResponse.md)
 - [CampaignListResponse](docs/CampaignListResponse.md)
 - [CampaignOperationResponse](docs/CampaignOperationResponse.md)
 - [ChangePasswordRequest](docs/ChangePasswordRequest.md)
 - [ComponentStatus](docs/ComponentStatus.md)
 - [CookieHandling](docs/CookieHandling.md)
 - [CreateCampaignRequest](docs/CreateCampaignRequest.md)
 - [CreateKeywordSetRequest](docs/CreateKeywordSetRequest.md)
 - [CreatePersonaRequest](docs/CreatePersonaRequest.md)
 - [CreatePersonaRequestConfigDetails](docs/CreatePersonaRequestConfigDetails.md)
 - [CreateProxyRequest](docs/CreateProxyRequest.md)
 - [DNSConfig](docs/DNSConfig.md)
 - [DNSConfigDetails](docs/DNSConfigDetails.md)
 - [DNSValidationCampaignParams](docs/DNSValidationCampaignParams.md)
 - [DNSValidationResult](docs/DNSValidationResult.md)
 - [DNSValidationResultsResponse](docs/DNSValidationResultsResponse.md)
 - [DeleteProxyPool200Response](docs/DeleteProxyPool200Response.md)
 - [DnsPersonaConfig](docs/DnsPersonaConfig.md)
 - [DnsValidationParams](docs/DnsValidationParams.md)
 - [DomainGenerationCampaignParams](docs/DomainGenerationCampaignParams.md)
 - [DomainGenerationParams](docs/DomainGenerationParams.md)
 - [ErrorResponse](docs/ErrorResponse.md)
 - [ExtractedContentAnalysis](docs/ExtractedContentAnalysis.md)
 - [ExtractedContentItem](docs/ExtractedContentItem.md)
 - [FeatureFlags](docs/FeatureFlags.md)
 - [ForceCheckAllProxies202Response](docs/ForceCheckAllProxies202Response.md)
 - [ForceCheckProxiesRequest](docs/ForceCheckProxiesRequest.md)
 - [GeneratedDomain](docs/GeneratedDomain.md)
 - [GeneratedDomainsResponse](docs/GeneratedDomainsResponse.md)
 - [GetDomainGenerationPatternOffset200Response](docs/GetDomainGenerationPatternOffset200Response.md)
 - [HTTP2SettingsConfig](docs/HTTP2SettingsConfig.md)
 - [HTTPConfig](docs/HTTPConfig.md)
 - [HTTPConfigDetails](docs/HTTPConfigDetails.md)
 - [HTTPCookieHandling](docs/HTTPCookieHandling.md)
 - [HTTPKeywordCampaignParams](docs/HTTPKeywordCampaignParams.md)
 - [HTTPKeywordResult](docs/HTTPKeywordResult.md)
 - [HTTPKeywordResultsResponse](docs/HTTPKeywordResultsResponse.md)
 - [HealthStatus](docs/HealthStatus.md)
 - [HttpKeywordParams](docs/HttpKeywordParams.md)
 - [HttpPersonaConfig](docs/HttpPersonaConfig.md)
 - [KeywordExtractionAPIResult](docs/KeywordExtractionAPIResult.md)
 - [KeywordExtractionRequestItem](docs/KeywordExtractionRequestItem.md)
 - [KeywordExtractionResult](docs/KeywordExtractionResult.md)
 - [KeywordRule](docs/KeywordRule.md)
 - [KeywordRuleRequest](docs/KeywordRuleRequest.md)
 - [KeywordSet](docs/KeywordSet.md)
 - [LeadItem](docs/LeadItem.md)
 - [LoggingConfig](docs/LoggingConfig.md)
 - [LoginRequest](docs/LoginRequest.md)
 - [LoginResponse](docs/LoginResponse.md)
 - [PageInfo](docs/PageInfo.md)
 - [PaginationMetadata](docs/PaginationMetadata.md)
 - [PatternOffsetRequest](docs/PatternOffsetRequest.md)
 - [Persona](docs/Persona.md)
 - [PersonaListResponse](docs/PersonaListResponse.md)
 - [PersonaTestResult](docs/PersonaTestResult.md)
 - [PersonaTestResultData](docs/PersonaTestResultData.md)
 - [Ping200Response](docs/Ping200Response.md)
 - [Proxy](docs/Proxy.md)
 - [ProxyManagerConfig](docs/ProxyManagerConfig.md)
 - [ProxyPool](docs/ProxyPool.md)
 - [ProxyPoolMembership](docs/ProxyPoolMembership.md)
 - [ProxyPoolRequest](docs/ProxyPoolRequest.md)
 - [ProxyStatus](docs/ProxyStatus.md)
 - [ProxyTestResult](docs/ProxyTestResult.md)
 - [RateLimiterConfig](docs/RateLimiterConfig.md)
 - [RefreshResponse](docs/RefreshResponse.md)
 - [RemoveProxyFromPool200Response](docs/RemoveProxyFromPool200Response.md)
 - [ServerConfig](docs/ServerConfig.md)
 - [SimpleStatus](docs/SimpleStatus.md)
 - [StandardAPIResponse](docs/StandardAPIResponse.md)
 - [SystemInfo](docs/SystemInfo.md)
 - [TLSClientHello](docs/TLSClientHello.md)
 - [UpdateKeywordSetRequest](docs/UpdateKeywordSetRequest.md)
 - [UpdatePersonaRequest](docs/UpdatePersonaRequest.md)
 - [UpdateProxyRequest](docs/UpdateProxyRequest.md)
 - [User](docs/User.md)
 - [WorkerConfig](docs/WorkerConfig.md)


<a id="documentation-for-authorization"></a>
## Documentation For Authorization


Authentication schemes defined for the API:
<a id="sessionAuth"></a>
### sessionAuth

- **Type**: API key
- **API key parameter name**: session
- **Location**: 

