import { fetchWithRetry } from "../rate-limit";
import type { SourceItem } from "../types";

interface ProductHuntNode {
  id: string;
  name: string;
  tagline: string;
  url: string;
  createdAt: string;
  votesCount: number;
}

interface ProductHuntResponse {
  data?: { posts?: { edges?: Array<{ node: ProductHuntNode }> } };
  errors?: Array<{ message: string }>;
}

const QUERY = `
  query SignalTraceFrontPage($first: Int!) {
    posts(order: RANKING, first: $first) {
      edges {
        node {
          id
          name
          tagline
          url
          createdAt
          votesCount
        }
      }
    }
  }
`;

export async function fetchProductHunt(limit = 20): Promise<SourceItem[]> {
  const token = process.env.PRODUCT_HUNT_TOKEN;
  if (!token) {
    throw new Error("PRODUCT_HUNT_TOKEN is not configured");
  }

  const response = await fetchWithRetry(
    "https://api.producthunt.com/v2/api/graphql",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: QUERY, variables: { first: limit } }),
    },
  );

  if (!response.ok) {
    throw new Error(`Product Hunt returned ${response.status}`);
  }

  const payload = (await response.json()) as ProductHuntResponse;
  if (payload.errors?.length) {
    throw new Error(payload.errors.map((error) => error.message).join("; "));
  }

  return (payload.data?.posts?.edges ?? []).map(({ node }) => ({
    id: `ph-${node.id}`,
    source: "Product Hunt" as const,
    title: `${node.name}: ${node.tagline}`,
    summary: node.tagline,
    url: node.url,
    publishedAt: node.createdAt,
    engagement: node.votesCount,
  }));
}
