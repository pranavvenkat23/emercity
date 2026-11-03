/** Plain Node Jest config for the Firestore rules tests (no React Native setup, real fetch). */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/test-utils/firestore-rules.test.ts'],
  transform: { '^.+\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
};
