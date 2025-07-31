# AuthorizationDecision


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**action** | **string** |  | [optional] [default to undefined]
**conditionsMet** | **object** |  | [optional] [default to undefined]
**context** | **object** |  | [optional] [default to undefined]
**createdAt** | **string** |  | [optional] [default to undefined]
**decision** | **string** |  | [optional] [default to undefined]
**decisionId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**decisionTimeMs** | **number** |  | [optional] [default to undefined]
**evaluatedPolicies** | **string** |  | [optional] [default to undefined]
**id** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**policyVersion** | **string** |  | [optional] [default to undefined]
**resourceId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**resourceType** | **string** |  | [optional] [default to undefined]
**securityEventId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]
**userId** | **string** | Unique identifier (UUID v4) | [optional] [default to undefined]

## Example

```typescript
import { AuthorizationDecision } from './api';

const instance: AuthorizationDecision = {
    action,
    conditionsMet,
    context,
    createdAt,
    decision,
    decisionId,
    decisionTimeMs,
    evaluatedPolicies,
    id,
    policyVersion,
    resourceId,
    resourceType,
    securityEventId,
    userId,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
