/** @type {import('jest').Config} */
// Integratietests draaien de volledige stack tegen een echte MySQL.
// Vereist een bereikbare database (standaard de Docker-container op localhost:3306).
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/test/integration'],
    transform: {
        '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
    },
    testTimeout: 30000,
    // Draai testbestanden serieel: ze delen één testdatabase.
    maxWorkers: 1,
};
