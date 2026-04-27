import js from '@eslint/js';
import globals from 'globals';

export default [

  js.configs.recommended,

  {
    languageOptions: {

      globals: {
        ...globals.browser,
        L: 'readonly',
        CONFIG: 'readonly'
      }

    },

    rules: {

      'no-undef': 'error',
      'no-unused-vars': 'warn',

      'no-console': 'off',

      semi: 'off',
      quotes: 'off',
      indent: 'off'

    }

  }

];