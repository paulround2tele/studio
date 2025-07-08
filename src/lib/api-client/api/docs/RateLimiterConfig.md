# RateLimiterConfig

Rate limiter configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**maxRequests** | **number** | Maximum requests per window | [default to undefined]
**windowSeconds** | **number** | Rate limit window in seconds | [default to undefined]

## Example

```typescript
import { RateLimiterConfig } from 'domainflow-api-client';

const instance: RateLimiterConfig = {
    maxRequests,
    windowSeconds,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
