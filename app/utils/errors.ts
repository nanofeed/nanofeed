export function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const data = (
      error as {
        data?: {
          error?: unknown
          statusMessage?: unknown
          data?: { error?: unknown; statusMessage?: unknown }
        }
      }
    ).data
    // Nitro wraps createError({ data: ... }) inside the response's data field.
    for (const message of [
      data?.error,
      data?.data?.error,
      data?.statusMessage,
      data?.data?.statusMessage,
    ]) {
      if (typeof message === 'string' && message.trim()) return message
    }
  }
  return error instanceof Error && error.message.trim() ? error.message : fallback
}
