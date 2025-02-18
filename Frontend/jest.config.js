module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // Adjust if you're using aliases
    '^@components/(.*)$': '<rootDir>/src/components/$1',
    '^@context/(.*)$': '<rootDir>/src/context/$1',
    '^@pages/(.*)$': '<rootDir>/src/pages/$1',
    // add more aliases as needed
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
};