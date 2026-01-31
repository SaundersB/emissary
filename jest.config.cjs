module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: ['/node_modules/', '/tests/e2e/', '/tests/manual/'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
      },
    }],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)\.js$': '<rootDir>/src/$1',
    '^@domain/(.*)\.js$': '<rootDir>/src/domain/$1',
    '^@application/(.*)\.js$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)\.js$': '<rootDir>/src/infrastructure/$1',
    '^@adapters/(.*)\.js$': '<rootDir>/src/adapters/$1',
    '^@shared/(.*)\.js$': '<rootDir>/src/shared/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@domain/(.*)$': '<rootDir>/src/domain/$1',
    '^@application/(.*)$': '<rootDir>/src/application/$1',
    '^@infrastructure/(.*)$': '<rootDir>/src/infrastructure/$1',
    '^@adapters/(.*)$': '<rootDir>/src/adapters/$1',
    '^@shared/(.*)$': '<rootDir>/src/shared/$1',
  },
};
