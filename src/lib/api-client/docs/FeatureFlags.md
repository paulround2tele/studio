# FeatureFlags

Feature flag settings

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**enableAnalytics** | **boolean** | Enable analytics feature | [optional] [default to undefined]
**enableDebugMode** | **boolean** | Enable debug mode feature | [optional] [default to undefined]
**enableOfflineMode** | **boolean** | Enable offline mode feature | [optional] [default to undefined]
**enableRealTimeUpdates** | **boolean** | Enable real-time updates feature | [optional] [default to undefined]

## Example

```typescript
import { FeatureFlags } from 'api-client';

const instance: FeatureFlags = {
    enableAnalytics,
    enableDebugMode,
    enableOfflineMode,
    enableRealTimeUpdates,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
