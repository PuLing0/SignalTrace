import { NextResponse } from "next/server";
import { ingestLiveSignals } from "@/lib/ingest";

export async function POST() {
  try {
    return NextResponse.json(await ingestLiveSignals(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unexpected ingestion error",
      },
      { status: 502 },
    );
  }
}
