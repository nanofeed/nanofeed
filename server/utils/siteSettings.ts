import prisma from '../db/prisma'

export const defaultSiteSettings = {
  verificationRequestsEnabled: true,
  maintenanceEnabled: false,
  maintenanceMessage: 'Site under construction. Please check back soon.',
  maintenanceEndsAt: null,
}

export async function getSiteSettings() {
  return (await prisma.siteSettings.findUnique({ where: { id: 1 } })) ?? defaultSiteSettings
}
