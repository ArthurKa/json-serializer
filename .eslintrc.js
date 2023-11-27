// @ts-check
'use strict';

module.exports = ((/** @type {import('eslint').Linter.Config} */ e) => e)({
  extends: './node_modules/@arthurka/eslint',
  rules: {
    'no-implicit-coercion': 'off',
    '@typescript-eslint/no-this-alias': 'off',
  },
});
