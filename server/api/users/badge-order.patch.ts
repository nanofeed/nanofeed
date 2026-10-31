import prisma from '../../db/prisma'
import { orderedBadges } from '../../../shared/utils/badges'

export default defineEventHandler(async (event) => {
  const user = event.context.session?.user
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  const body = await readBody<{ badgeOrder?: unknown }>(event)
  const order = body?.badgeOrder
  const earned = orderedBadges(user)
  if (
    !Array.isArray(order) ||
    order.length > earned.length ||
    new Set(order).size !== order.length ||
    order.some(
      (badge) => typeof badge !== 'string' || !earned.includes(badge as (typeof earned)[number]),
    )
  )
    throw createError({ statusCode: 400, statusMessage: 'Choose only badges you have earned.' })
  await prisma.user.update({ where: { id: user.id }, data: { badgeOrder: order } })
  return { badgeOrder: order }
})
