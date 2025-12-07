/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts', '**/*.test.js'],
    transform: {
        '^.+\\.tsx?$': 'ts-jest',
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverageFrom: [
        'src/**/*.{ts,js}',
        '!src/**/*.test.{ts,js}',
        '!src/**/*.d.ts',
    ],
    coverageDirectory: 'coverage',
    verbose: true,

    // Jenkins CI integration - JUnit reporter
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: 'coverage',
                outputName: 'junit.xml',
                classNameTemplate: '{classname}',
                titleTemplate: '{title}',
                ancestorSeparator: ' › ',
                usePathForSuiteName: true,
            },
        ],
    ],
};
