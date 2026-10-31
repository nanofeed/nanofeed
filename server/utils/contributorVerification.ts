const repository = 'https://api.github.com/repos/nanofeed/nanofeed'

export function parseCommit(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const input = value.trim()
  const match =
    /^(?:https:\/\/github\.com\/nanofeed\/nanofeed\/commit\/)?([a-f0-9]{7,40})\/?$/i.exec(input)
  return match?.[1]?.toLowerCase() ?? null
}

export class GitHubUnavailable extends Error {
  constructor(
    public readonly reason: 'credentials' | 'rate_limit' | 'network' | 'response' = 'response',
    public readonly status?: number,
  ) {
    super(`GitHub verification failed: ${reason}`)
  }
}

async function github(path: string, accountToken?: string): Promise<unknown | null> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'NanoFeed',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  // Use the account's OAuth authorization when the deployment has no token or
  // its shared token is rejected/exhausted. Never take credentials from the client.
  const tokens = [
    ...new Set(
      [process.env.GITHUB_CONTRIBUTORS_TOKEN?.trim(), accountToken].filter(
        (token): token is string => !!token,
      ),
    ),
  ]
  const attempts: (string | undefined)[] = tokens.length ? tokens : [undefined]
  for (const [index, token] of attempts.entries()) {
    const requestHeaders = { ...headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    let response: Response
    try {
      response = await fetch(`${repository}${path}`, {
        headers: requestHeaders,
        signal: AbortSignal.timeout(5000),
        redirect: 'error',
      })
    } catch {
      throw new GitHubUnavailable('network')
    }
    if (response.status === 404) return null
    if (!response.ok) {
      const canTryAccount = [401, 403, 429].includes(response.status) && index < attempts.length - 1
      // Consume/cancel before retrying without logging response bodies or credentials.
      await response.body?.cancel()
      if (canTryAccount) continue
      const reason =
        response.status === 401
          ? 'credentials'
          : response.status === 429 || response.headers?.get('x-ratelimit-remaining') === '0'
            ? 'rate_limit'
            : 'response'
      throw new GitHubUnavailable(reason, response.status)
    }
    try {
      return await response.json()
    } catch {
      throw new GitHubUnavailable('response', response.status)
    }
  }
  throw new GitHubUnavailable()
}

export async function verifyContributorCommit(
  ref: string,
  githubId: string,
  accountToken?: string,
): Promise<string | null> {
  const commit = (await github(`/commits/${ref}`, accountToken)) as {
    sha?: unknown
    author?: { id?: unknown } | null
  } | null
  if (!commit) return null
  if (typeof commit.sha !== 'string' || !/^[a-f0-9]{40}$/i.test(commit.sha))
    throw new GitHubUnavailable()
  if (String(commit.author?.id) !== githubId) return null
  const repo = (await github('', accountToken)) as { default_branch?: unknown } | null
  if (!repo || typeof repo.default_branch !== 'string' || !repo.default_branch)
    throw new GitHubUnavailable()
  const comparison = (await github(
    `/compare/${commit.sha}...${encodeURIComponent(repo.default_branch)}`,
    accountToken,
  )) as { status?: unknown } | null
  if (!comparison || typeof comparison.status !== 'string') throw new GitHubUnavailable()
  return comparison.status === 'ahead' || comparison.status === 'identical' ? commit.sha : null
}
