# SecurityContext


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**lastActivity** | **string** |  | [optional] [default to undefined]
**requiresPasswordChange** | **boolean** |  | [optional] [default to undefined]
**riskScore** | **number** |  | [optional] [default to undefined]
**sessionExpiry** | **string** |  | [optional] [default to undefined]
**sessionId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**userId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]

## Example

```typescript
import { SecurityContext } from './api';

const instance: SecurityContext = {
    lastActivity,
    requiresPasswordChange,
    riskScore,
    sessionExpiry,
    sessionId,
    userId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
