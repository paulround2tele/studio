# AuthConfig

Authentication configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**accountLockDuration** | **string** | Account lock duration (e.g., \&#39;15m\&#39;) | [optional] [default to undefined]
**bcryptCost** | **number** | BCrypt cost factor for password hashing | [optional] [default to undefined]
**captchaThreshold** | **number** | Number of failed attempts before requiring CAPTCHA | [optional] [default to undefined]
**fromEmail** | **string** | From email address for system emails | [optional] [default to undefined]
**fromName** | **string** | From name for system emails | [optional] [default to undefined]
**maxFailedAttempts** | **number** | Maximum failed login attempts before lockout | [optional] [default to undefined]
**maxLoginAttempts** | **number** | Maximum login attempts per rate limit window | [optional] [default to undefined]
**maxPasswordResetAttempts** | **number** | Maximum password reset attempts per rate limit window | [optional] [default to undefined]
**passwordMinLength** | **number** | Minimum password length requirement | [optional] [default to undefined]
**rateLimitWindow** | **string** | Rate limit window (e.g., \&#39;15m\&#39;) | [optional] [default to undefined]
**recaptchaSiteKey** | **string** | reCAPTCHA site key | [optional] [default to undefined]
**resetTokenExpiry** | **string** | Password reset token expiry (e.g., \&#39;15m\&#39;) | [optional] [default to undefined]
**sessionCookieDomain** | **string** | Session cookie domain | [optional] [default to undefined]
**sessionCookieName** | **string** | Session cookie name | [optional] [default to undefined]
**sessionCookieSecure** | **boolean** | Whether session cookie requires HTTPS | [optional] [default to undefined]
**sessionDuration** | **string** | Session duration (e.g., \&#39;120m\&#39;) | [optional] [default to undefined]
**sessionIdleTimeout** | **string** | Session idle timeout (e.g., \&#39;30m\&#39;) | [optional] [default to undefined]
**smtpHost** | **string** | SMTP server host | [optional] [default to undefined]
**smtpPort** | **number** | SMTP server port | [optional] [default to undefined]
**smtpUsername** | **string** | SMTP username | [optional] [default to undefined]

## Example

```typescript
import { AuthConfig } from 'domainflow-api-client';

const instance: AuthConfig = {
    accountLockDuration,
    bcryptCost,
    captchaThreshold,
    fromEmail,
    fromName,
    maxFailedAttempts,
    maxLoginAttempts,
    maxPasswordResetAttempts,
    passwordMinLength,
    rateLimitWindow,
    recaptchaSiteKey,
    resetTokenExpiry,
    sessionCookieDomain,
    sessionCookieName,
    sessionCookieSecure,
    sessionDuration,
    sessionIdleTimeout,
    smtpHost,
    smtpPort,
    smtpUsername,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
