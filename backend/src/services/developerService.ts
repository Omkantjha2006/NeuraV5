import { AppError } from '../utils/http.js';
import { generateCompletion } from './aiGateway.js';
import { getAgentConfig } from './agentService.js';

const GITHUB_API = 'https://api.github.com';

function githubHeaders(): Record<string, string> {
  return {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  };
}

function parseRepo(input: string) {
  const cleaned = input.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
  const parts = cleaned.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new AppError(400, 'Use a GitHub repository as owner/repository or a github.com URL.', 'INVALID_REPOSITORY');
  }
  return { owner: parts[0], repo: parts[1] };
}

async function githubJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { headers: githubHeaders() });
  if (!response.ok) {
    const text = await response.text();
    if (response.status === 404) throw new AppError(404, 'Repository or resource not found, or it is private without a valid GitHub token.', 'GITHUB_NOT_FOUND');
    throw new AppError(response.status, `GitHub API error: ${text.slice(0, 300)}`, 'GITHUB_API_ERROR');
  }
  return response.json() as Promise<T>;
}

type TreeItem = { path: string; type: string; size?: number };
type GitHubTree = { tree: TreeItem[]; truncated?: boolean };

const TEXT_EXTENSIONS = new Set([
  '.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','.md','.mdx','.py','.java','.c','.cpp','.h','.hpp',
  '.cs','.go','.rs','.rb','.php','.sql','.html','.css','.scss','.yml','.yaml','.xml','.sh','.env.example',
]);

function isTextFile(path: string) {
  const lower = path.toLowerCase();
  const dot = lower.lastIndexOf('.');
  return TEXT_EXTENSIONS.has(dot >= 0 ? lower.slice(dot) : '') || lower.endsWith('dockerfile');
}

export async function analyzeRepository(repository: string, question?: string) {
  const { owner, repo } = parseRepo(repository);
  const meta = await githubJson<any>(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  const tree = await githubJson<GitHubTree>(`${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(meta.default_branch)}?recursive=1`);

  const files = tree.tree.filter((item) => item.type === 'blob' && isTextFile(item.path)).sort((a,b) => (a.path.length - b.path.length)).slice(0, 30);
  const selected: Array<{ path: string; content: string }> = [];

  for (const file of files.slice(0, 12)) {
    try {
      const raw = await fetch(`https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(meta.default_branch)}/${file.path}`, {
        headers: process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {},
      });
      if (!raw.ok) continue;
      const content = await raw.text();
      selected.push({ path: file.path, content: content.slice(0, 12_000) });
    } catch {
      // Skip files that cannot be fetched.
    }
  }

  const context = selected.map((file) => `### ${file.path}\n${file.content}`).join('\n\n').slice(0, 100_000);
  const agent = await getAgentConfig('code');
  const prompt = `You are Neura Code performing a repository analysis.

Repository: ${owner}/${repo}
Default branch: ${meta.default_branch}
Description: ${meta.description || 'None'}
User request: ${question?.trim() || 'Review the repository architecture, important risks, and concrete improvement opportunities.'}

Repository tree sample:
${files.map((f) => f.path).join('\n')}

Selected source files:
${context}

Return a structured Markdown analysis with:
1. Architecture overview
2. Key files and responsibilities
3. Bugs or correctness risks
4. Security concerns
5. Performance/maintainability observations
6. Concrete next steps
Do not claim to have inspected files that were not supplied.`;

  const analysis = await generateCompletion({
    provider: agent.provider,
    model: agent.model,
    systemPrompt: agent.systemPrompt,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
  });

  return {
    repository: `${owner}/${repo}`,
    defaultBranch: meta.default_branch,
    stars: meta.stargazers_count,
    language: meta.language,
    truncated: Boolean(tree.truncated),
    filesInspected: selected.map((f) => f.path),
    analysis,
  };
}

export async function explainCode(input: { code: string; language?: string; task: string }) {
  if (!input.code.trim()) throw new AppError(400, 'Code is required.', 'INVALID_CODE');
  const agent = await getAgentConfig('code');
  const prompt = `Act as a senior software engineer.

Task: ${input.task}
Language: ${input.language || 'unknown'}

Code:
\`\`\`${input.language || ''}\n${input.code.slice(0, 80_000)}\n\`\`\`

Give a precise, practical answer. If debugging, identify likely root causes and fixes. If refactoring, preserve behavior unless explicitly asked otherwise.`;

  const result = await generateCompletion({
    provider: agent.provider,
    model: agent.model,
    systemPrompt: agent.systemPrompt,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.25,
  });

  return { result, agentId: agent.id, provider: agent.provider, model: agent.model };
}

/**
 * Reports whether the sandboxed code-execution feature is usable right now,
 * without actually attempting to run anything.
 *
 * Code execution shells out to `docker run` with network/capability
 * restrictions (see executeInDocker below). That only works on hosts where
 * the backend process can talk to a Docker daemon — it will not work on most
 * PaaS/serverless platforms (e.g. a container-per-request host with no
 * Docker-in-Docker, or a host with no daemon socket at all).
 *
 * Rather than let clients discover this by getting an unexpected 403/503 the
 * first time someone clicks "Run", callers (frontend or API consumers)
 * should call this first and hide/disable the run action when `available`
 * is false, showing `reason` to the user.
 */
export async function getCodeExecutionStatus(): Promise<{
  available: boolean;
  enabled: boolean;
  dockerDetected: boolean | null;
  reason: string | null;
}> {
  const enabled = process.env.CODE_EXECUTION_ENABLED === 'true';

  if (!enabled) {
    return {
      available: false,
      enabled: false,
      dockerDetected: null,
      reason:
        'Code execution is intentionally disabled on this deployment (CODE_EXECUTION_ENABLED=false). ' +
        'This feature requires a host that can run `docker run` (a VM or a host with Docker-in-Docker) — ' +
        'it does not work on most PaaS/serverless hosts. Enable it only after confirming Docker is available.',
    };
  }

  // Enabled: confirm the daemon is actually reachable so we can report a
  // precise reason instead of surfacing a raw docker/ENOENT error later.
  try {
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);
    await execFileAsync('docker', ['info'], { timeout: 3000 });
    return { available: true, enabled: true, dockerDetected: true, reason: null };
  } catch {
    return {
      available: false,
      enabled: true,
      dockerDetected: false,
      reason:
        'CODE_EXECUTION_ENABLED=true but the Docker daemon is not reachable from this host. ' +
        'Code execution will fail until Docker is installed and running here.',
    };
  }
}

