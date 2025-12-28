#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'coverage',
  'scripts',
  'gitstoryline',
]);
const HTML_ALLOWLIST = new Set(['index.html']);
const CSS_HEX_ALLOWLIST = new Set(['css/settings/variables.css']);

const violations = [];

function toPosix(filePath) {
  return filePath.split(path.sep).join('/');
}

function isCommentLine(line) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('/*') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('*/')
  );
}

function addViolation(rule, relPath, lineNumber, message) {
  violations.push({ rule, relPath, lineNumber, message });
}

function scanJsFile(relPath, content) {
  const lines = content.split(/\r?\n/);
  const isMain = relPath === 'js/main.js';
  const isRepository = relPath === 'js/repositories/SystemRepository.js';

  lines.forEach((line, index) => {
    if (isCommentLine(line)) return;

    if (/\b(innerHTML|insertAdjacentHTML|outerHTML)\b/.test(line)) {
      addViolation('no-inline-html', relPath, index + 1, 'Inline HTML API usage');
    }

    if (/\bTemplateLoader\b/.test(line)) {
      addViolation('no-template-loader', relPath, index + 1, 'TemplateLoader usage');
    }

    if (!isMain && /\bwindow\.[A-Za-z0-9_$]+\s*=/.test(line)) {
      addViolation('no-window-assign', relPath, index + 1, 'window.* assignment outside main.js');
    }

    if (!isRepository && /\blocalStorage\b/.test(line)) {
      addViolation(
        'localstorage-only-in-repo',
        relPath,
        index + 1,
        'localStorage usage outside repository'
      );
    }
  });
}

function scanCssFile(relPath, content) {
  if (CSS_HEX_ALLOWLIST.has(relPath)) return;

  const lines = content.split(/\r?\n/);
  const hexRegex = /#[0-9a-fA-F]{3,8}/;

  lines.forEach((line, index) => {
    if (isCommentLine(line)) return;

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('@')) return;

    const isDeclarationLine = line.includes(':') && !line.includes('{') && !line.includes('}');
    if (!isDeclarationLine) return;

    if (!hexRegex.test(line)) return;

    const allowedLine =
      line.includes('var(--theme-') || line.includes('var(--color-') || line.includes('color-mix(');
    if (!allowedLine) {
      addViolation('no-raw-hex', relPath, index + 1, 'Raw hex color outside theme variables');
    }
  });
}

function scanHtmlFile(relPath) {
  if (!HTML_ALLOWLIST.has(relPath)) {
    addViolation('no-html-templates', relPath, 1, 'HTML template file detected');
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const entryPath = path.join(dir, entry.name);
    const relPath = toPosix(path.relative(ROOT, entryPath));

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) return;
      walk(entryPath);
      return;
    }

    const ext = path.extname(entry.name).toLowerCase();
    if (ext === '.js') {
      const content = fs.readFileSync(entryPath, 'utf8');
      scanJsFile(relPath, content);
    } else if (ext === '.css') {
      const content = fs.readFileSync(entryPath, 'utf8');
      scanCssFile(relPath, content);
    } else if (ext === '.html') {
      scanHtmlFile(relPath);
    }
  });
}

walk(ROOT);

if (violations.length > 0) {
  console.error('Contract violations found:');
  violations.forEach((v) => {
    console.error(`- [${v.rule}] ${v.relPath}:${v.lineNumber} ${v.message}`);
  });
  process.exitCode = 1;
} else {
  console.log('Contract scan passed: no violations found.');
}
