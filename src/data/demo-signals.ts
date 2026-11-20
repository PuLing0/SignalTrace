import { rankSignal } from "@/lib/rank";
import type {
  SignalCategory,
  SignalEvent,
  SignalEventType,
  SourceItem,
  SourceKind,
} from "@/lib/types";

const RELIABILITY: Record<SourceKind, number> = {
  "Product Hunt": 0.72,
  "Hacker News": 0.78,
  TechCrunch: 0.88,
  "SEC EDGAR": 1,
  "PR Newswire": 0.8,
};

const MAGNITUDE: Record<SignalEventType, number> = {
  Acquisition: 0.96,
  Funding: 0.82,
  Release: 0.62,
  Launch: 0.66,
  Discussion: 0.38,
};

interface DemoDefinition {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  category: SignalCategory;
  eventType: SignalEventType;
  hoursAgo: number;
  entities: string[];
  tags: string[];
  sources: Array<{
    source: SourceKind;
    url: string;
    engagement?: number;
  }>;
}

const definitions: DemoDefinition[] = [
  {
    id: "local-first-agents",
    title: "Local-first coding agents move toward durable workspaces",
    summary:
      "A new wave of developer tools is treating agent state as a first-class asset: inspectable, replayable, and portable across machines.",
    whyItMatters:
      "Durable execution turns agents from chat sessions into infrastructure. Teams can audit decisions and resume work without rebuilding context.",
    category: "AI & Models",
    eventType: "Launch",
    hoursAgo: 3,
    entities: ["Hacker News", "Product Hunt"],
    tags: ["Agents", "Developer tooling", "Replay"],
    sources: [
      {
        source: "Hacker News",
        url: "https://news.ycombinator.com/",
        engagement: 284,
      },
      { source: "Product Hunt", url: "https://www.producthunt.com/" },
    ],
  },
  {
    id: "rag-evaluation",
    title: "RAG evaluation shifts from similarity scores to task outcomes",
    summary:
      "Builder discussions are converging on end-to-end evaluation that tracks retrieval, reasoning, citation quality, and action success together.",
    whyItMatters:
      "A high similarity score can still produce a bad answer. Outcome-based evaluation makes retrieval quality financially measurable.",
    category: "AI & Models",
    eventType: "Discussion",
    hoursAgo: 9,
    entities: ["Open-source AI"],
    tags: ["RAG", "Evaluation", "LLMOps"],
    sources: [
      {
        source: "Hacker News",
        url: "https://news.ycombinator.com/",
        engagement: 196,
      },
    ],
  },
  {
    id: "browser-observability",
    title: "Browser-native observability tools target AI workflow failures",
    summary:
      "A cluster of launches is adding traces, deterministic replay, and failure snapshots to browser automation used by agent products.",
    whyItMatters:
      "Reliability is becoming the buying criterion for browser agents. Explainable traces reduce the cost of production debugging.",
    category: "Developer Tools",
    eventType: "Launch",
    hoursAgo: 12,
    entities: ["Product Hunt Launch"],
    tags: ["Browser automation", "Observability", "Testing"],
    sources: [
      {
        source: "Product Hunt",
        url: "https://www.producthunt.com/",
        engagement: 312,
      },
      { source: "Hacker News", url: "https://news.ycombinator.com/" },
    ],
  },
  {
    id: "payments-infra",
    title: "Payment infrastructure startup expands programmable settlement",
    summary:
      "A payments platform is packaging reconciliation, routing, and treasury controls behind one API for software teams.",
    whyItMatters:
      "Embedded finance products are moving from checkout experiences toward operational infrastructure with higher switching costs.",
    category: "Fintech",
    eventType: "Funding",
    hoursAgo: 17,
    entities: ["Payments"],
    tags: ["Embedded finance", "Settlement", "Infrastructure"],
    sources: [
      {
        source: "TechCrunch",
        url: "https://techcrunch.com/",
      },
      {
        source: "Product Hunt",
        url: "https://www.producthunt.com/",
        engagement: 146,
      },
    ],
  },
  {
    id: "edge-search",
    title: "Edge-native search tooling gets a new vector index release",
    summary:
      "The release reduces cold-start latency for hybrid keyword and embedding retrieval in distributed applications.",
    whyItMatters:
      "Cheaper edge retrieval makes private, low-latency AI products viable outside centralized infrastructure.",
    category: "Developer Tools",
    eventType: "Release",
    hoursAgo: 23,
    entities: ["Open-source infrastructure"],
    tags: ["Vector search", "Edge", "Open source"],
    sources: [
      { source: "Hacker News", url: "https://news.ycombinator.com/" },
      { source: "TechCrunch", url: "https://techcrunch.com/" },
    ],
  },
  {
    id: "ai-qa-market",
    title: "Software QA market consolidates around agentic test generation",
    summary:
      "An established testing vendor is acquiring a smaller synthetic-browser testing team as enterprise demand moves toward autonomous regression coverage.",
    whyItMatters:
      "Acquisition activity signals buyers want integrated test creation, execution, and triage rather than separate point tools.",
    category: "Markets",
    eventType: "Acquisition",
    hoursAgo: 31,
    entities: ["Testing market"],
    tags: ["QA", "M&A", "Agentic testing"],
    sources: [
      { source: "SEC EDGAR", url: "https://www.sec.gov/edgar/search/" },
      { source: "TechCrunch", url: "https://techcrunch.com/" },
      { source: "Hacker News", url: "https://news.ycombinator.com/" },
    ],
  },
  {
    id: "open-weights",
    title: "Open-weight models close the gap on structured extraction",
    summary:
      "New benchmark discussions show smaller open models reaching production-grade accuracy for forms, invoices, and document extraction.",
    whyItMatters:
      "Structured extraction can move on-premise sooner, changing the economics of document-heavy automation.",
    category: "AI & Models",
    eventType: "Release",
    hoursAgo: 39,
    entities: ["Open-weight models"],
    tags: ["Structured data", "On-premise", "Benchmarks"],
    sources: [
      { source: "Hacker News", url: "https://news.ycombinator.com/" },
      { source: "TechCrunch", url: "https://techcrunch.com/" },
    ],
  },
  {
    id: "analytics-launch",
    title: "Product analytics startups push toward warehouse-native activation",
    summary:
      "New tools connect experiment assignment, activation funnels, and customer data without duplicating the warehouse.",
    whyItMatters:
      "Warehouse-native activation reduces tool sprawl and gives growth teams one auditable system of record.",
    category: "Product",
    eventType: "Launch",
    hoursAgo: 48,
    entities: ["Product analytics"],
    tags: ["Analytics", "Experimentation", "Activation"],
    sources: [
      {
        source: "Product Hunt",
        url: "https://www.producthunt.com/",
        engagement: 228,
      },
    ],
  },
  {
    id: "closing-agent-window",
    title: "Founders debate the closing window for agent infrastructure",
    summary:
      "A high-engagement discussion argues that authentication, permissions, and durable execution are consolidating into platform defaults.",
    whyItMatters:
      "Startups focused on isolated agent utilities may face pressure from suites that own the runtime and distribution layer.",
    category: "AI & Models",
    eventType: "Discussion",
    hoursAgo: 57,
    entities: ["Agent infrastructure"],
    tags: ["Distribution", "Runtime", "Competition"],
    sources: [
      {
        source: "Hacker News",
        url: "https://news.ycombinator.com/",
        engagement: 420,
      },
      { source: "TechCrunch", url: "https://techcrunch.com/" },
    ],
  },
  {
    id: "security-integrations",
    title: "Identity vendors add agent permission graphs",
    summary:
      "Security products are beginning to map what an autonomous agent can access, delegate, and approve across connected tools.",
    whyItMatters:
      "Permission graphs provide the evidence enterprises need before giving agents operational credentials.",
    category: "Developer Tools",
    eventType: "Launch",
    hoursAgo: 65,
    entities: ["Identity and security"],
    tags: ["Security", "Permissions", "Enterprise"],
    sources: [
      { source: "Product Hunt", url: "https://www.producthunt.com/" },
      { source: "TechCrunch", url: "https://techcrunch.com/" },
    ],
  },
  {
    id: "capital-markets",
    title: "AI infrastructure procurement appears in new merger filings",
    summary:
      "Recent 8-K filings point to consolidation as buyers seek dedicated compute, data, and model deployment capabilities.",
    whyItMatters:
      "Filing activity can surface strategic demand earlier than product announcements and venture-round coverage.",
    category: "Markets",
    eventType: "Acquisition",
    hoursAgo: 80,
    entities: ["Public technology companies"],
    tags: ["8-K", "Infrastructure", "M&A"],
    sources: [
      { source: "SEC EDGAR", url: "https://www.sec.gov/edgar/search/" },
      { source: "TechCrunch", url: "https://techcrunch.com/" },
    ],
  },
  {
    id: "developer-onboarding",
    title: "Developer onboarding tools turn docs into executable workflows",
    summary:
      "A new category connects API examples, sandbox credentials, and guided debugging in the same product experience.",
    whyItMatters:
      "Shorter time-to-first-success is a measurable activation metric for API-first businesses.",
    category: "Developer Tools",
    eventType: "Launch",
    hoursAgo: 102,
    entities: ["Developer experience"],
    tags: ["Docs", "Onboarding", "API"],
    sources: [
      {
        source: "Product Hunt",
        url: "https://www.producthunt.com/",
        engagement: 118,
      },
    ],
  },
];

