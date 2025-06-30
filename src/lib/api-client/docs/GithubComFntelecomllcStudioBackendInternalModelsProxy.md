# GithubComFntelecomllcStudioBackendInternalModelsProxy


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**address** | **string** | Full proxy address (e.g., \&#39;http://user:pass@host:port\&#39;) | [default to undefined]
**city** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**countryCode** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**createdAt** | **string** |  | [optional] [default to undefined]
**description** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**host** | [**SqlNullString**](SqlNullString.md) | Hostname or IP | [optional] [default to undefined]
**id** | **string** |  | [optional] [default to undefined]
**inputPassword** | [**SqlNullString**](SqlNullString.md) | For API input, to be hashed into PasswordHash | [optional] [default to undefined]
**inputUsername** | [**SqlNullString**](SqlNullString.md) | Fields for input/logic, not direct DB columns if already covered by Address or PasswordHash | [optional] [default to undefined]
**isEnabled** | **boolean** |  | [optional] [default to undefined]
**isHealthy** | **boolean** |  | [optional] [default to undefined]
**lastCheckedAt** | [**SqlNullTime**](SqlNullTime.md) | Timestamp of last health check | [optional] [default to undefined]
**lastStatus** | [**SqlNullString**](SqlNullString.md) | e.g., \&#39;Active\&#39;, \&#39;Inactive\&#39;, \&#39;Error\&#39; | [optional] [default to undefined]
**latencyMs** | [**SqlNullInt32**](SqlNullInt32.md) | Last measured latency | [optional] [default to undefined]
**name** | **string** |  | [default to undefined]
**port** | [**SqlNullInt32**](SqlNullInt32.md) | Port number | [optional] [default to undefined]
**protocol** | [**GithubComFntelecomllcStudioBackendInternalModelsProxyProtocolEnum**](GithubComFntelecomllcStudioBackendInternalModelsProxyProtocolEnum.md) |  | [optional] [default to undefined]
**provider** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**updatedAt** | **string** |  | [optional] [default to undefined]
**username** | [**SqlNullString**](SqlNullString.md) | Username for proxy auth, from DB | [optional] [default to undefined]

## Example

```typescript
import { GithubComFntelecomllcStudioBackendInternalModelsProxy } from '@domainflow/api-client';

const instance: GithubComFntelecomllcStudioBackendInternalModelsProxy = {
    address,
    city,
    countryCode,
    createdAt,
    description,
    host,
    id,
    inputPassword,
    inputUsername,
    isEnabled,
    isHealthy,
    lastCheckedAt,
    lastStatus,
    latencyMs,
    name,
    port,
    protocol,
    provider,
    updatedAt,
    username,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
