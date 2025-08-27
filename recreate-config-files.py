#!/usr/bin/env python3

import os
import glob

# Template for config files - we'll need to replace the schema refs
CONFIG_TEMPLATE = """get:
  tags: [server-settings]
  security:
    - cookieAuth: []
  summary: Get {config_name} configuration
  operationId: config_get_{operation_id}
  responses:
    '200':
      description: {config_name} config
      content:
        application/json:
          schema:
            allOf:
              - $ref: '../../components/schemas/all.yaml#/SuccessEnvelope'
              - type: object
                properties:
                  data:
                    $ref: '../../components/schemas/all.yaml#{schema_ref}'
    '401': {{ $ref: '../../components/responses.yaml#/Unauthorized' }}
    '403': {{ $ref: '../../components/responses.yaml#/Forbidden' }}
    '429': {{ $ref: '../../components/responses.yaml#/RateLimitExceeded' }}
    '500': {{ $ref: '../../components/responses.yaml#/InternalServerError' }}
put:
  tags: [server-settings]
  security:
    - cookieAuth: []
  summary: Update {config_name} configuration
  operationId: config_update_{operation_id}
  requestBody:
    required: true
    content:
      application/json:
        schema:
          $ref: '../../components/schemas/all.yaml#{schema_ref}'
  responses:
    '200':
      description: Updated
      content:
        application/json:
          schema:
            allOf:
              - $ref: '../../components/schemas/all.yaml#/SuccessEnvelope'
              - type: object
                properties:
                  data:
                    $ref: '../../components/schemas/all.yaml#{schema_ref}'
    '400': {{ $ref: '../../components/responses.yaml#/BadRequest' }}
    '401': {{ $ref: '../../components/responses.yaml#/Unauthorized' }}
    '403': {{ $ref: '../../components/responses.yaml#/Forbidden' }}
    '409': {{ $ref: '../../components/responses.yaml#/Conflict' }}
    '422': {{ $ref: '../../components/responses.yaml#/ValidationError' }}
    '429': {{ $ref: '../../components/responses.yaml#/RateLimitExceeded' }}
    '500': {{ $ref: '../../components/responses.yaml#/InternalServerError' }}"""

FEATURES_TEMPLATE = """get:
  tags: [feature-flags]
  security:
    - cookieAuth: []
  summary: Get feature flags
  operationId: feature_flags_get
  responses:
    '200':
      description: Feature flags
      content:
        application/json:
          schema:
            allOf:
              - $ref: '../../components/schemas/all.yaml#/SuccessEnvelope'
              - type: object
                properties:
                  data:
                    $ref: '../../components/schemas/all.yaml#/FeatureFlags'
    '401': {{ $ref: '../../components/responses.yaml#/Unauthorized' }}
    '403': {{ $ref: '../../components/responses.yaml#/Forbidden' }}
    '429': {{ $ref: '../../components/responses.yaml#/RateLimitExceeded' }}
    '500': {{ $ref: '../../components/responses.yaml#/InternalServerError' }}
put:
  tags: [feature-flags]
  security:
    - cookieAuth: []
  summary: Update feature flags
  operationId: feature_flags_update
  requestBody:
    required: true
    content:
      application/json:
        schema:
          $ref: '../../components/schemas/all.yaml#/FeatureFlags'
  responses:
    '200':
      description: Updated
      content:
        application/json:
          schema:
            allOf:
              - $ref: '../../components/schemas/all.yaml#/SuccessEnvelope'
              - type: object
                properties:
                  data:
                    $ref: '../../components/schemas/all.yaml#/FeatureFlags'
    '400': {{ $ref: '../../components/responses.yaml#/BadRequest' }}
    '401': {{ $ref: '../../components/responses.yaml#/Unauthorized' }}
    '403': {{ $ref: '../../components/responses.yaml#/Forbidden' }}
    '409': {{ $ref: '../../components/responses.yaml#/Conflict' }}
    '422': {{ $ref: '../../components/responses.yaml#/ValidationError' }}
    '429': {{ $ref: '../../components/responses.yaml#/RateLimitExceeded' }}
    '500': {{ $ref: '../../components/responses.yaml#/InternalServerError' }}"""

# Mapping of file names to their schema configurations
CONFIG_MAPPINGS = {
    'auth.yaml': {
        'config_name': 'authentication',
        'operation_id': 'auth',
        'schema_ref': '/AuthConfig'
    },
    'dns.yaml': {
        'config_name': 'DNS',
        'operation_id': 'dns',
        'schema_ref': '/DNSValidatorConfigJSON'
    },
    'http.yaml': {
        'config_name': 'HTTP',
        'operation_id': 'http',
        'schema_ref': '/HTTPConfig'
    },
    'logging.yaml': {
        'config_name': 'logging',
        'operation_id': 'logging',
        'schema_ref': '/LoggingConfig'
    },
    'proxy-manager.yaml': {
        'config_name': 'proxy manager',
        'operation_id': 'proxy_manager',
        'schema_ref': '/ProxyManagerConfig'
    },
    'rate-limiter.yaml': {
        'config_name': 'rate limiter',
        'operation_id': 'rate_limiter',
        'schema_ref': '/RateLimiterConfig'
    },
    'server.yaml': {
        'config_name': 'server',
        'operation_id': 'server',
        'schema_ref': '/ServerConfig'
    },
    'worker.yaml': {
        'config_name': 'worker',
        'operation_id': 'worker',
        'schema_ref': '/WorkerConfig'
    }
}

def main():
    config_dir = '/home/vboxuser/studio/backend/openapi/paths/config'
    
    # Handle features.yaml specially
    features_file = os.path.join(config_dir, 'features.yaml')
    print(f"Recreating {features_file}")
    with open(features_file, 'w') as f:
        f.write(FEATURES_TEMPLATE)
    
    # Handle other config files
    for filename, config in CONFIG_MAPPINGS.items():
        file_path = os.path.join(config_dir, filename)
        print(f"Recreating {file_path}")
        
        content = CONFIG_TEMPLATE.format(**config)
        
        with open(file_path, 'w') as f:
            f.write(content)
    
    print("All config files have been recreated with proper YAML structure.")

if __name__ == '__main__':
    main()
