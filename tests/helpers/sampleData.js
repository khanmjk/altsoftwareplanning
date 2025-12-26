import { createTestContext } from './testContext.js';

const { loadScript, getExport } = createTestContext();

loadScript('js/sampleData/sampleStreamingPlatform.js', ['sampleSystemDataStreamView']);
loadScript('js/sampleData/sampleContactCenterPlatform.js', ['sampleSystemDataContactCenter']);
loadScript('js/sampleData/sampleShopSphere.js', ['sampleSystemDataShopSphere']);
loadScript('js/sampleData/sampleInsightAI.js', ['sampleSystemDataInsightAI']);
loadScript('js/sampleData/sampleFinSecure.js', ['sampleSystemDataFinSecure']);

const sampleSystems = {
  StreamView: getExport('sampleSystemDataStreamView'),
  ConnectPro: getExport('sampleSystemDataContactCenter'),
  ShopSphere: getExport('sampleSystemDataShopSphere'),
  InsightAI: getExport('sampleSystemDataInsightAI'),
  FinSecure: getExport('sampleSystemDataFinSecure'),
};

export function getSampleSystem(name) {
  const data = sampleSystems[name];
  if (!data) {
    throw new Error(`Unknown sample system: ${name}`);
  }
  return JSON.parse(JSON.stringify(data));
}

export function getSampleSystemNames() {
  return Object.keys(sampleSystems);
}
