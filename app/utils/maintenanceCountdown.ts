export function maintenanceCountdown(end: string | Date, now: number) {
  const remaining = Math.max(0, Math.ceil((new Date(end).getTime() - now) / 1000))
  return {
    days: Math.floor(remaining / 86400),
    hours: Math.floor((remaining % 86400) / 3600),
    minutes: Math.floor((remaining % 3600) / 60),
    seconds: remaining % 60,
    expired: remaining === 0,
  }
}
