module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          module: 'esnext',
          target: 'esnext',
          lib: ['dom', 'esnext'],
        },
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
moduleNameMapper: {
  '^@utils/(.*)$': '<rootDir>/src/utils/$1',
  '^@pages/(.*)$': '<rootDir>/src/Pages/$1',
  '^@components/(.*)$': '<rootDir>/src/components/$1',
  // Map image files imported via @assets to the file mock:
  '^@assets/.*\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>src/__mocks__/fileMock.js',
  '^@assets/(.*)$': '<rootDir>/src/assets/$1', // for non-image assets if any
  '^@hooks/(.*)$': '<rootDir>/src/hooks/$1',
  '^@api/(.*)$': '<rootDir>/src/api/$1',
  '^@types/(.*)$': '<rootDir>/src/types/$1',
  '^@mocks/(.*)$': '<rootDir>/src/__mocks__/$1',
  '^@context/(.*)$': '<rootDir>/src/context/$1',
  '^@routes/(.*)$': '<rootDir>/src/routes/$1',
  '^@styles/(.*)$': '<rootDir>/src/styles/$1',
  // Fallback for any other asset files
  '^.+\\.(css|less|sass|scss)$': 'identity-obj-proxy',
},

  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};
