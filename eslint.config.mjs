import js from '@eslint/js';
import globals from 'globals';

const baseRules = {
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
};

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.git/**',
      '**/.wrangler/**',
      '**/dist/**',
      '**/coverage/**',
      '**/gitstoryline/**'
    ]
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: baseRules
  },
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    }
  },
  {
    files: ['smt-feedback-worker/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    }
  },
  {
    files: ['smt-blueprints-worker/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    }
  }
];
