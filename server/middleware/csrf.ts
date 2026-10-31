// App mutation routes use cookies too; Better Auth protects its own routes.
export default defineEventHandler((event) => {
  if (
    !event.path.startsWith('/api/') ||
    event.path.startsWith('/api/auth/') ||
    ['GET', 'HEAD', 'OPTIONS'].includes(event.method)
  )
    return
  const origin = getHeader(event, 'origin')
  const expected = new URL(process.env.BETTER_AUTH_URL || 'http://localhost:3000').origin
  if (!origin || origin !== expected) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid request origin' })
  }
})
