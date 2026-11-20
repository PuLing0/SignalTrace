export type SignalCategory =
  | "AI & Models"
  | "Developer Tools"
  | "Fintech"
  | "Markets"
  | "Product";

export type SignalEventType =
  | "Launch"
  | "Funding"
  | "Acquisition"
  | "Release"
  | "Discussion";

export type SourceKind =
  | "Product Hunt"
  | "Hacker News"
  | "TechCrunch"
  | "SEC EDGAR"
  | "PR Newswire";

export interface SourceItem {
  id: string;
  source: SourceKind;
  title: string;
  url: string;
  publishedAt: string;
  engagement?: number;
  summary?: string;
}

export interface ScoreBreakdown {
  crossSourceConfirmation: number;
  eventMagnitude: number;
  velocity: number;
  recency: number;
  novelty: number;
  sourceReliability: number;
  total: number;
}

export interface SignalEvent {
  id: string;
  title: string;
  summary: string;
  whyItMatters: string;
  category: SignalCategory;
  eventType: SignalEventType;
  publishedAt: string;
  entities: string[];
  tags: string[];
  sources: SourceItem[];
  score: number;
  scoreBreakdown: ScoreBreakdown;
  confidence: "High" | "Medium" | "Developing";
  isDemo: boolean;
}

export interface RankInput {
  sourceCount: number;
  sourceReliability: number;
  engagement: number;
  eventMagnitude: number;
  novelty: number;
  publishedAt: Date;
  now?: Date;
}

export interface IngestReport {
  signals: SignalEvent[];
  generatedAt: string;
  received: number;
  normalized: number;
  merged: number;
  liveSources: SourceKind[];
  errors: Array<{ source: SourceKind; message: string }>;
}
