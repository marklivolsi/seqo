import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
    eslint.configs.recommended,
    {
        files: ['**/*.js', '**/*.ts'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: tsparser,
            parserOptions: {
                ecmaFeatures: { modules: true }
            },
            globals: {
                ...globals.node,
                ...globals.es2022,
                ...globals.jest
            }
        },
        plugins: {
            '@typescript-eslint': tseslint
        },
        rules: {
            // Basic ESLint rules
            'indent': ['error', 4],
            'linebreak-style': ['error', 'unix'],
            'quotes': ['error', 'single'],
            'semi': ['error', 'always'],
            'no-unused-vars': 'warn',
            'no-console': 'warn',
            'no-extra-boolean-cast': 'warn',
            'no-duplicate-imports': 'error',

            // ES6+ features
            'prefer-const': 'error',
            'arrow-body-style': ['error', 'as-needed'],
            'object-shorthand': ['error', 'always'],

            // TypeScript rules - using only supported rules
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/explicit-function-return-type': 'off'
        }
    }
];