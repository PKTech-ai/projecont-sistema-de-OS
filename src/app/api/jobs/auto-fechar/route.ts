import { NextRequest, NextResponse } from "next/server";
import { executarAutoFechamento } from "@/jobs/autoFechar";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await executarAutoFechamento();

  return NextResponse.json({
    ok: true,
    processados: result.processados,
    erros: result.erros,
    timestamp: new Date().toISOString(),
  });
}
