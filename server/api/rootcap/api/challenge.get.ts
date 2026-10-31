import { createRootcapChallenge } from '../../../utils/rootcap'

export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  return createRootcapChallenge()
})
