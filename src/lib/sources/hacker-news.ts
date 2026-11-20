import { fetchWithRetry } from "../rate-limit";
import type { SourceItem } from "../types";

interface HackerNewsHit {
  objectID: string;
  title?: string;
  story_title?: string;
  story_url?: string;
  url?: string;
  created_at: string;
  points?: number;
  num_comments?: number;
}

interface HackerNewsResponse {
  hits: HackerNewsHit[];
}

export async function fetchHackerNews(limit = 20): Promise<SourceItem[]> {
  const url = new URL("https://hn.algolia.com/api/v1/search");
  url.searchParams.set("tags", "front_page");
  url.searchParams.set("hitsPerPage", String(limit));

  const response = await fetchWithRetry(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Hacker News returned ${response.status}`);
  }

  const data = (await response.json()) as HackerNewsResponse;
  return data.hits
    .filter((hit) => hit.title || hit.story_title)
    .map((hit) => ({
      id: `hn-${hit.objectID}`,
      source: "Hacker News" as const,
      title: hit.title ?? hit.story_title ?? "Untitled Hacker News story",
      url:
        hit.url ??
        hit.story_url ??
        `https://news.ycombinator.com/item?id=${hit.objectID}`,
      publishedAt: hit.created_at,
      engagement: (hit.points ?? 0) + (hit.num_comments ?? 0) * 2,
    }));
}
