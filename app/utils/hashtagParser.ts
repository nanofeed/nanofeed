/**
 * app/utils/hashtagParser.ts
 * NanoFeed — Client-side Hashtag Parser & Renderer
 *
 * Parses post content and wraps hashtags in clickable NuxtLink elements.
 * Used in PostCard and FeedItem to render clickable hashtags.
 */

/**
 * Extract hashtag strings from content (without #)
 */
export function extractHashtags(content: string): string[] {
  const matches = content.match(/#([a-zA-Z0-9_]+)/g)
  if (!matches) return []
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))]
}

/**
 * convert raw post content into HTML with clickable hashtag and mention links.
 */
export function renderContent(content: string): string {
  // Escape HTML to prevent XSS
  const escaped = content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

  // Replace hashtags with links
  let result = escaped.replace(
    /#([a-zA-Z0-9_]+)/g,
    '<a href="/hashtags/$1" class="hashtag">#$1</a>',
  )

  // Replace mentions with links
  result = result.replace(/@(\w+)/g, '<a href="/profile/$1" class="mention">@$1</a>')

  return result
}

// Keep the old name as an alias for compatibility if needed, but we'll update PostCard
export const renderContentWithHashtags = renderContent
