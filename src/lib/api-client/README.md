## domainflow-api-client@1.0.0

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
npm install domainflow-api-client@1.0.0 --save
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
*CampaignsApi* | [**bulkDeleteCampaigns**](docs/CampaignsApi.md#bulkdeletecampaigns) | **POST** /campaigns/bulk-delete | Bulk delete campaigns
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
*CampaignsApi* | [**updateCampaign**](docs/CampaignsApi.md#updatecampaign) | **PUT** /campaigns/{campaignId} | Update campaign
*CampaignsApi* | [**validateDNSForCampaign**](docs/CampaignsApi.md#validatednsforcampaign) | **POST** /campaigns/{campaignId}/validate-dns | Validate DNS for campaign domains
*CampaignsApi* | [**validateHTTPForCampaign**](docs/CampaignsApi.md#validatehttpforcampaign) | **POST** /campaigns/{campaignId}/validate-http | Validate HTTP for campaign domains
*ConfigApi* | [**extractKeywords**](docs/ConfigApi.md#extractkeywords) | **POST** /extract-keywords | Extract keywords
*ConfigApi* | [**getServerSettings**](docs/ConfigApi.md#getserversettings) | **GET** /settings | Get server settings
*ConfigApi* | [**healthCheck**](docs/ConfigApi.md#healthcheck) | **GET** /health | Health check
*ConfigApi* | [**webSocketConnection**](docs/ConfigApi.md#websocketconnection) | **GET** /ws | WebSocket connection
*KeywordSetsApi* | [**createKeywordSet**](docs/KeywordSetsApi.md#createkeywordset) | **POST** /keyword-sets | Create keyword set
*KeywordSetsApi* | [**deleteKeywordSet**](docs/KeywordSetsApi.md#deletekeywordset) | **DELETE** /keyword-sets/{keywordSetId} | Delete keyword set
*KeywordSetsApi* | [**getKeywordSet**](docs/KeywordSetsApi.md#getkeywordset) | **GET** /keyword-sets/{keywordSetId} | Get keyword set
*KeywordSetsApi* | [**listKeywordSets**](docs/KeywordSetsApi.md#listkeywordsets) | **GET** /keyword-sets | List keyword sets
*KeywordSetsApi* | [**updateKeywordSet**](docs/KeywordSetsApi.md#updatekeywordset) | **PUT** /keyword-sets/{keywordSetId} | Update keyword set
*PersonasApi* | [**createPersona**](docs/PersonasApi.md#createpersona) | **POST** /personas | Create persona
*PersonasApi* | [**deletePersona**](docs/PersonasApi.md#deletepersona) | **DELETE** /personas/{personaId} | Delete persona
*PersonasApi* | [**getDnsPersonaByID**](docs/PersonasApi.md#getdnspersonabyid) | **GET** /personas/{personaId}/dns | Get DNS persona by ID
*PersonasApi* | [**getHttpPersonaByID**](docs/PersonasApi.md#gethttppersonabyid) | **GET** /personas/{personaId}/http | Get HTTP persona by ID
*PersonasApi* | [**getPersonaByID**](docs/PersonasApi.md#getpersonabyid) | **GET** /personas/{personaId} | Get persona by ID
*PersonasApi* | [**listPersonas**](docs/PersonasApi.md#listpersonas) | **GET** /personas | List personas
*PersonasApi* | [**testPersona**](docs/PersonasApi.md#testpersona) | **POST** /personas/{personaId}/test | Test persona
*PersonasApi* | [**updatePersona**](docs/PersonasApi.md#updatepersona) | **PUT** /personas/{personaId} | Update persona
*ProxiesApi* | [**createProxy**](docs/ProxiesApi.md#createproxy) | **POST** /proxies | Create proxy
*ProxiesApi* | [**deleteProxy**](docs/ProxiesApi.md#deleteproxy) | **DELETE** /proxies/{proxyId} | Delete proxy
*ProxiesApi* | [**getProxy**](docs/ProxiesApi.md#getproxy) | **GET** /proxies/{proxyId} | Get proxy
*ProxiesApi* | [**listProxies**](docs/ProxiesApi.md#listproxies) | **GET** /proxies | List proxies
*ProxiesApi* | [**testProxy**](docs/ProxiesApi.md#testproxy) | **POST** /proxies/{proxyId}/test | Test proxy
*ProxiesApi* | [**updateProxy**](docs/ProxiesApi.md#updateproxy) | **PUT** /proxies/{proxyId} | Update proxy
*ProxyPoolsApi* | [**createProxyPool**](docs/ProxyPoolsApi.md#createproxypool) | **POST** /proxy-pools | Create proxy pool
*ProxyPoolsApi* | [**deleteProxyPool**](docs/ProxyPoolsApi.md#deleteproxypool) | **DELETE** /proxy-pools/{proxyPoolId} | Delete proxy pool
*ProxyPoolsApi* | [**getProxyPool**](docs/ProxyPoolsApi.md#getproxypool) | **GET** /proxy-pools/{proxyPoolId} | Get proxy pool
*ProxyPoolsApi* | [**listProxyPools**](docs/ProxyPoolsApi.md#listproxypools) | **GET** /proxy-pools | List proxy pools
*ProxyPoolsApi* | [**updateProxyPool**](docs/ProxyPoolsApi.md#updateproxypool) | **PUT** /proxy-pools/{proxyPoolId} | Update proxy pool


### Documentation For Models

 - [BulkDeleteRequest](docs/BulkDeleteRequest.md)
 - [BulkDeleteResponse](docs/BulkDeleteResponse.md)
 - [Campaign](docs/Campaign.md)
 - [CampaignOperationResponse](docs/CampaignOperationResponse.md)
 - [CampaignsResponse](docs/CampaignsResponse.md)
 - [ChangePasswordRequest](docs/ChangePasswordRequest.md)
 - [CreateKeywordSetRequest](docs/CreateKeywordSetRequest.md)
 - [CreatePersonaRequest](docs/CreatePersonaRequest.md)
 - [CreateProxyPoolRequest](docs/CreateProxyPoolRequest.md)
 - [CreateProxyRequest](docs/CreateProxyRequest.md)
 - [DNSValidationCampaignParams](docs/DNSValidationCampaignParams.md)
 - [DNSValidationResult](docs/DNSValidationResult.md)
 - [DNSValidationResultsResponse](docs/DNSValidationResultsResponse.md)
 - [DomainGenerationCampaignParams](docs/DomainGenerationCampaignParams.md)
 - [ErrorResponse](docs/ErrorResponse.md)
 - [ExtractedContentAnalysis](docs/ExtractedContentAnalysis.md)
 - [ExtractedContentItem](docs/ExtractedContentItem.md)
 - [GeneratedDomain](docs/GeneratedDomain.md)
 - [GeneratedDomainsResponse](docs/GeneratedDomainsResponse.md)
 - [GetDomainGenerationPatternOffset200Response](docs/GetDomainGenerationPatternOffset200Response.md)
 - [HTTPKeywordCampaignParams](docs/HTTPKeywordCampaignParams.md)
 - [HTTPKeywordResult](docs/HTTPKeywordResult.md)
 - [HTTPKeywordResultsResponse](docs/HTTPKeywordResultsResponse.md)
 - [HealthCheckResponse](docs/HealthCheckResponse.md)
 - [InPlaceDNSValidationRequest](docs/InPlaceDNSValidationRequest.md)
 - [InPlaceHTTPValidationRequest](docs/InPlaceHTTPValidationRequest.md)
 - [KeywordExtractionRequest](docs/KeywordExtractionRequest.md)
 - [KeywordExtractionResponse](docs/KeywordExtractionResponse.md)
 - [KeywordRule](docs/KeywordRule.md)
 - [KeywordSet](docs/KeywordSet.md)
 - [KeywordSetsResponse](docs/KeywordSetsResponse.md)
 - [LeadItem](docs/LeadItem.md)
 - [LoginRequest](docs/LoginRequest.md)
 - [LoginResponse](docs/LoginResponse.md)
 - [PatternOffsetRequest](docs/PatternOffsetRequest.md)
 - [Persona](docs/Persona.md)
 - [PersonasResponse](docs/PersonasResponse.md)
 - [ProxiesResponse](docs/ProxiesResponse.md)
 - [Proxy](docs/Proxy.md)
 - [ProxyPool](docs/ProxyPool.md)
 - [ProxyPoolsResponse](docs/ProxyPoolsResponse.md)
 - [ServerSettingsResponse](docs/ServerSettingsResponse.md)
 - [StandardAPIResponse](docs/StandardAPIResponse.md)
 - [TestPersonaRequest](docs/TestPersonaRequest.md)
 - [TestPersonaResponse](docs/TestPersonaResponse.md)
 - [TestProxyRequest](docs/TestProxyRequest.md)
 - [TestProxyResponse](docs/TestProxyResponse.md)
 - [UpdateCampaignRequest](docs/UpdateCampaignRequest.md)
 - [UpdateKeywordSetRequest](docs/UpdateKeywordSetRequest.md)
 - [UpdatePersonaRequest](docs/UpdatePersonaRequest.md)
 - [UpdateProxyPoolRequest](docs/UpdateProxyPoolRequest.md)
 - [UpdateProxyRequest](docs/UpdateProxyRequest.md)
 - [User](docs/User.md)
 - [WebSocketResponse](docs/WebSocketResponse.md)


<a id="documentation-for-authorization"></a>
## Documentation For Authorization


Authentication schemes defined for the API:
<a id="sessionAuth"></a>
### sessionAuth

- **Type**: API key
- **API key parameter name**: session
- **Location**: 

