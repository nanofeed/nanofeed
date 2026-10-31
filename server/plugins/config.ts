export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== 'production') return
  for (const key of [
    'DATABASE_URL',
    'BETTER_AUTH_URL',
    'BETTER_AUTH_SECRET',
    'ROOTCAP_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'CRON_SECRET',
  ]) {
    if (!process.env[key]) throw new Error(`Missing required production setting: ${key}`)
  }
  if (process.env.BETTER_AUTH_SECRET!.length < 32)
    throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters')
  if (process.env.ROOTCAP_SECRET!.length < 32)
    throw new Error('ROOTCAP_SECRET must contain at least 32 characters')
  const url = new URL(process.env.BETTER_AUTH_URL!)
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname))
    throw new Error('BETTER_AUTH_URL must use HTTPS in production')
  if (url.pathname !== '/' || url.search || url.hash)
    throw new Error('BETTER_AUTH_URL must be an origin without a path, query or fragment')
})
