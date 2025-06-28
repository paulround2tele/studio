import type { Config } from 'jest';
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jest-environment-jsdom',
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    // Handle module aliases (this will be automatically configured by nextJest)
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverage: true,
  coverageReporters: ["json", "lcov", "text", "clover"],
  coverageDirectory: "coverage",
  testPathIgnorePatterns: [
    "/node_modules/",
    "/.next/",
    "<rootDir>/src/components/ui/__tests__/",
    "<rootDir>/src/lib/api-client/__tests__/verify-currentoffset-field.ts",
    "<rootDir>/src/lib/api-client/__tests__/generated-domain-offset-fix.test.ts",
    "<rootDir>/src/lib/services/__tests__/cv010-user-update-fix.test.ts",
    "<rootDir>/src/lib/schemas/__tests__/http-keyword-source-type-validation.test.ts",
    "<rootDir>/src/lib/schemas/__tests__/verify-persona-isenabled.ts",
    "<rootDir>/tests/e2e/",
    "<rootDir>/tests/accessibility/"
  ],
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.jest.json'
    }
  }
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
