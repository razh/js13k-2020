module.exports = {
  env: {
    browser: true,
    es2020: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 11,
    sourceType: 'module',
  },
  plugins: ['simple-import-sort'],
  rules: {
    'func-style': 'error',
    'object-shorthand': 'error',
    'simple-import-sort/sort': 'error',
  },
};
