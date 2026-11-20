"use client";

import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import type {
  IngestReport,
  SignalCategory,
  SignalEvent,
  SourceKind,
} from "@/lib/types";
import styles from "./signal-dashboard.module.css";

const SAVED_KEY = "signal-trace:watchlist";
const CATEGORIES: Array<SignalCategory | "All signals"> = [
  "All signals",
  "AI & Models",
  "Developer Tools",
  "Markets",
  "Fintech",
  "Product",
];

const SOURCE_CLASS: Record<SourceKind, string> = {
  "Hacker News": styles.sourceHn,
  "Product Hunt": styles.sourcePh,
  TechCrunch: styles.sourceTc,
  "SEC EDGAR": styles.sourceSec,
  "PR Newswire": styles.sourcePrn,
};

interface SignalDashboardProps {
  initialSignals: SignalEvent[];
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m16.2 16.2 4.3 4.3" />
    </svg>
  );
}

function TraceMark({ small = false }: { small?: boolean }) {
  return (
    <svg
      className={small ? styles.markSmall : styles.mark}
      viewBox="0 0 36 36"
      aria-hidden="true"
    >
      <path d="M5 25.5 11.6 8l6.2 19.5L24.1 5l6.7 23" />
      <circle cx="5" cy="25.5" r="2.2" />
      <circle cx="24.1" cy="5" r="2.2" />
      <circle cx="30.8" cy="28" r="2.2" />
    </svg>
  );
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={filled ? styles.bookmarkFilled : undefined}
    >
      <path d="M6.5 4.5h11v16l-5.5-3.7-5.5 3.7z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M4 10h11M11 5l5 5-5 5" />
    </svg>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(value));
}

function sourceCountLabel(signal: SignalEvent) {
  const count = new Set(signal.sources.map((source) => source.source)).size;
  return `${count} source${count === 1 ? "" : "s"}`;
}

function scoreStyle(score: number): CSSProperties {
  return {
    "--score": `${Math.max(0, Math.min(100, score)) * 3.6}deg`,
  } as CSSProperties;
}