function makeSources(
  definition: DemoDefinition,
  publishedAt: string,
): SourceItem[] {
  return definition.sources.map((source, index) => ({
    id: `${definition.id}-${index}`,
    source: source.source,
    title: definition.title,
    url: source.url,
    publishedAt,
    engagement: source.engagement,
    summary: definition.summary,
  }));
}

const now = new Date("2026-11-20T12:00:00.000Z");

export const demoSignals: SignalEvent[] = definitions.map((definition) => {
  const publishedAt = new Date(
    now.getTime() - definition.hoursAgo * 3_600_000,
  ).toISOString();
  const sources = makeSources(definition, publishedAt);
  const sourceReliability =
    sources.reduce((sum, source) => sum + RELIABILITY[source.source], 0) /
    sources.length;
  const engagement = sources.reduce(
    (sum, source) => sum + (source.engagement ?? 0),
    0,
  );
  const scoreBreakdown = rankSignal({
    sourceCount: sources.length,
    sourceReliability,
    engagement,
    eventMagnitude: MAGNITUDE[definition.eventType],
    novelty: definition.hoursAgo < 48 ? 0.86 : 0.68,
    publishedAt: new Date(publishedAt),
    now,
  });

  return {
    ...definition,
    publishedAt,
    sources,
    score: scoreBreakdown.total,
    scoreBreakdown,
    confidence:
      sources.length >= 3
        ? "High"
        : sources.length === 2
          ? "Medium"
          : "Developing",
    isDemo: true,
  };
});
