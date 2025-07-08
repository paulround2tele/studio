# PatternOffsetRequest

Request to get the current offset for a domain generation pattern

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**characterSet** | **string** | Character set for domain generation (e.g., \&#39;abc\&#39;, \&#39;123\&#39;) | [default to undefined]
**constantString** | **string** | Constant string part of the domain | [default to undefined]
**patternType** | **string** | Type of pattern (prefix, suffix, or both) | [default to undefined]
**tld** | **string** | Top-level domain (e.g., \&#39;.com\&#39;, \&#39;.net\&#39;) | [default to undefined]
**variableLength** | **number** | Length of the variable part | [default to undefined]

## Example

```typescript
import { PatternOffsetRequest } from 'domainflow-api-client';

const instance: PatternOffsetRequest = {
    characterSet,
    constantString,
    patternType,
    tld,
    variableLength,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
