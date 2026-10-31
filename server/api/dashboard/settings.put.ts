import prisma from '../../db/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  if (
    typeof body?.verificationRequestsEnabled !== 'boolean' ||
    typeof body?.maintenanceEnabled !== 'boolean' ||
    typeof body?.maintenanceMessage !== 'string' ||
    !body.maintenanceMessage.trim() ||
    body.maintenanceMessage.trim().length > 500
  ) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid site settings' })
  }
  // Omitted by older clients: preserve any existing schedule.
  let maintenanceEndsAt: Date | null | undefined
  if (body.maintenanceEndsAt !== undefined) {
    if (body.maintenanceEndsAt === null) maintenanceEndsAt = null
    else if (
      typeof body.maintenanceEndsAt === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(body.maintenanceEndsAt)
    ) {
      maintenanceEndsAt = new Date(body.maintenanceEndsAt)
      if (
        Number.isNaN(maintenanceEndsAt.getTime()) ||
        maintenanceEndsAt.toISOString() !== body.maintenanceEndsAt
      )
        throw createError({ statusCode: 400, statusMessage: 'Invalid maintenance end time' })
    } else throw createError({ statusCode: 400, statusMessage: 'Invalid maintenance end time' })
  }
  const settings = {
    verificationRequestsEnabled: body.verificationRequestsEnabled,
    maintenanceEnabled: body.maintenanceEnabled,
    maintenanceMessage: body.maintenanceMessage.trim(),
    ...(maintenanceEndsAt !== undefined ? { maintenanceEndsAt } : {}),
  }
  return prisma.siteSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...settings },
    update: settings,
  })
})
