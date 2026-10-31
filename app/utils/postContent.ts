export type PostPart =
  { type: 'text'; content: string } | { type: 'code'; content: string; language: string }

// Only closed fences are rendered as code; unfinished fences remain ordinary text.
export function splitPostContent(content: string): PostPart[] {
  const parts: PostPart[] = []
  const fences = /```([^`\s]*)[ \t]*\r?\n([\s\S]*?)```/g
  let cursor = 0
  for (const match of content.matchAll(fences)) {
    if (match.index > cursor)
      parts.push({ type: 'text', content: content.slice(cursor, match.index) })
    parts.push({ type: 'code', language: match[1] || 'text', content: match[2] || '' })
    cursor = match.index + match[0].length
  }
  if (cursor < content.length) parts.push({ type: 'text', content: content.slice(cursor) })
  return parts
}