export function SignalDashboard({ initialSignals }: SignalDashboardProps) {
  const [signals, setSignals] = useState(initialSignals);
  const [query, setQuery] = useState("");
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]>("All signals");
  const [days, setDays] = useState(30);
  const [minimumScore, setMinimumScore] = useState(35);
  const [savedOnly, setSavedOnly] = useState(false);
  const [sort, setSort] = useState<"score" | "newest">("score");
  const [saved, setSaved] = useState<string[]>([]);
  const [referenceTime, setReferenceTime] = useState(
    Date.parse("2026-11-20T12:00:00.000Z"),
  );
  const [selectedId, setSelectedId] = useState(initialSignals[0]?.id ?? "");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("Curated demo corpus");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        const stored = window.localStorage.getItem(SAVED_KEY);
        if (stored) setSaved(JSON.parse(stored) as string[]);
      } catch {
        setSaved([]);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
    } catch {
      // The dashboard still works when storage is unavailable.
    }
  }, [saved]);

  const filtered = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    const oldest = referenceTime - days * 86_400_000;
    return signals
      .filter((signal) => {
        if (category !== "All signals" && signal.category !== category) {
          return false;
        }
        if (signal.score < minimumScore) return false;
        if (Date.parse(signal.publishedAt) < oldest) return false;
        if (savedOnly && !saved.includes(signal.id)) return false;
        if (!normalizedQuery) return true;
        return [
          signal.title,
          signal.summary,
          signal.whyItMatters,
          signal.category,
          ...signal.entities,
          ...signal.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort(
        (left, right) =>
          sort === "score"
            ? right.score - left.score
            : Date.parse(right.publishedAt) - Date.parse(left.publishedAt),
      );
  }, [
    category,
    days,
    deferredQuery,
    minimumScore,
    referenceTime,
    saved,
    savedOnly,
    signals,
    sort,
  ]);

  const selected =
    signals.find((signal) => signal.id === selectedId) ??
    filtered[0] ??
    signals[0];
  const liveSourceCount = useMemo(
    () =>
      new Set(
        signals.flatMap((signal) =>
          signal.sources.map((source) => source.source),
        ),
      ).size,
    [signals],
  );
  const averageScore = signals.length
    ? Math.round(signals.reduce((sum, signal) => sum + signal.score, 0) / signals.length)
    : 0;
  const highConfidence = signals.filter(
    (signal) => signal.confidence === "High",
  ).length;

  function toggleSaved(id: string) {
    setSaved((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function syncSignals() {
    setIsSyncing(true);
    setSyncMessage("Contacting live sources…");
    try {
      const response = await fetch("/api/ingest", {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Sync failed (${response.status})`);
      }
      const report = (await response.json()) as IngestReport;
      if (report.signals.length >= 10) {
        setSignals(report.signals);
        setSelectedId(report.signals[0]?.id ?? "");
        setReferenceTime(Date.parse(report.generatedAt));
        const sourceNames = report.liveSources.join(", ");
        setSyncMessage(
          `${report.received} items · ${report.merged} merged · ${sourceNames}`,
        );
      } else {
        const failed = report.errors.map((error) => error.source).join(", ");
        setSyncMessage(
          `Live feeds returned too few items${failed ? ` (${failed} unavailable)` : ""}`,
        );
      }
    } catch (error) {
      setSyncMessage(
        error instanceof Error ? error.message : "Live sync failed",
      );
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="SignalTrace home">
          <TraceMark />
          <span>SignalTrace</span>
        </a>
        <nav className={styles.nav} aria-label="Primary navigation">
          <a href="#signals">Signals</a>
          <a href="#method">Method</a>
          <a href="https://github.com/PuLing0/SignalTrace" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </nav>
        <button
          className={styles.syncButton}
          onClick={syncSignals}
          disabled={isSyncing}
        >
          <span className={isSyncing ? styles.syncDotBusy : styles.syncDot} />
          {isSyncing ? "Syncing" : "Sync live"}
        </button>
      </header>

      <main id="top">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span>Early-signal radar</span>
              <span className={styles.eyebrowLine} />
              <span>{syncMessage}</span>
            </div>
            <h1>
              See the signal
              <span>before it’s a headline.</span>
            </h1>
            <p>
              SignalTrace turns product launches, builder attention, funding
              news and market filings into one ranked, source-backed view of
              what may matter next.
            </p>
            <div className={styles.heroActions}>
              <a href="#signals" className={styles.primaryAction}>
                Explore signals
                <ArrowIcon />
              </a>
              <button
                className={styles.secondaryAction}
                onClick={() => {
                  setSavedOnly(true);
                  setCategory("All signals");
                  setMinimumScore(0);
                }}
              >
                Open watchlist
              </button>
            </div>
          </div>

          <div className={styles.radarPanel} aria-label="Signal overview">
            <div className={styles.radarTop}>
              <span>Live signal map</span>
              <span className={styles.liveBadge}>
                <i />
                monitoring
              </span>
            </div>
            <div className={styles.radarPlot}>
              <svg viewBox="0 0 420 250" role="img" aria-label="Signal activity trace">
                <defs>
                  <linearGradient id="traceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d7f266" stopOpacity=".38" />
                    <stop offset="100%" stopColor="#d7f266" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <g className={styles.gridLines}>
                  <path d="M0 62.5H420M0 125H420M0 187.5H420" />
                  <path d="M105 0V250M210 0V250M315 0V250" />
                </g>
                <path
                  className={styles.traceArea}
                  d="M0 201 42 185 84 194 126 147 168 160 210 106 252 118 294 75 336 92 378 47 420 59V250H0Z"
                />
                <path
                  className={styles.traceLine}
                  d="M0 201 42 185 84 194 126 147 168 160 210 106 252 118 294 75 336 92 378 47 420 59"
                />
                <circle cx="378" cy="47" r="6" className={styles.tracePoint} />
                <circle cx="378" cy="47" r="14" className={styles.tracePulse} />
              </svg>
              <div className={styles.plotLabel}>12:00 UTC</div>
            </div>
            <div className={styles.metrics}>
              <div>
                <strong>{averageScore}</strong>
                <span>avg score</span>
              </div>
              <div>
                <strong>{liveSourceCount}</strong>
                <span>source types</span>
              </div>
              <div>
                <strong>{highConfidence}</strong>
                <span>high confidence</span>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.workspace} id="signals">
          <aside className={styles.filters} aria-label="Signal filters">
            <div className={styles.panelHeading}>
              <span>Filter</span>
              <button
                onClick={() => {
                  setQuery("");
                  setCategory("All signals");
                  setDays(30);
                  setMinimumScore(35);
                  setSavedOnly(false);
                }}
              >
                Reset
              </button>
            </div>

            <label className={styles.search}>
              <SearchIcon />
              <span className={styles.srOnly}>Search signals</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search companies, themes…"
              />
            </label>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Sector</span>
              <div className={styles.categoryList}>
                {CATEGORIES.map((item) => {
                  const count =
                    item === "All signals"
                      ? signals.length
                      : signals.filter((signal) => signal.category === item)
                          .length;
                  return (
                    <button
                      key={item}
                      className={
                        category === item ? styles.categoryActive : ""
                      }
                      onClick={() => setCategory(item)}
                    >
                      <span>{item}</span>
                      <small>{count.toString().padStart(2, "0")}</small>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <span className={styles.filterLabel}>Time window</span>
              <div className={styles.segmented}>
                {[7, 30, 90].map((value) => (
                  <button
                    key={value}
                    className={days === value ? styles.segmentActive : ""}
                    onClick={() => setDays(value)}
                  >
                    {value}d
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <div className={styles.rangeLabel}>
                <span className={styles.filterLabel}>Minimum score</span>
                <strong>{minimumScore}</strong>
              </div>
              <input
                className={styles.range}
                type="range"
                min="0"
                max="80"
                step="5"
                value={minimumScore}
                onChange={(event) => setMinimumScore(Number(event.target.value))}
                aria-label="Minimum signal score"
              />
              <div className={styles.rangeScale}>
                <span>0</span>
                <span>80</span>
              </div>
            </div>

            <button
              className={savedOnly ? styles.watchButtonActive : styles.watchButton}
              onClick={() => setSavedOnly((value) => !value)}
            >
              <BookmarkIcon filled={savedOnly} />
              Watchlist
              <small>{saved.length}</small>
            </button>

            <div className={styles.methodNote} id="method">
              <span>Scoring method</span>
              <p>
                Cross-source confirmation, event magnitude, velocity, recency,
                novelty and source reliability. Every score is inspectable.
              </p>
            </div>
          </aside>

          <section className={styles.feed} aria-live="polite">
            <div className={styles.feedHeader}>
              <div>
                <span className={styles.sectionKicker}>The frontier</span>
                <h2>
                  {savedOnly ? "Your watchlist" : "Signals worth your time"}
                </h2>
              </div>
              <div className={styles.feedControls}>
                <span>{filtered.length} results</span>
                <select
                  value={sort}
                  onChange={(event) =>
                    setSort(event.target.value as "score" | "newest")
                  }
                  aria-label="Sort signals"
                >
                  <option value="score">Ranked</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </div>

            {filtered.length ? (
              <div className={styles.signalList}>
                {filtered.map((signal, index) => (
                  <article
                    className={`${styles.signalCard} ${
                      selected?.id === signal.id ? styles.signalCardSelected : ""
                    }`}
                    key={signal.id}
                  >
                    <button
                      className={styles.cardMain}
                      onClick={() => setSelectedId(signal.id)}
                      aria-label={`Inspect ${signal.title}`}
                    >
                      <span className={styles.rank}>#{index + 1}</span>
                      <div className={styles.score} style={scoreStyle(signal.score)}>
                        <span>{signal.score}</span>
                      </div>
                      <div className={styles.cardBody}>
                        <div className={styles.cardMeta}>
                          <span>{signal.category}</span>
                          <i />
                          <span>{signal.eventType}</span>
                          <i />
                          <span>{formatDate(signal.publishedAt)}</span>
                        </div>
                        <h3>{signal.title}</h3>
                        <p>{signal.summary}</p>
                        <div className={styles.tags}>
                          {signal.tags.slice(0, 3).map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                          <span>{sourceCountLabel(signal)}</span>
                        </div>
                      </div>
                    </button>
                    <div className={styles.cardSide}>
                      <button
                        className={styles.bookmarkButton}
                        onClick={() => toggleSaved(signal.id)}
                        aria-label={
                          saved.includes(signal.id)
                            ? "Remove from watchlist"
                            : "Add to watchlist"
                        }
                      >
                        <BookmarkIcon filled={saved.includes(signal.id)} />
                      </button>
                      <span
                        className={
                          signal.confidence === "High"
                            ? styles.confidenceHigh
                            : signal.confidence === "Medium"
                              ? styles.confidenceMedium
                              : styles.confidenceLow
                        }
                      >
                        {signal.confidence}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <TraceMark small />
                <h3>No signal in this range</h3>
                <p>Lower the score threshold or clear the watchlist filter.</p>
                <button
                  onClick={() => {
                    setMinimumScore(0);
                    setSavedOnly(false);
                    setQuery("");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </section>

          <aside className={styles.detail} aria-label="Selected signal detail">
            {selected ? (
              <>
                <div className={styles.detailHeader}>
                  <span>Signal brief</span>
                  <span className={styles.detailScore}>{selected.score}/100</span>
                </div>
                <span className={styles.detailCategory}>
                  {selected.category} · {selected.eventType}
                </span>
                <h2>{selected.title}</h2>
                <p className={styles.detailSummary}>{selected.summary}</p>

                <div className={styles.whyBlock}>
                  <span>Why it matters</span>
                  <p>{selected.whyItMatters}</p>
                </div>

                <div className={styles.breakdown}>
                  <div className={styles.detailHeader}>
                    <span>Score anatomy</span>
                    <small>auditable by design</small>
                  </div>
                  {[
                    ["Cross-source", selected.scoreBreakdown.crossSourceConfirmation, 30],
                    ["Magnitude", selected.scoreBreakdown.eventMagnitude, 20],
                    ["Velocity", selected.scoreBreakdown.velocity, 15],
                    ["Recency", selected.scoreBreakdown.recency, 15],
                    ["Novelty", selected.scoreBreakdown.novelty, 10],
                    ["Reliability", selected.scoreBreakdown.sourceReliability, 10],
                  ].map(([label, value, max]) => (
                    <div className={styles.breakdownRow} key={label}>
                      <div>
                        <span>{label}</span>
                        <small>
                          {value}/{max}
                        </small>
                      </div>
                      <div className={styles.breakdownTrack}>
                        <span
                          style={{
                            width: `${(Number(value) / Number(max)) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className={styles.sourcesBlock}>
                  <div className={styles.detailHeader}>
                    <span>Evidence</span>
                    <small>{sourceCountLabel(selected)}</small>
                  </div>
                  {selected.sources.map((source) => (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.sourceRow}
                      key={source.id}
                    >
                      <span className={SOURCE_CLASS[source.source]}>
                        {source.source.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <strong>{source.source}</strong>
                        <small>{formatDate(source.publishedAt)}</small>
                      </div>
                      <ArrowIcon />
                    </a>
                  ))}
                </div>

                <button
                  className={styles.watchDetail}
                  onClick={() => toggleSaved(selected.id)}
                >
                  <BookmarkIcon filled={saved.includes(selected.id)} />
                  {saved.includes(selected.id)
                    ? "Saved to watchlist"
                    : "Save this signal"}
                </button>
              </>
            ) : null}
          </aside>
        </section>
      </main>

      <footer className={styles.footer}>
        <div>
          <TraceMark small />
          <strong>SignalTrace</strong>
        </div>
        <p>
          Deterministic ranking · source-backed evidence · built for signal,
          not noise
        </p>
        <span>V0.1 · 2026</span>
      </footer>
    </div>
  );
}
