# LoginRequest

Login credentials

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**captchaToken** | **string** | CAPTCHA token for bot protection | [optional] [default to undefined]
**email** | **string** | User email address | [default to undefined]
**password** | **string** | User password (minimum 6 characters) | [default to undefined]
**rememberMe** | **boolean** | Whether to remember the user session | [optional] [default to undefined]

## Example

```typescript
import { LoginRequest } from './api';

const instance: LoginRequest = {
    captchaToken,
    email,
    password,
    rememberMe,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
