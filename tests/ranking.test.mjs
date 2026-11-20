import assert from "node:assert/strict";
import test from "node:test";
import { rankSignal } from "../src/lib/rank.ts";
import {
  canonicalizeUrl,
  clusterSourceItems,
  titleSimilarity,
} from "../src/lib/dedupe.ts";

const now = new Date("2026-11-20T12:00:00.000Z");

test("cross-source confirmation increases a signal score", () => {
  const single = rankSignal({
    sourceCount: 1,
    sourceReliability: 0.9,
    engagement: 100,
    eventMagnitude: 0.8,
    novelty: 0.8,
    publishedAt: now,
    now,
  });
  const corroborated = rankSignal({
    sourceCount: 3,
    sourceReliability: 0.9,
    engagement: 100,
    eventMagnitude: 0.8,
    novelty: 0.8,
    publishedAt: now,
    now,
  });

  assert.ok(corroborated.total > single.total);
  assert.equal(corroborated.crossSourceConfirmation, 20);
});

test("recency decays after a 48-hour half-life", () => {
  const fresh = rankSignal({
    sourceCount: 1,
    sourceReliability: 1,
    engagement: 0,
    eventMagnitude: 0,
    novelty: 0,
    publishedAt: now,
    now,
  });
  const old = rankSignal({
    sourceCount: 1,
    sourceReliability: 1,
    engagement: 0,
    eventMagnitude: 0,
    novelty: 0,
    publishedAt: new Date(now.getTime() - 96 * 3_600_000),
    now,
  });

  assert.ok(fresh.recency > old.recency);
  assert.equal(fresh.total, 25);
});

test("URLs are canonicalized before deduplication", () => {
  assert.equal(
    canonicalizeUrl(
      "https://www.example.com/story/?utm_source=test&utm_campaign=launch&id=42#top",
    ),
    "https://example.com/story?id=42",
  );
});

test("source items with the same story form one cluster", () => {
  const items = [
    {
      id: "one",
      source: "Hacker News",
      title: "Open-source agent runtime adds deterministic replay",
      url: "https://news.ycombinator.com/item?id=1",
      publishedAt: now.toISOString(),
    },
    {
      id: "two",
      source: "TechCrunch",
      title: "Open source agent runtime adds deterministic replay",
      url: "https://techcrunch.com/example",
      publishedAt: now.toISOString(),
    },
  ];

  assert.ok(titleSimilarity(items[0].title, items[1].title) >= 0.72);
  const clusters = clusterSourceItems(items);
  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].items.length, 2);
});
