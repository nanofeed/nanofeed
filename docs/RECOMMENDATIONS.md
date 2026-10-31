---
title: Content recommendations
description: Understand how the For you feed balances freshness, interests, engagement, and author diversity.
category: Platform
order: 60
---

# Content recommendations

`GET /api/feed?filter=recommended` uses a deterministic hybrid ranker. Following and Latest offer predictable alternatives.

## Signals and scoring

The candidate pool is the latest 500 visible posts. Freshness decays over 48 hours. Engagement uses a capped logarithm of reactions, replies, and reposts with age decay, so old viral posts do not dominate. A followed author receives a boost. Hashtags from the viewer's last 100 reactions and 50 posts in the past 30 days build a capped topic affinity. Follow lookup is bounded at 2,000 relationships. Own posts and already loved posts receive a penalty. Greedy author diversification reduces repeated authors' scores as posts are selected. Ties use creation time and ID.

Every recommendation has a short explanation. Anonymous/new users receive freshness and community engagement ranking without personal signals. There are no external recommendation calls, paid ranking, cross-site tracking, or inferred sensitive traits.

## Pagination and privacy

For signed-in users, the first response includes a `snapshot` ID containing ranked post IDs and explanations. Send it on subsequent pages. Snapshots expire after 30 minutes, are tied to the signed-in user, and reject ownership mismatches and expiry with HTTP 410. Missing snapshots after page 1 return HTTP 400. Refresh creates a new ranking.

Guest recommendations return only the first page, with `snapshot: null` and `hasMore: false`, and never persist a snapshot. A guest recommendation request with a page beyond 1 or a snapshot returns HTTP 400. This deliberately replaces anonymous snapshot pagination to prevent unauthenticated requests from growing the snapshot table. Guests can paginate Latest or sign in for paginated recommendations.

Every page rechecks post, author, parent, and repost-target visibility. A cached ranking is therefore not permission to display a post that has since been hidden or whose author became inactive.

Moderation or account deactivation can therefore shorten a page. `total` and `hasMore` describe positions in the original snapshot, not a live content count. Recommended-feed requests attempt expired-snapshot cleanup at most once every five minutes across server instances, using one shared database claim. Cleanup failures are logged without breaking the feed. Daily cleanup remains the fallback when there is no feed traffic. Snapshots contain no post bodies or email addresses.

Following requires authentication. Latest/Following use chronological database pagination. All feed responses are private and non-cacheable. The client ignores stale responses when switching tabs and offers a retry on errors.

## Operational limits

This is a bounded heuristic engine, not a trained ML model. The 500-post candidate horizon favors recent activity; it is not an exhaustive search of historical content. Ranking and topic signals are recomputed on refresh. Monitor latency, database load, snapshot growth, and recommendation quality before changing weights or increasing limits. Keep the daily cleanup job enabled.

Unit tests cover cold start, recency, topic/follow boosts, engagement caps, author diversity, deterministic ties, and input immutability. Integration tests cover visibility, viewer-bound snapshots, expiry, and moderation after ranking.
