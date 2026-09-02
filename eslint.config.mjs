// ESLint flat config. Replaces .github/linters/.eslintrc.yml, which the
// eslintrc format's removal in ESLint 10 made unusable.
import js from '@eslint/js'
import github from 'eslint-plugin-github'
import jest from 'eslint-plugin-jest'
import prettierRecommended from 'eslint-plugin-prettier/recommended'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist/', 'lib/', 'coverage/', 'node_modules/', 'badges/']
  },

  js.configs.recommended,
  // Non-type-checked, matching the old config; the type-aware rules it used are
  // enabled individually below.
  tseslint.configs.recommended,
  github.getFlatConfigs().recommended,
  jest.configs['flat/recommended'],

  {
    // Matches the old config's 'eslint-comments/no-unused-disable': 'off'.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly'
      },
      parserOptions: {
        // Includes both src/ and __tests__/, unlike the root tsconfig.
        project: ['./.github/linters/tsconfig.json'],
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      camelcase: 'off',
      'eslint-comments/no-use': 'off',
      'eslint-comments/no-unused-disable': 'off',
      'i18n-text/no-en': 'off',
      'import/no-namespace': 'off',
      'no-console': 'off',
      'no-unused-vars': 'off',
      '@typescript-eslint/array-type': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/consistent-type-assertions': 'error',
      '@typescript-eslint/explicit-member-accessibility': [
        'error',
        { accessibility: 'no-public' }
      ],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true }
      ],
      '@typescript-eslint/no-array-constructor': 'error',
      // Replaces no-empty-interface, removed in typescript-eslint v8.
      '@typescript-eslint/no-empty-object-type': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-extraneous-class': 'error',
      '@typescript-eslint/no-for-in-array': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',
      '@typescript-eslint/no-misused-new': 'error',
      '@typescript-eslint/no-namespace': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      // Replaces no-var-requires, removed in typescript-eslint v8.
      '@typescript-eslint/no-require-imports': 'error',
      '@typescript-eslint/no-unnecessary-qualifier': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-useless-constructor': 'error',
      '@typescript-eslint/prefer-for-of': 'warn',
      '@typescript-eslint/prefer-function-type': 'warn',
      '@typescript-eslint/prefer-includes': 'error',
      '@typescript-eslint/prefer-string-starts-ends-with': 'error',
      '@typescript-eslint/promise-function-async': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/restrict-plus-operands': 'error',
      '@typescript-eslint/unbound-method': 'error'
    }
  },

  // This file is not part of the linter tsconfig, so type-aware rules can't run on it.
  {
    files: ['eslint.config.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    // The import resolver can't follow typescript-eslint's exports map.
    rules: { 'import/no-unresolved': 'off' }
  },

  // Must stay last: turns off every rule that conflicts with Prettier.
  prettierRecommended
)
