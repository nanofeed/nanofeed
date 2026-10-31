export function positiveInteger(value: unknown, fallback: number, max: number) {
  const number = Number(value)
  return Number.isSafeInteger(number) && number > 0 ? Math.min(number, max) : fallback
}
