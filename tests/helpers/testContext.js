import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const coverageEnabled = process.env.UNIT_COVERAGE === '1';
const instrumenter = coverageEnabled
  ? require('istanbul-lib-instrument').createInstrumenter({
      coverageVariable: '__coverage__',
      produceSourceMap: false,
      esModules: false,
    })
  : null;
const sharedCoverage = coverageEnabled
  ? (globalThis.__coverage__ = globalThis.__coverage__ || {})
  : null;

export function createTestContext(overrides = {}) {
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    ...overrides,
    ...(coverageEnabled ? { __coverage__: sharedCoverage } : {}),
  });

  context.globalThis = context;
  context.__testExports = {};

  const loadScript = (relativePath, exportNames = []) => {
    const absPath = path.resolve(process.cwd(), relativePath);
    const source = fs.readFileSync(absPath, 'utf8');
    const shouldInstrument = Boolean(instrumenter) && !relativePath.startsWith('js/sampleData/');
    const instrumentedSource = shouldInstrument
      ? instrumenter.instrumentSync(source, absPath)
      : source;
    const exportLines = exportNames
      .map(
        (name) =>
          `if (typeof ${name} !== 'undefined') { globalThis.__testExports['${name}'] = ${name}; }`
      )
      .join('\n');
    const wrapped = `${instrumentedSource}\n\nglobalThis.__testExports = globalThis.__testExports || {};\n${exportLines}\n`;
    vm.runInContext(wrapped, context, { filename: absPath });
    return context.__testExports;
  };

  const getExport = (name) => context.__testExports[name];

  return { context, loadScript, getExport };
}
