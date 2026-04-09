import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const schema = z.object({
  novaSenha: z.string().min(8),
  nome: z.string().min(2),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const hash = await bcrypt.hash(parsed.data.novaSenha, 12);

  await prisma.usuario.update({
    where: { id: session.user.id },
    data: {
      senha: hash,
      nome: parsed.data.nome,
      primeiroAcesso: false,
    },
  });

  return NextResponse.json({ ok: true });
}
