# UserAPI


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  | [default to undefined]
**email** | **string** |  | [default to undefined]
**emailVerified** | **boolean** |  | [optional] [default to undefined]
**firstName** | **string** |  | [default to undefined]
**lastName** | **string** |  | [default to undefined]
**avatarUrl** | **string** |  | [optional] [default to undefined]
**isActive** | **boolean** |  | [default to undefined]
**isLocked** | **boolean** |  | [default to undefined]
**lastLoginAt** | **string** |  | [optional] [default to undefined]
**lastLoginIp** | **string** |  | [optional] [default to undefined]
**mustChangePassword** | **boolean** |  | [default to undefined]
**mfaEnabled** | **boolean** |  | [default to undefined]
**mfaLastUsedAt** | **string** |  | [optional] [default to undefined]
**createdAt** | **string** |  | [default to undefined]
**updatedAt** | **string** |  | [default to undefined]
**name** | **string** |  | [default to undefined]
**roles** | **Array&lt;string&gt;** |  | [default to undefined]
**permissions** | **Array&lt;string&gt;** |  | [default to undefined]

## Example

```typescript
import { UserAPI } from '@domainflow/api-client';

const instance: UserAPI = {
    id,
    email,
    emailVerified,
    firstName,
    lastName,
    avatarUrl,
    isActive,
    isLocked,
    lastLoginAt,
    lastLoginIp,
    mustChangePassword,
    mfaEnabled,
    mfaLastUsedAt,
    createdAt,
    updatedAt,
    name,
    roles,
    permissions,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
