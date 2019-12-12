module.exports = {
    "env": {
        "es6": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/eslint-recommended",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "sourceType": "module",
        "project": "./tsconfig.lint.json"
    },
    "plugins": [
        "@typescript-eslint/eslint-plugin",
    ],
    "rules": {
        "linebreak-style": [
            "error",
            "unix"
        ],
        "quotes": [
            "error",
            "single"
        ],
        "semi": [
            "error",
            "always"
        ],
        "@typescript-eslint/array-type": [
            'error',
            {default: 'array-simple'}
        ],
        "@typescript-eslint/no-unused-vars": [
            'error',
            {argsIgnorePattern: '^_'}
        ],
        "@typescript-eslint/no-floating-promises": 'error',
        "@typescript-eslint/no-for-in-array": 'error',
        "@typescript-eslint/no-unnecessary-condition": [
            'error',
            {ignoreRhs: true}
        ],
        "@typescript-eslint/restrict-plus-operands": "error"
    }
};
