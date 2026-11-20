import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "signal-trace",
    checkedAt: new Date().toISOString(),
  });
}
