import { listProviders, resolveProviderModel } from '../src/services/aiGateway.js';

const providers = listProviders();
if (!providers.some((provider) => provider.id === 'google')) {
  throw new Error('Google provider is missing.');
}
if (!providers.some((provider) => provider.id === 'openai')) {
  throw new Error('OpenAI provider is missing.');
}

const resolved = resolveProviderModel('google');
if (resolved.provider !== 'google' || !resolved.model) {
  throw new Error('Provider/model resolution failed.');
}

console.log('AI gateway smoke test passed.');
console.table(providers);
