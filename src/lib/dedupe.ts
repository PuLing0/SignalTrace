import type { SourceItem } from "./types";

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "for",
  "from",
  "in",
  "is",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "new",
]);

const TRACKING_PARAMS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "source",
  "utm_campaign",
  "utm_content",
  "utm_medium",
  "utm_source",
  "utm_term",
]);

export function canonicalizeUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    for (const key of [...url.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    const search = url.searchParams.toString();
    return `${url.protocol}//${url.host}${url.pathname}${search ? `?${search}` : ""}`;
  } catch {
    return value.trim().toLowerCase();
  }
}

export function titleTokens(value: string): Set<string> {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  );
}

export function titleSimilarity(left: string, right: string): number {
  const a = titleTokens(left);
  const b = titleTokens(right);
  if (!a.size || !b.size) return 0;

  let overlap = 0;
  for (const token of a) {
    if (b.has(token)) overlap += 1;
  }

  return overlap / Math.min(a.size, b.size);
}

export function areLikelySameEvent(left: SourceItem, right: SourceItem) {
  return (
    canonicalizeUrl(left.url) === canonicalizeUrl(right.url) ||
    titleSimilarity(left.title, right.title) >= 0.72
  );
}

export interface SourceCluster {
  items: SourceItem[];
  representative: SourceItem;
}

export function clusterSourceItems(items: SourceItem[]): SourceCluster[] {
  const clusters: SourceCluster[] = [];

  for (const item of items) {
    const match = clusters.find((cluster) =>
      areLikelySameEvent(cluster.representative, item),
    );

    if (match) {
      if (
        !match.items.some(
          (existing) =>
            existing.source === item.source &&
            canonicalizeUrl(existing.url) === canonicalizeUrl(item.url),
        )
      ) {
        match.items.push(item);
      }
      continue;
    }

    clusters.push({ items: [item], representative: item });
  }

  return clusters;
}
