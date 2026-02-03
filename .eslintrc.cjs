module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-essential'
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  rules: {
    // Vue 规则
    'vue/multi-word-component-names': 'off',
    'vue/no-unused-vars': 'warn',

    // 通用规则
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'semi': ['error', 'never'],
    'quotes': ['error', 'single', { avoidEscape: true }],
    'comma-dangle': ['error', 'never'],
    'arrow-parens': ['error', 'as-needed'],
    'space-before-function-paren': ['error', {
      anonymous: 'always',
      named: 'never',
      asyncArrow: 'always'
    }],

    // 代码质量
    'eqeqeq': ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'warn',
    'no-multiple-empty-lines': ['error', { max: 1 }],
    'no-trailing-spaces': 'error'
  },
  globals: {
    // uTools 全局对象
    'utools': 'readonly'
  }
}
