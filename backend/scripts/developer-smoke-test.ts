import 'dotenv/config';
import { env } from '../src/config/env.js';

console.log('Developer Mode configuration');
console.log({
  githubConfigured: Boolean(env.GITHUB_TOKEN),
  codeExecutionEnabled: env.CODE_EXECUTION_ENABLED === 'true',
});
console.log('PASS: Developer Mode configuration loaded.');
