import { auth } from '../../utils/auth'
import { consumeRootcapToken } from '../../utils/rootcap'

const allowed = new Set(['sign-in/social', 'callback/github', 'get-session', 'sign-out', 'error'])

export default defineEventHandler(async (event) => {
  // Profile edits go through our validated API. Expose only GitHub sign-in/session routes.
  const path = getRequestURL(event)
    .pathname.replace(/^\/api\/auth\//, '')
    .replace(/\/$/, '')
  if (!allowed.has(path)) throw createError({ statusCode: 404 })
  if (
    path === 'sign-in/social' &&
    !(await consumeRootcapToken(getHeader(event, 'x-rootcap-token')))
  ) {
    throw createError({ statusCode: 403, statusMessage: 'Complete human verification first' })
  }
  return auth.handler(toWebRequest(event))
})
