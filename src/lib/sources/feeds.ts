import { fetchWithRetry } from "../rate-limit";
import type { SourceItem, SourceKind } from "../types";

const ENTITIES: Record<string, string> = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"',
};

export function decodeFeedText(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
      if (entity.startsWith("#x")) {
        return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      }
      if (entity.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      }
      return ENTITIES[entity.toLowerCase()] ?? `&${entity};`;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function readTag(xml: string, tag: string): string {
  const match = xml.match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  return match?.[1] ?? "";
}

function parseBlocks(xml: string, tag: "item" | "entry"): string[] {
  return [
    ...xml.matchAll(
      new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi"),
    ),
  ].map((match) => match[1]);
}

export function parseRssFeed(
  xml: string,
  source: SourceKind,
  sourcePrefix: string,
): SourceItem[] {
  return parseBlocks(xml, "item").flatMap((item, index) => {
    const title = decodeFeedText(readTag(item, "title"));
    const link = decodeFeedText(readTag(item, "link"));
    const date =
      readTag(item, "pubDate") ||
      readTag(item, "dc:date") ||
      new Date().toISOString();
    if (!title || !link) return [];

    return [
      {
        id: `${sourcePrefix}-${index}-${Buffer.from(link).toString("base64url").slice(0, 12)}`,
        source,
        title,
        url: link,
        publishedAt: new Date(date).toISOString(),
        summary: decodeFeedText(
          readTag(item, "description") || readTag(item, "content:encoded"),
        ).slice(0, 500),
      },
    ];
  });
}

export function parseAtomFeed(
  xml: string,
  source: SourceKind,
  sourcePrefix: string,
): SourceItem[] {
  return parseBlocks(xml, "entry").flatMap((entry, index) => {
    const title = decodeFeedText(readTag(entry, "title"));
    const linkMatch = entry.match(
      /<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i,
    );
    const link = decodeFeedText(linkMatch?.[1] ?? "");
    const date =
      readTag(entry, "updated") ||
      readTag(entry, "published") ||
      new Date().toISOString();
    if (!title || !link) return [];

    return [
      {
        id: `${sourcePrefix}-${index}-${Buffer.from(link).toString("base64url").slice(0, 12)}`,
        source,
        title,
        url: link,
        publishedAt: new Date(date).toISOString(),
        summary: decodeFeedText(readTag(entry, "summary")).slice(0, 500),
      },
    ];
  });
}

export async function fetchTechCrunch(limit = 20): Promise<SourceItem[]> {
  const response = await fetchWithRetry("https://techcrunch.com/feed/", {
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml",
      "User-Agent": "SignalTrace/1.0 (+https://github.com/PuLing0/SignalTrace)",
    },
  });
  if (!response.ok) {
    throw new Error(`TechCrunch RSS returned ${response.status}`);
  }
  return parseRssFeed(await response.text(), "TechCrunch", "tc").slice(0, limit);
}

export async function fetchSecFilings(limit = 20): Promise<SourceItem[]> {
  const response = await fetchWithRetry(
    "https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&dateb=&owner=include&count=40&output=atom",
    {
      headers: {
        Accept: "application/atom+xml, application/xml, text/xml",
        "User-Agent":
          "SignalTrace research contact@example.com (+https://github.com/PuLing0/SignalTrace)",
      },
    },
  );
  if (!response.ok) {
    throw new Error(`SEC EDGAR returned ${response.status}`);
  }
  return parseAtomFeed(await response.text(), "SEC EDGAR", "sec").slice(
    0,
    limit,
  );
}

export async function fetchPrNewswire(limit = 20): Promise<SourceItem[]> {
  const response = await fetchWithRetry(
    "https://www.prnewswire.com/rss/mergers-and-acquisitions-latest-news/mergers-and-acquisitions-latest-news-list.rss",
    {
      headers: {
        Accept: "application/rss+xml, application/xml, text/xml",
        "User-Agent": "SignalTrace/1.0 (+https://github.com/PuLing0/SignalTrace)",
      },
    },
  );
  if (!response.ok) {
    throw new Error(`PR Newswire RSS returned ${response.status}`);
  }
  return parseRssFeed(
    await response.text(),
    "PR Newswire",
    "prn",
  ).slice(0, limit);
}
