// Uses the project's connected GitHub repository and Vercel's production env.
const required = [
  'VERCEL_TOKEN',
  'VERCEL_PROJECT_ID',
  'VERCEL_PROJECT_NAME',
  'GITHUB_REPOSITORY_ID',
  'DEPLOY_SHA',
]
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`)
const team = process.env.VERCEL_TEAM_ID
async function api(path, body) {
  const url = new URL(path, 'https://api.vercel.com')
  if (team) url.searchParams.set('teamId', team)
  const response = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok)
    throw new Error(
      `Vercel API returned HTTP ${response.status}; inspect the deployment in Vercel.`,
    )
  return response.json()
}
const deployment = await api('/v13/deployments', {
  name: process.env.VERCEL_PROJECT_NAME,
  project: process.env.VERCEL_PROJECT_ID,
  target: 'production',
  gitSource: {
    type: 'github',
    repoId: process.env.GITHUB_REPOSITORY_ID,
    ref: process.env.DEPLOY_SHA,
  },
})
if (!deployment.id) throw new Error('Vercel did not return a deployment ID')
console.log(`Deployment created: ${deployment.id}`)
const deadline = Date.now() + 20 * 60_000
while (Date.now() < deadline) {
  const status = await api(`/v13/deployments/${encodeURIComponent(deployment.id)}`)
  if (status.aliasError)
    throw new Error(
      `Production alias assignment failed: ${status.aliasError.code}: ${status.aliasError.message}`,
    )
  if (['ERROR', 'CANCELED'].includes(status.readyState))
    throw new Error(`Deployment ${status.readyState}`)
  if (status.readyState === 'READY' && status.aliasAssigned === true) {
    console.log(`Production ready: https://${status.url}`)
    process.exit(0)
  }
  await new Promise((resolve) => setTimeout(resolve, 5000))
}
throw new Error(
  'Deployment readiness or production alias assignment timed out; inspect Vercel before retrying.',
)
