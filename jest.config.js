/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/test'],
    // Integratietests (echte DB) draaien via jest.integration.config.js, niet hier.
    testPathIgnorePatterns: ['/node_modules/', '<rootDir>/test/integration/'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
    },
    collectCoverageFrom: ['backend/**/*.ts', '!backend/**/*.d.ts'],
    coverageDirectory: 'coverage',
};