export async function executeInDocker(input: { code: string; language: 'javascript' | 'python'; timeoutMs?: number }) {
  if (process.env.CODE_EXECUTION_ENABLED !== 'true') {
    throw new AppError(403, 'Secure code execution is disabled. Set CODE_EXECUTION_ENABLED=true after configuring Docker.', 'CODE_EXECUTION_DISABLED');
  }

  const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');

  const execFileAsync = promisify(execFile);
  const dir = await mkdtemp(join(tmpdir(), 'neura-code-'));
  const filename = input.language === 'python' ? 'main.py' : 'main.js';
  const image = input.language === 'python' ? 'python:3.12-alpine' : 'node:22-alpine';
  const command = input.language === 'python' ? ['python', `/workspace/${filename}`] : ['node', `/workspace/${filename}`];

  try {
    await writeFile(join(dir, filename), input.code.slice(0, 50_000), 'utf8');
    const timeout = Math.min(Math.max(input.timeoutMs ?? 5000, 1000), 10_000);
    const { stdout, stderr } = await execFileAsync('docker', [
      'run', '--rm',
      '--network', 'none',
      '--cpus', '0.5',
      '--memory', '128m',
      '--pids-limit', '64',
      '--read-only',
      '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges',
      '-v', `${dir}:/workspace:ro`,
      image,
      ...command,
    ], { timeout, maxBuffer: 512 * 1024 });

    return { stdout: stdout.slice(0, 20_000), stderr: stderr.slice(0, 20_000), timedOut: false };
  } catch (error: any) {
    const timedOut = error?.code === 'ETIMEDOUT';
    if (timedOut) throw new AppError(408, 'Execution timed out.', 'CODE_EXECUTION_TIMEOUT');
    if (error?.code === 'ENOENT') throw new AppError(503, 'Docker is not installed or not available to the backend.', 'DOCKER_UNAVAILABLE');
    return { stdout: String(error?.stdout || '').slice(0, 20_000), stderr: String(error?.stderr || error?.message || '').slice(0, 20_000), timedOut: false };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
