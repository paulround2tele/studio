import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import next from '@next/eslint-plugin-next';

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  next.flatConfig.recommended,
  next.flatConfig.coreWebVitals,
  js.configs.recommended,
  {
    // Exclude build directories and other files that shouldn't be linted
    ignores: [
      '.next/**/*',
      'node_modules/**/*',
      'dist/**/*',
      'build/**/*',
      '.vercel/**/*',
      'out/**/*',
      'coverage/**/*',
      'next.config.mjs',
      'next.config.ts',
      'postcss.config.js',
      'tailwind.config.ts',
      'jest.setup.ts',
      'scripts/**/*',
      '**/__snapshots__/**/*'
    ]
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: 'readonly',
        JSX: 'readonly',
        
        // Node.js globals
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        console: 'readonly',
        setImmediate: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        
        // Browser globals
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        confirm: 'readonly',
        alert: 'readonly',
        fetch: 'readonly',
        Response: 'readonly',
        Request: 'readonly',
        RequestInit: 'readonly',
        Headers: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        MessageEvent: 'readonly',
        CloseEvent: 'readonly',
        ErrorEvent: 'readonly',
        PromiseRejectionEvent: 'readonly',
        BroadcastChannel: 'readonly',
        IntersectionObserver: 'readonly',
        
        // Worker and WebAssembly globals
        Worker: 'readonly',
        EventSource: 'readonly',
        WebAssembly: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        PerformanceObserver: 'readonly',
        PerformanceEntry: 'readonly',
        self: 'readonly',
        
        performance: 'readonly',
        PerformanceNavigationTiming: 'readonly',
        PerformanceResourceTiming: 'readonly',
        Image: 'readonly',
        Element: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLButtonElement: 'readonly',
        HTMLTableElement: 'readonly',
        HTMLTableSectionElement: 'readonly',
        HTMLTableRowElement: 'readonly',
        HTMLTableCellElement: 'readonly',
        HTMLTableCaptionElement: 'readonly',
        HTMLTextAreaElement: 'readonly',
        HTMLFormElement: 'readonly',
        HTMLFieldSetElement: 'readonly',
        HTMLLabelElement: 'readonly',
        HTMLAnchorElement: 'readonly',
        HTMLSpanElement: 'readonly',
        HTMLHeadingElement: 'readonly',
        HTMLParagraphElement: 'readonly',
        HTMLLIElement: 'readonly',
        HTMLUListElement: 'readonly',
        HTMLImageElement: 'readonly',
        DOMException: 'readonly',
        
        // File and Blob APIs
        File: 'readonly',
        FileReader: 'readonly',
        Blob: 'readonly',
        
        // Events
        CustomEvent: 'readonly',
        KeyboardEvent: 'readonly',
        StorageEvent: 'readonly',
        
        // Observers and callbacks
        ResizeObserverCallback: 'readonly',
        
        // Timer functions
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        
        // Node.js types (for TypeScript)
        NodeJS: 'readonly',
        
        // Module system
        exports: 'readonly'
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      'react': react,
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      '@next/next': next,
    },
    rules: {
      ...typescript.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      // Enforce direct imports for generated API client model files to avoid relying on barrel stability
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@/lib/api-client/models',
              importNames: [
                'ModelsProxy',
                'ModelsProxyPool',
                'ModelsProxyPoolMembership',
                'UpdateProxyRequestAPI',
                'ProxyProtocol'
              ],
              message:
                'Import generated model types directly from their files, e.g., models/models-proxy, models/models-proxy-pool, models/update-proxy-request-api, models/proxy-protocol.'
            },
            // Prevent imports from non-existent bridge/proxy type files
            {
              name: '@/lib/api-client/types-bridge',
              message: 'Bridge types are deprecated. Use generated types from @/lib/api-client/models/ instead.'
            },
            {
              name: '@/lib/api-client/professional-types',
              message: 'Professional types are deprecated. Use generated types from @/lib/api-client/models/ instead.'
            },
            {
              name: '@/lib/api-client/client-bridge',
              message: 'Client bridge is deprecated. Use generated APIs from @/lib/api-client/apis/ instead.'
            }
          ],
          patterns: [
            {
              group: ['**/types-bridge*', '**/professional-types*', '**/client-bridge*'],
              message: 'Manual bridge/proxy types are not allowed. Use auto-generated types from @/lib/api-client/ instead.'
            }
          ]
        }
      ],
      
      // Custom rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_"
        }
      ],
      // Elevate governance: explicit any now an error in production code
      "@typescript-eslint/no-explicit-any": "error",
      // Ban casts to any (TSAsExpression) and annotations using any, guiding toward unknown or concrete types
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSInterfaceDeclaration[id.name=/^(Campaign|Proxy|Persona|KeywordSet|Models)$/]',
          message: 'Manual interface definitions for API models are not allowed. Use auto-generated types from @/lib/api-client/ instead. If you need a local interface, use a different naming pattern that doesn\'t conflict with generated types.'
        },
        {
          selector: 'TSTypeAliasDeclaration[id.name=/^(Campaign|Proxy|Persona|KeywordSet|Models)$/]',
          message: 'Manual type aliases for API models are not allowed. Use auto-generated types from @/lib/api-client/ instead. If you need a local type, use a different naming pattern that doesn\'t conflict with generated types.'
        },
        {
          selector: 'TSAsExpression > TSAnyKeyword',
          message: 'Casting to any is disallowed. Use unknown then narrow, or a concrete generated model type.'
        },
        {
          selector: 'TSTypeAnnotation > TSAnyKeyword',
          message: 'Avoid annotating with any. Use a specific generated type or unknown + proper type guard.'
        }
      ],
      // Discourage legacy axios unwrap pattern in favor of unwrapApiResponse helper
      'no-restricted-patterns': ['off'], // placeholder to avoid config errors if plugin absent
      'no-restricted-properties': [
        'error',
        {
          object: 'resp',
          property: 'data',
          message: 'Direct resp.data access with casts discouraged; use unwrapApiResponse<T>(resp).' 
        }
      ],
      "@typescript-eslint/no-require-imports": "off", // Allow require() imports
      "react/no-unescaped-entities": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react/react-in-jsx-scope": "off", // Not needed in Next.js
      "react/prop-types": "off", // Using TypeScript for prop validation
      "no-undef": "error",
      "no-case-declarations": "off", // Allow let/const in case blocks
      "no-useless-escape": "warn",
      "no-redeclare": "warn"
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    // Test files configuration
    files: [
      "**/__tests__/**/*",
      "**/*.test.*",
      "**/*.spec.*",
      "**/tests/**/*"
    ],
    languageOptions: {
      globals: {
        // Jest globals
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        beforeAll: 'readonly',
        afterEach: 'readonly',
        afterAll: 'readonly',
        jest: 'readonly'
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "off",
      "jsx-a11y/role-supports-aria-props": "off",
      "no-loss-of-precision": "off"
    }
  },
  {
    files: [
      "**/components/ui/**/*",
      "**/stories/**/*"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "off",
      "jsx-a11y/role-supports-aria-props": "off"
    }
  },
  {
    // Configuration files (allow CommonJS and relaxed rules)
    files: ['*.config.js', '*.config.ts', 'tailwind.config.js', 'tailwind.config.ts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      'no-undef': 'off'
    }
  },
  {
    // Test automation files (allow all patterns)
    files: ['test-automation/**/*.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
      'no-useless-escape': 'off'
    }
  }
  ,
  {
    // Generated API client (OpenAPI): relax rules and silence unused-disable noise (must come after base rules)
    files: [
      'src/lib/api-client/**/*'
    ],
    linterOptions: {
      // Many generator files include broad eslint-disable headers; don't warn about unused disables here
      reportUnusedDisableDirectives: false
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-undef': 'off',
      'react/no-unescaped-entities': 'off',
      'react-hooks/exhaustive-deps': 'off'
    }
  }
];
