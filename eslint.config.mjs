import pluginJs from '@eslint/js';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.jasmine,
        ...globals.node
      }
    }
  },
  pluginJs.configs.recommended,
  {
    ignores: ['.aws-sam/', 'coverage/', 'logs/']
  },
  {
    rules: {
      'max-len': ['error', { code: 120 }],
      indent: ['error', 2, { SwitchCase: 1, flatTernaryExpressions: true }],
      'linebreak-style': ['error', 'unix'],
      quotes: ['error', 'single', 'avoid-escape'],
      semi: ['error', 'always'],
      'generator-star-spacing': 'off',
      'no-debugger': 'error',
      'no-console': 'off'
    }
  }
];
