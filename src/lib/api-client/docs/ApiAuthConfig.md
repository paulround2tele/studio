# ApiAuthConfig


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**accountLockDuration** | **number** | Session configuration | [optional] [default to undefined]
**bcryptCost** | **number** | Password security | [optional] [default to undefined]
**captchaThreshold** | **number** |  | [optional] [default to undefined]
**fromEmail** | **string** |  | [optional] [default to undefined]
**fromName** | **string** |  | [optional] [default to undefined]
**maxFailedAttempts** | **number** | Account lockout | [optional] [default to undefined]
**maxLoginAttempts** | **number** |  | [optional] [default to undefined]
**maxPasswordResetAttempts** | **number** |  | [optional] [default to undefined]
**passwordMinLength** | **number** |  | [optional] [default to undefined]
**pepperKey** | **string** |  | [optional] [default to undefined]
**rateLimitWindow** | **number** | Rate limiting | [optional] [default to undefined]
**recaptchaSecretKey** | **string** |  | [optional] [default to undefined]
**recaptchaSiteKey** | **string** | CAPTCHA configuration | [optional] [default to undefined]
**resetTokenExpiry** | **number** | Token configuration | [optional] [default to undefined]
**sessionCookieDomain** | **string** |  | [optional] [default to undefined]
**sessionCookieName** | **string** |  | [optional] [default to undefined]
**sessionCookieSecure** | **boolean** |  | [optional] [default to undefined]
**sessionDuration** | **number** | Session configuration | [optional] [default to undefined]
**sessionIdleTimeout** | **number** | Session configuration | [optional] [default to undefined]
**smtpHost** | **string** | Email configuration (for password reset) | [optional] [default to undefined]
**smtpPassword** | **string** |  | [optional] [default to undefined]
**smtpPort** | **number** |  | [optional] [default to undefined]
**smtpUsername** | **string** |  | [optional] [default to undefined]

## Example

```typescript
import { ApiAuthConfig } from './api';

const instance: ApiAuthConfig = {
    accountLockDuration,
    bcryptCost,
    captchaThreshold,
    fromEmail,
    fromName,
    maxFailedAttempts,
    maxLoginAttempts,
    maxPasswordResetAttempts,
    passwordMinLength,
    pepperKey,
    rateLimitWindow,
    recaptchaSecretKey,
    recaptchaSiteKey,
    resetTokenExpiry,
    sessionCookieDomain,
    sessionCookieName,
    sessionCookieSecure,
    sessionDuration,
    sessionIdleTimeout,
    smtpHost,
    smtpPassword,
    smtpPort,
    smtpUsername,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
