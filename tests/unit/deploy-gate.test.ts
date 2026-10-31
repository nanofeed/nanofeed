import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { parse } from 'yaml'
import { expect, it } from 'vitest'

it('requires an explicit traffic cutover confirmation before production migrations', () => {
  const workflow = parse(readFileSync('.github/workflows/deploy.yml', 'utf8'))
  expect(workflow.on.workflow_dispatch.inputs.traffic_cutover_confirmed).toMatchObject({
    type: 'boolean',
    required: true,
    default: false,
  })
  const steps = workflow.jobs.deploy.steps as {
    name?: string
    run?: string
    env?: Record<string, string>
  }[]
  const gate = steps.findIndex((step) => step.name === 'Confirm production traffic cutover')
  const migration = steps.findIndex((step) => step.run === 'npm run db:deploy')
  expect(gate).toBeGreaterThanOrEqual(0)
  expect(migration).toBeGreaterThan(gate)
  expect(steps[gate]!.env?.TRAFFIC_CUTOVER_CONFIRMED).toBe(
    '${{ inputs.traffic_cutover_confirmed }}',
  )
  for (const confirmation of ['', 'false', 'true']) {
    const result = spawnSync('bash', ['-e', '-c', steps[gate]!.run!], {
      env: { ...process.env, TRAFFIC_CUTOVER_CONFIRMED: confirmation },
    })
    expect(result.status).toBe(confirmation === 'true' ? 0 : 1)
  }
})
