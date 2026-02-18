import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "server is alive",
    time: new Date().toISOString()
  });
}