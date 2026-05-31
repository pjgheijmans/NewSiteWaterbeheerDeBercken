const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
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
];
