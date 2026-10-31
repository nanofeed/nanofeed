import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'

// Execute the actual deployment entry point with synthetic API replies and an
// accelerated clock. No request reaches Vercel and no credentials are read.
const harness = `
  const statuses = JSON.parse(process.argv[1]);
  let polls = 0;
  let now = 0;
  Date.now = () => now;
  globalThis.setTimeout = (callback, delay) => { now += delay; queueMicrotask(callback); };
  globalThis.fetch = async (_url, options) => ({
    ok: true,
    json: async () => {
      if (options.method === 'POST') return { id: 'synthetic-deployment' };
      const status = statuses[Math.min(polls++, statuses.length - 1)];
      console.log('Poll ' + polls);
      return { url: 'synthetic.example.test', ...status };
    },
  });
  await import('./scripts/deploy.mjs');
`
const deploy = (statuses: object[]) =>
  spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', harness, JSON.stringify(statuses)],
    {
      encoding: 'utf8',
      timeout: 5000,
      env: {
        VERCEL_TOKEN: 'synthetic',
        VERCEL_PROJECT_ID: 'synthetic',
        VERCEL_PROJECT_NAME: 'synthetic',
        GITHUB_REPOSITORY_ID: '1',
        DEPLOY_SHA: 'synthetic',
      },
    },
  )

it('waits for both READY and confirmed alias assignment before succeeding', () => {
  const result = deploy([
    { readyState: 'BUILDING', aliasAssigned: true },
    { readyState: 'READY', aliasAssigned: false },
    { readyState: 'READY' },
    { readyState: 'READY', aliasAssigned: true },
  ])
  expect(result.status).toBe(0)
  expect(result.stdout.match(/^Poll /gm)).toHaveLength(4)
  expect(result.stdout).toContain('Production ready: https://synthetic.example.test')
})

it('fails when production alias assignment reports an error even after READY', () => {
  const result = deploy([
    {
      readyState: 'READY',
      aliasAssigned: true,
      aliasError: { code: 'alias_failed', message: 'Synthetic alias failure' },
    },
  ])
  expect(result.status).toBe(1)
  expect(result.stderr).toContain(
    'Production alias assignment failed: alias_failed: Synthetic alias failure',
  )
  expect(result.stdout).not.toContain('Production ready:')
})

it('includes alias assignment in the existing readiness deadline', () => {
  const result = deploy([{ readyState: 'READY', aliasAssigned: false }])
  expect(result.status).toBe(1)
  expect(result.stdout.match(/^Poll /gm)).toHaveLength(240)
  expect(result.stderr).toContain('Deployment readiness or production alias assignment timed out')
  expect(result.stdout).not.toContain('Production ready:')
})

it.each(['ERROR', 'CANCELED'])('still fails for a deployment in %s state', (readyState) => {
  const result = deploy([{ readyState, aliasAssigned: true }])
  expect(result.status).toBe(1)
  expect(result.stderr).toContain(`Deployment ${readyState}`)
  expect(result.stdout).not.toContain('Production ready:')
})
