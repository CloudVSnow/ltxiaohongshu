import js from '@eslint/js';
import ts from 'typescript-eslint';
import vue from 'eslint-plugin-vue';

export default ts.config(
  { ignores: ['**/dist/**', '**/generated/**', '**/node_modules/**', '**/unpackage/**'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...vue.configs['flat/essential'],
  { files: ['**/*.vue'], languageOptions: { parserOptions: { parser: ts.parser, extraFileExtensions: ['.vue'] } } },
  { files: ['apps/client/src/pages/**/*.vue'], rules: { 'vue/multi-word-component-names': 'off' } },
  { files: ['apps/admin/src/**/*.vue'], languageOptions: { globals: { fetch: 'readonly', AbortSignal: 'readonly' } } },
  { files: ['**/*.mjs', '**/*.ts'], languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly' } } }
);
