import { clusterSourceItems } from "./dedupe";
import { rankSignal } from "./rank";
import {
  fetchPrNewswire,
  fetchSecFilings,
  fetchTechCrunch,
} from "./sources/feeds";
import { fetchHackerNews } from "./sources/hacker-news";
import { fetchProductHunt } from "./sources/product-hunt";
import type {
  IngestReport,
  SignalCategory,
  SignalEvent,
  SignalEventType,
  SourceItem,
  SourceKind,
} from "./types";

const RELIABILITY: Record<SourceKind, number> = {
  "Product Hunt": 0.72,
  "Hacker News": 0.78,
  TechCrunch: 0.88,
  "SEC EDGAR": 1,
  "PR Newswire": 0.8,
};

function inferCategory(item: SourceItem): SignalCategory {
  const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
  if (item.source === "SEC EDGAR") return "Markets";
  if (/(fund|raise|acquisition|acquire|merger|revenue|ipo)/.test(text)) {
    return "Markets";
  }
  if (/(fintech|payment|bank|wallet|settlement|treasury)/.test(text)) {
    return "Fintech";
  }
  if (/(model|agent|llm|inference|embedding|openai|anthropic)/.test(text)) {
    return "AI & Models";
  }
  if (/(developer|github|api|database|sdk|devops|typescript)/.test(text)) {
    return "Developer Tools";
  }
  return "Product";
}

function inferEventType(item: SourceItem): SignalEventType {
  const text = `${item.title} ${item.summary ?? ""}`.toLowerCase();
  if (/(acquire|acquisition|merger|8-k)/.test(text)) return "Acquisition";
  if (/(raise|funding|series [a-e]|seed round|invest)/.test(text)) {
    return "Funding";
  }
  if (/(launch|introducing|show hn|now available)/.test(text)) return "Launch";
  if (/(release|version|v\d|update|ships)/.test(text)) return "Release";
  return "Discussion";
}

function magnitudeFor(type: SignalEventType): number {
  return {
    Acquisition: 0.96,
    Funding: 0.82,
    Release: 0.62,
    Launch: 0.66,
    Discussion: 0.38,
  }[type];
}

function explain(category: SignalCategory, type: SignalEventType): string {
  if (type === "Acquisition") {
    return `Merger and filing activity can reveal consolidation pressure in ${category.toLowerCase()} before it appears in product marketing.`;
  }
  if (type === "Funding") {
    return `Capital deployment is an early indicator of where buyers and operators expect ${category.toLowerCase()} to grow.`;
  }
  if (category === "AI & Models") {
    return "Model and runtime changes can shift the cost, reliability, and privacy profile of AI products.";
  }
  if (category === "Developer Tools") {
    return "Developer workflow changes spread quickly through teams and can reset expectations for build and delivery speed.";
  }
  return "Cross-source attention can identify an emerging narrative before standalone headlines make it obvious.";
}

function toSignal(items: SourceItem[], now: Date): SignalEvent {
  const representative =
    [...items].sort(
      (left, right) =>
        Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
    )[0] ?? items[0];
  const category = inferCategory(representative);
  const eventType = inferEventType(representative);
  const uniqueSources = new Set(items.map((item) => item.source));
  const sourceReliability =
    items.reduce((sum, item) => sum + RELIABILITY[item.source], 0) / items.length;
  const engagement = items.reduce(
    (sum, item) => sum + (item.engagement ?? 0),
    0,
  );
  const scoreBreakdown = rankSignal({
    sourceCount: uniqueSources.size,
    sourceReliability,
    engagement,
    eventMagnitude: magnitudeFor(eventType),
    novelty: uniqueSources.has("Product Hunt") ? 0.86 : 0.76,
    publishedAt: new Date(representative.publishedAt),
    now,
  });
  const entityMatch = representative.title.match(
    /\b(?:[A-Z][A-Za-z0-9.+-]+(?:\s+[A-Z][A-Za-z0-9.+-]+){0,2})\b/,
  );

  return {
    id: representative.id,
    title: representative.title.length > 150
      ? `${representative.title.slice(0, 147)}...`
      : representative.title,
    summary:
      representative.summary?.trim() ||
      `A developing ${eventType.toLowerCase()} signal detected across ${uniqueSources.size} source${uniqueSources.size === 1 ? "" : "s"}.`,
    whyItMatters: explain(category, eventType),
    category,
    eventType,
    publishedAt: representative.publishedAt,
    entities: entityMatch ? [entityMatch[0]] : [representative.source],
    tags: [...uniqueSources],
    sources: items,
    score: scoreBreakdown.total,
    scoreBreakdown,
    confidence:
      uniqueSources.size >= 3
        ? "High"
        : uniqueSources.size === 2
          ? "Medium"
          : "Developing",
    isDemo: false,
  };
}

export async function ingestLiveSignals(): Promise<IngestReport> {
  const requests = [
    { source: "Hacker News" as const, request: fetchHackerNews(30) },
    { source: "TechCrunch" as const, request: fetchTechCrunch(25) },
    { source: "SEC EDGAR" as const, request: fetchSecFilings(25) },
    { source: "PR Newswire" as const, request: fetchPrNewswire(25) },
    { source: "Product Hunt" as const, request: fetchProductHunt(20) },
  ] as const;

  const settled = await Promise.allSettled(
    requests.map(({ request }) => request),
  );
  const items: SourceItem[] = [];
  const errors: IngestReport["errors"] = [];
  const liveSources: SourceKind[] = [];

  settled.forEach((result, index) => {
    const source = requests[index].source;
    if (result.status === "fulfilled") {
      items.push(...result.value);
      if (result.value.length) liveSources.push(source);
      return;
    }
    errors.push({
      source,
      message:
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason),
    });
  });

  const now = new Date();
  const clusters = clusterSourceItems(items);
  const signals = clusters
    .map((cluster) => toSignal(cluster.items, now))
    .sort(
      (left, right) =>
        right.score - left.score ||
        Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
    );

  return {
    signals: signals.slice(0, 80),
    generatedAt: now.toISOString(),
    received: items.length,
    normalized: items.length,
    merged: Math.max(0, items.length - clusters.length),
    liveSources,
    errors,
  };
}
