const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const globals = require("globals");
const eslintConfigPrettier = require("eslint-config-prettier");

module.exports = [
    {
        ignores: ["dist/**", "node_modules/**", "coverage/**"],
    },
    {
        ...js.configs.recommended,
        files: ["backend/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            globals: { ...globals.node },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "error",
            "no-console": "off",
        },
    },
    ...tseslint.configs.recommended.map((config) => ({
        ...config,
        files: ["backend/**/*.ts", "test/**/*.ts"],
    })),
    {
        files: ["backend/**/*.ts", "test/**/*.ts"],
        languageOptions: {
            globals: { ...globals.node },
        },
        rules: {
            "@typescript-eslint/no-unused-vars": "warn",
            "@typescript-eslint/no-explicit-any": "warn",
        },
    },
    {
        files: ["test/**/*.ts"],
        rules: {
            // Tests dynamically require() modules for jsdom/jest mocking setups
            "@typescript-eslint/no-require-imports": "off",
        },
    },
    {
        files: ["frontend/**/*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            // Frontend files share globals via <script> tags — no-undef disabled
            globals: { ...globals.browser },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "off",
            "no-console": "off",
        },
    },
    eslintConfigPrettier,
];
