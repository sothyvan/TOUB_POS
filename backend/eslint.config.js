import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      // ── Possible errors ──────────────────────────────────
      'no-console': 'warn',              // use a logger instead of console.log in prod
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'error',

      // ── Best practices ───────────────────────────────────
      'eqeqeq': ['error', 'always'],     // always === not ==
      'no-var': 'error',                 // use const/let
      'prefer-const': 'warn',
      'curly': ['error', 'all'],         // always use braces on if/else

      // ── Async safety ─────────────────────────────────────
      'no-return-await': 'warn',         // avoid redundant await in return
      'require-await': 'warn',           // flag async fns with no await
    },
  },
  {
    // Ignore generated / non-source files
    ignores: ['node_modules/**'],
  },
];
