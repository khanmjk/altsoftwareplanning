import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export function createTestContext(overrides = {}) {
  const context = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    ...overrides,
  });

  context.globalThis = context;
  context.__testExports = {};

  const loadScript = (relativePath, exportNames = []) => {
    const absPath = path.resolve(process.cwd(), relativePath);
    const source = fs.readFileSync(absPath, 'utf8');
    const exportLines = exportNames
      .map(
        (name) =>
          `if (typeof ${name} !== 'undefined') { globalThis.__testExports['${name}'] = ${name}; }`
      )
      .join('\n');
    const wrapped = `${source}\n\nglobalThis.__testExports = globalThis.__testExports || {};\n${exportLines}\n`;
    vm.runInContext(wrapped, context, { filename: absPath });
    return context.__testExports;
  };

  const getExport = (name) => context.__testExports[name];

  return { context, loadScript, getExport };
}
