/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/test'],
    testPathIgnorePatterns: ['/node_modules/'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
    },
    // De backend is naar PHP gemigreerd; deze Jest-suite test nu de frontend (jsdom).
    collectCoverageFrom: ['frontend/js/**/*.js'],
    coverageDirectory: 'coverage',
};
