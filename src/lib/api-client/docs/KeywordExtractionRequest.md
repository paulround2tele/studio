# KeywordExtractionRequest

Request to extract keywords from text content

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**content** | **string** | Text content to extract keywords from | [default to undefined]
**maxKeywords** | **number** | Maximum number of keywords to extract | [optional] [default to 10]
**minWordLength** | **number** | Minimum word length for keyword extraction | [optional] [default to 3]

## Example

```typescript
import { KeywordExtractionRequest } from 'domainflow-api-client';

const instance: KeywordExtractionRequest = {
    content,
    maxKeywords,
    minWordLength,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
