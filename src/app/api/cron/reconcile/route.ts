import { NextRequest, NextResponse } from "next/server";

/**
 * Ponto de ancoragem para cron / automação (reconciliação).
 * A carga completa CP → OS continua a ser feita no Contábil Pro: `npm run sync:os` (ver server/INTEGRATION.md).
 */
export async function POST(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET não configurado no servidor" },
      { status: 501 }
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    message:
      "Para enviar todas as empresas e utilizadores do Contábil Pro ao OS, execute no servidor da API CP: npm run sync:os (variáveis OS_WEBHOOK_BASE e WEBHOOK_SECRET).",
    timestamp: new Date().toISOString(),
  });
}
