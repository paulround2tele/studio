# CreateKeywordSetRequest

Request to create a new keyword set

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**description** | **string** | Keyword set description | [optional] [default to undefined]
**isEnabled** | **boolean** | Whether the keyword set is enabled | [optional] [default to true]
**name** | **string** | Keyword set name | [default to undefined]
**rules** | [**Array&lt;KeywordRuleRequest&gt;**](KeywordRuleRequest.md) | List of keyword rules to include in the set | [optional] [default to undefined]

## Example

```typescript
import { CreateKeywordSetRequest } from 'api-client';

const instance: CreateKeywordSetRequest = {
    description,
    isEnabled,
    name,
    rules,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
