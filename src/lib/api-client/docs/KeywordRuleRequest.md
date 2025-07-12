# KeywordRuleRequest

Request to create or update a keyword rule

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**category** | **string** | Category for organizing related rules | [optional] [default to undefined]
**contextChars** | **number** | Number of context characters to include around matches | [optional] [default to 0]
**isCaseSensitive** | **boolean** | Whether pattern matching is case sensitive | [optional] [default to false]
**pattern** | **string** | Pattern to match against content | [default to undefined]
**ruleType** | **string** | Type of rule pattern matching | [default to undefined]

## Example

```typescript
import { KeywordRuleRequest } from 'api-client';

const instance: KeywordRuleRequest = {
    category,
    contextChars,
    isCaseSensitive,
    pattern,
    ruleType,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
