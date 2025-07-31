# LoginResponse


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**error** | **string** |  | [optional] [default to undefined]
**expiresAt** | **string** |  | [optional] [default to undefined]
**requires_captcha** | **boolean** |  | [optional] [default to undefined]
**sessionId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**success** | **boolean** |  | [optional] [default to undefined]
**user** | [**User**](User.md) |  | [optional] [default to undefined]

## Example

```typescript
import { LoginResponse } from './api';

const instance: LoginResponse = {
    error,
    expiresAt,
    requires_captcha,
    sessionId,
    success,
    user,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
