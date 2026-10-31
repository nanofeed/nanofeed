import { getSiteSettings } from '../utils/siteSettings'

// Block every API that can expose posts or change social interactions while allowing
// authentication, account recovery, and the owner dashboard to remain available.
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  const restricted =
    /^\/api\/(?:feed|posts|hashtags|search|notifications)(?:\/|$)/.test(path) ||
    /^\/api\/contributors\/?$/.test(path) ||
    /^\/api\/users\/[^/]+\/(?:follow|followers|following|follow-stats)(?:\/|$)/.test(path)
  const profileMatch = /^\/api\/(users|contributors)\/([^/]+)\/?$/.exec(path)
  // The current user's account endpoint and mutation routes remain available.
  const isProfile =
    profileMatch &&
    (profileMatch[1] === 'contributors' ||
      (['GET', 'HEAD'].includes(event.method) && profileMatch[2] !== 'me'))
  if (!restricted && !isProfile) return
  const settings = await getSiteSettings()
  if (settings.maintenanceEnabled) {
    if (
      !restricted &&
      isProfile &&
      event.context.session?.user?.username &&
      profileMatch[2] === encodeURIComponent(event.context.session.user.username)
    )
      return
    setHeader(event, 'Cache-Control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Site maintenance',
      data: { message: settings.maintenanceMessage },
    })
  }
})
