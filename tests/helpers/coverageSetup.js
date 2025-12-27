import fs from 'node:fs';
import path from 'node:path';
import { afterAll } from 'vitest';

const coverageEnabled = process.env.UNIT_COVERAGE === '1';

if (coverageEnabled) {
  afterAll(() => {
    const coverage = globalThis.__coverage__;
    if (!coverage || Object.keys(coverage).length === 0) {
      return;
    }

    const outputDir = path.resolve(process.cwd(), '.nyc_output');
    fs.mkdirSync(outputDir, { recursive: true });
    const outputFile = path.join(outputDir, 'unit.json');
    fs.writeFileSync(outputFile, JSON.stringify(coverage), 'utf8');
  });
}
