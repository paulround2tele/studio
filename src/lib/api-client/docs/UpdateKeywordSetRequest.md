# UpdateKeywordSetRequest

Request to update an existing keyword set

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**description** | **string** | Keyword set description | [optional] [default to undefined]
**isEnabled** | **boolean** | Whether the keyword set is enabled | [optional] [default to undefined]
**name** | **string** | Keyword set name | [optional] [default to undefined]
**rules** | [**Array&lt;KeywordRuleRequest&gt;**](KeywordRuleRequest.md) | List of keyword rules (replaces all existing rules) | [optional] [default to undefined]

## Example

```typescript
import { UpdateKeywordSetRequest } from './api';

const instance: UpdateKeywordSetRequest = {
    description,
    isEnabled,
    name,
    rules,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
