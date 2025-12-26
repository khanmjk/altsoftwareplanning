module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script'
  },
  extends: ['eslint:recommended'],
  rules: {
    'no-undef': 'off',
    'no-unused-vars': [
      'warn',
      {
        args: 'none',
        varsIgnorePattern:
          '^(?:[A-Z]|ai[A-Z]|appState|systemRepository|notificationManager|styleVars|ganttAdapter|sampleSystemData|renderHelpView|get[A-Z]|has[A-Z]|generateGanttSyntax)'
      }
    ],
    'no-redeclare': 'warn',
    'no-useless-catch': 'warn',
    'no-case-declarations': 'warn',
    'no-cond-assign': 'warn',
    'no-prototype-builtins': 'warn',
    'no-useless-escape': 'warn',
    'no-empty': ['warn', { allowEmptyCatch: true }]
  },
  overrides: [
    {
      files: ['smt-feedback-worker/**/*.js'],
      env: {
        browser: false,
        node: true
      },
      parserOptions: {
        sourceType: 'module'
      }
    }
  ]
};
