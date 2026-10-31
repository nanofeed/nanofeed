import { solveRootcapChallenge } from '../../../utils/rootcap'

export default defineEventHandler(async (event) => {
  setHeader(event, 'Cache-Control', 'no-store')
  const request = toWebRequest(event)
  const reader = request.body?.getReader()
  if (!reader) throw createError({ statusCode: 400, statusMessage: 'Missing verification' })
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    size += value.byteLength
    if (size > 16 * 1024) {
      await reader.cancel()
      throw createError({ statusCode: 413, statusMessage: 'Verification is too large' })
    }
    chunks.push(value)
  }
  let body: unknown
  try {
    body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    throw createError({ statusCode: 400, statusMessage: 'Invalid verification' })
  }
  const result = await solveRootcapChallenge(body)
  if (!result.success) throw createError({ statusCode: 403, statusMessage: 'Invalid verification' })
  return result
})
