"use server";

import { getDashboardSession } from "@/lib/contabil-session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { ActionResult } from "@/types";
import { usuarioPodeVerChamado } from "@/lib/chamado-access";

const MAX_BYTES = 8 * 1024 * 1024;

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._\-\s]/g, "_").trim().slice(0, 160) || "arquivo";
}

export async function uploadAnexoChamado(
  chamadoId: string,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await getDashboardSession();
  if (!session || session.user.role === "TV") return { error: "Não autorizado" };

  const file = formData.get("file");
  if (!file || !(file instanceof File)) return { error: "Selecione um arquivo" };

  const chamado = await prisma.chamado.findUnique({ where: { id: chamadoId } });
  if (!chamado) return { error: "Chamado não encontrado" };
  if (!usuarioPodeVerChamado(session, chamado)) return { error: "Não autorizado" };
  if (chamado.status === "CONCLUIDO" || chamado.status === "CANCELADO") {
    return { error: "Não é possível anexar após conclusão ou cancelamento" };
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > MAX_BYTES) return { error: "Arquivo muito grande (máx. 8 MB)" };
  if (buf.length === 0) return { error: "Arquivo vazio" };

  const storageKey = `${chamadoId}/${randomUUID()}-${sanitizeFilename(file.name)}`;
  const fullPath = path.join(process.cwd(), "uploads", "chamados", ...storageKey.split("/"));
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, buf);

  const criado = await prisma.anexoChamado.create({
    data: {
      nomeOriginal: file.name.slice(0, 255),
      mimeType: file.type || null,
      tamanhoBytes: buf.length,
      storageKey,
      chamadoId,
      autorId: session.user.id,
    },
  });

  revalidatePath(`/chamados/${chamadoId}`);
  return { success: true, data: { id: criado.id } };
}

export async function removerAnexoChamado(anexoId: string): Promise<ActionResult> {
  const session = await getDashboardSession();
  if (!session || session.user.role === "TV") return { error: "Não autorizado" };

  const anexo = await prisma.anexoChamado.findUnique({
    where: { id: anexoId },
    include: { chamado: true },
  });
  if (!anexo) return { error: "Anexo não encontrado" };

  const pode =
    anexo.autorId === session.user.id ||
    session.user.role === "SUPERADMIN" ||
    (session.user.role === "GESTOR" &&
      anexo.chamado.setorDestinoId === session.user.setorId);

  if (!pode) return { error: "Não autorizado" };

  const fullPath = path.join(process.cwd(), "uploads", "chamados", ...anexo.storageKey.split("/"));
  await prisma.anexoChamado.delete({ where: { id: anexoId } });
  try {
    await unlink(fullPath);
  } catch {
    /* arquivo já removido */
  }

  revalidatePath(`/chamados/${anexo.chamadoId}`);
  return { success: true };
}
