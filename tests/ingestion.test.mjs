import assert from "node:assert/strict";
import test from "node:test";
import { fetchWithRetry } from "../src/lib/rate-limit.ts";
import {
  parseAtomFeed,
  parseRssFeed,
} from "../src/lib/sources/feeds.ts";

test("RSS normalization strips markup and preserves attribution", () => {
  const items = parseRssFeed(
    `<?xml version="1.0"?>
      <rss><channel><item>
        <title><![CDATA[Example &amp; launch]]></title>
        <link>https://example.com/post?utm_source=rss</link>
        <pubDate>Thu, 20 Nov 2026 10:00:00 GMT</pubDate>
        <description><![CDATA[<p>A useful summary.</p>]]></description>
      </item></channel></rss>`,
    "TechCrunch",
    "test",
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Example & launch");
  assert.equal(items[0].summary, "A useful summary.");
  assert.equal(items[0].source, "TechCrunch");
});

test("Atom normalization reads the href-based link", () => {
  const items = parseAtomFeed(
    `<?xml version="1.0"?>
      <feed><entry>
        <title>8-K - Example Corp</title>
        <link rel="alternate" href="https://www.sec.gov/example"/>
        <updated>2026-11-20T11:00:00Z</updated>
        <summary>Current report</summary>
      </entry></feed>`,
    "SEC EDGAR",
    "test",
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].url, "https://www.sec.gov/example");
});

test("rate-limited requests retry with exponential backoff", async () => {
  let calls = 0;
  const delays = [];
  const fetchImpl = async () => {
    calls += 1;
    return calls < 3
      ? new Response("slow down", { status: 429 })
      : new Response("ok", { status: 200 });
  };

  const response = await fetchWithRetry("https://example.com", undefined, {
    fetchImpl,
    baseDelayMs: 10,
    maxRetries: 3,
    sleep: async (milliseconds) => delays.push(milliseconds),
  });

  assert.equal(response.status, 200);
  assert.equal(calls, 3);
  assert.deepEqual(delays, [10, 20]);
});
