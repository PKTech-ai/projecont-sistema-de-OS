import { NextResponse } from "next/server";

export function assertWebhookSecret(request: Request): NextResponse | null {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected) {
    console.error("[webhook] WEBHOOK_SECRET não configurado");
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
  }
  const key = request.headers.get("x-api-key");
  if (!key || key !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
