# LoginResponse

Login response

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**expiresAt** | **string** | Session expiration time | [optional] [default to undefined]
**sessionId** | **string** | Session identifier | [optional] [default to undefined]
**user** | [**User**](User.md) |  | [optional] [default to undefined]

## Example

```typescript
import { LoginResponse } from 'domainflow-api-client';

const instance: LoginResponse = {
    expiresAt,
    sessionId,
    user,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
