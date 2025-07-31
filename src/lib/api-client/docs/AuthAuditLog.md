# AuthAuditLog


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**createdAt** | **string** |  | [optional] [default to undefined]
**details** | **string** |  | [optional] [default to undefined]
**eventStatus** | **string** |  | [optional] [default to undefined]
**eventType** | **string** |  | [optional] [default to undefined]
**id** | **number** |  | [optional] [default to undefined]
**ipAddress** | **string** |  | [optional] [default to undefined]
**riskScore** | **number** |  | [optional] [default to undefined]
**securityFlags** | **string** |  | [optional] [default to undefined]
**sessionFingerprint** | **string** |  | [optional] [default to undefined]
**sessionId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**userAgent** | **string** |  | [optional] [default to undefined]
**userId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]

## Example

```typescript
import { AuthAuditLog } from './api';

const instance: AuthAuditLog = {
    createdAt,
    details,
    eventStatus,
    eventType,
    id,
    ipAddress,
    riskScore,
    securityFlags,
    sessionFingerprint,
    sessionId,
    userAgent,
    userId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
