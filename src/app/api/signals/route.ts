import { NextResponse } from "next/server";
import { demoSignals } from "@/data/demo-signals";

export function GET() {
  return NextResponse.json({
    mode: "demo",
    generatedAt: new Date("2026-11-20T12:00:00.000Z").toISOString(),
    signals: demoSignals,
  });
}
