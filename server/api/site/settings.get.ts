import { getSiteSettings } from '../../utils/siteSettings'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return getSiteSettings()
})
