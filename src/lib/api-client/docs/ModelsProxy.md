# ModelsProxy


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**address** | **string** | Full proxy address (e.g., \&#39;http://user:pass@host:port\&#39;) | [default to undefined]
**city** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**countryCode** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**createdAt** | **string** |  | [optional] [default to undefined]
**description** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**failureCount** | [**SqlNullInt32**](SqlNullInt32.md) |  | [optional] [default to undefined]
**host** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**id** | **string** |  | [optional] [default to undefined]
**inputPassword** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**inputUsername** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**isEnabled** | **boolean** |  | [optional] [default to undefined]
**isHealthy** | **boolean** |  | [optional] [default to undefined]
**lastCheckedAt** | [**SqlNullTime**](SqlNullTime.md) |  | [optional] [default to undefined]
**lastError** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**lastStatus** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**lastTested** | [**SqlNullTime**](SqlNullTime.md) |  | [optional] [default to undefined]
**latencyMs** | [**SqlNullInt32**](SqlNullInt32.md) |  | [optional] [default to undefined]
**name** | **string** |  | [default to undefined]
**notes** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**port** | [**SqlNullInt32**](SqlNullInt32.md) |  | [optional] [default to undefined]
**protocol** | **string** |  | [optional] [default to undefined]
**provider** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]
**status** | **string** | Frontend-expected fields | [optional] [default to undefined]
**successCount** | [**SqlNullInt32**](SqlNullInt32.md) |  | [optional] [default to undefined]
**updatedAt** | **string** |  | [optional] [default to undefined]
**username** | [**SqlNullString**](SqlNullString.md) |  | [optional] [default to undefined]

## Example

```typescript
import { ModelsProxy } from './api';

const instance: ModelsProxy = {
    address,
    city,
    countryCode,
    createdAt,
    description,
    failureCount,
    host,
    id,
    inputPassword,
    inputUsername,
    isEnabled,
    isHealthy,
    lastCheckedAt,
    lastError,
    lastStatus,
    lastTested,
    latencyMs,
    name,
    notes,
    port,
    protocol,
    provider,
    status,
    successCount,
    updatedAt,
    username,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
