# SignalTrace

**See the signal before it becomes the headline.**

SignalTrace is an explainable early-signal radar for the technology ecosystem.
It combines product launches, builder attention, funding coverage and public
market filings, then ranks emerging events with a deterministic, auditable
score.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Tests](https://img.shields.io/badge/tests-node%3Atest-0b7164)

## What it does

- Ingests live items from Hacker News, TechCrunch RSS, PR Newswire M&A coverage,
  SEC EDGAR and optionally Product Hunt.
- Normalizes timestamps, source URLs, titles and summaries.
- Canonicalizes URLs and clusters duplicate events across sources.
- Produces an explainable 0–100 score using cross-source confirmation, event
  magnitude, velocity, recency, novelty and source reliability.
- Supports sector, date, score and text filters, ranked sorting and a local
  watchlist.
- Shows the evidence and score anatomy for every signal.

The default view is a deterministic demo corpus so the interface is instantly
reviewable without credentials. **Sync live** invokes the ingestion pipeline.
Product Hunt is skipped when `PRODUCT_HUNT_TOKEN` is unset; the other four live
sources remain available. PR Newswire provides a resilient fallback when SEC's
public endpoints are unavailable from a deployment network.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Or run the complete suite:

```bash
npm run check
```

## API

- `GET /api/health` returns service health.
- `GET /api/signals` returns the demo corpus.
- `POST /api/ingest` fetches, normalizes, deduplicates and ranks live items.

## Architecture

```text
Official APIs / RSS / filings
             │
             ▼
 rate-limited source adapters
             │
             ▼
 normalize → canonicalize → cluster duplicates
             │
             ▼
 deterministic ranking + source evidence
             │
             ▼
 Next.js dashboard (filters, watchlists, detail view)
```

The ingestion layer uses request retries, `Retry-After`, exponential backoff,
source isolation and deterministic ranking. A failed source does not block the
others.

## Roadmap

- Persist signal history in Postgres with `pgvector`.
- Add authenticated watchlists and scheduled alerts.
- Learn source and sector weights from user feedback.
- Add LLM-authored explanations over immutable, source-backed event records.

## Attribution

SignalTrace links every displayed item back to its source. Product Hunt,
TechCrunch, Hacker News, PR Newswire and SEC EDGAR retain their respective
trademarks and content rights. The demo corpus is synthetic and clearly marked
as demo data.
