import type { RankInput, ScoreBreakdown } from "./types";

export const SCORE_WEIGHTS = {
  crossSourceConfirmation: 0.3,
  eventMagnitude: 0.2,
  velocity: 0.15,
  recency: 0.15,
  novelty: 0.1,
  sourceReliability: 0.1,
} as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function rankSignal(input: RankInput): ScoreBreakdown {
  const now = input.now ?? new Date();
  const ageHours = Math.max(
    0,
    (now.getTime() - input.publishedAt.getTime()) / 3_600_000,
  );

  const crossSourceConfirmation = clamp01((input.sourceCount - 1) / 3);
  const eventMagnitude = clamp01(input.eventMagnitude);
  const velocity = clamp01(input.engagement / 500);
  const recency = Math.exp(-ageHours / 48);
  const novelty = clamp01(input.novelty);
  const sourceReliability = clamp01(input.sourceReliability);

  const total =
    crossSourceConfirmation *
      SCORE_WEIGHTS.crossSourceConfirmation *
      100 +
    eventMagnitude * SCORE_WEIGHTS.eventMagnitude * 100 +
    velocity * SCORE_WEIGHTS.velocity * 100 +
    recency * SCORE_WEIGHTS.recency * 100 +
    novelty * SCORE_WEIGHTS.novelty * 100 +
    sourceReliability * SCORE_WEIGHTS.sourceReliability * 100;

  return {
    crossSourceConfirmation: Math.round(crossSourceConfirmation * 30),
    eventMagnitude: Math.round(eventMagnitude * 20),
    velocity: Math.round(velocity * 15),
    recency: Math.round(recency * 15),
    novelty: Math.round(novelty * 10),
    sourceReliability: Math.round(sourceReliability * 10),
    total: Math.round(total),
  };
}
