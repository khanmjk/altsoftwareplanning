import { describe, it, expect } from 'vitest';

import { createTestContext } from '../helpers/testContext.js';
import { getSampleSystem } from '../helpers/sampleData.js';

const { loadScript, getExport } = createTestContext();
loadScript('js/services/VisualizationService.js', ['VisualizationService']);
const VisualizationService = getExport('VisualizationService');

describe('VisualizationService', () => {
  it('builds dependency graphs with and without platform components', () => {
    const system = getSampleSystem('StreamView');
    const serviceName = system.services[0].serviceName;

    const fullGraph = VisualizationService.buildDependencyGraph(system, serviceName, {
      showPlatformComponents: true,
    });
    const filteredGraph = VisualizationService.buildDependencyGraph(system, serviceName, {
      showPlatformComponents: false,
    });

    expect(fullGraph.nodes.length).toBeGreaterThan(0);
    expect(filteredGraph.nodes.length).toBeGreaterThan(0);
    expect(fullGraph.links.length).toBeGreaterThanOrEqual(filteredGraph.links.length);
  });

  it('prepares dependency table data', () => {
    const system = getSampleSystem('StreamView');
    const rows = VisualizationService.prepareServiceDependenciesTableData(system);
    expect(rows.length).toBe(system.services.length);
    expect(rows[0]).toHaveProperty('serviceName');
    expect(rows[0]).toHaveProperty('owningTeam');
  });
});
