# TLSClientHello

TLS ClientHello configuration

## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**cipherSuites** | **Array&lt;string&gt;** | Supported cipher suites | [optional] [default to undefined]
**curvePreferences** | **Array&lt;string&gt;** | Supported curve preferences | [optional] [default to undefined]
**ja3** | **string** | JA3 fingerprint | [optional] [default to undefined]
**maxVersion** | **string** | Maximum TLS version | [optional] [default to undefined]
**minVersion** | **string** | Minimum TLS version | [optional] [default to undefined]

## Example

```typescript
import { TLSClientHello } from 'domainflow-api-client';

const instance: TLSClientHello = {
    cipherSuites,
    curvePreferences,
    ja3,
    maxVersion,
    minVersion,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
