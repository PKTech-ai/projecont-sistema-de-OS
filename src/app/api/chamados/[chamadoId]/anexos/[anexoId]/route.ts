import { getDashboardSession } from "@/lib/contabil-session";
import { prisma } from "@/lib/prisma";
import { usuarioPodeVerChamado } from "@/lib/chamado-access";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chamadoId: string; anexoId: string }> }
) {
  const session = await getDashboardSession();
  if (!session || session.user.role === "TV") {
    return new Response("Unauthorized", { status: 401 });
  }

  const { chamadoId, anexoId } = await params;
  const anexo = await prisma.anexoChamado.findFirst({
    where: { id: anexoId, chamadoId },
    include: {
      chamado: {
        select: {
          solicitanteId: true,
          responsavelId: true,
          setorDestinoId: true,
        },
      },
    },
  });

  if (!anexo) return new Response("Not found", { status: 404 });
  if (!usuarioPodeVerChamado(session, anexo.chamado)) {
    return new Response("Forbidden", { status: 403 });
  }

  const abs = path.join(process.cwd(), "uploads", "chamados", ...anexo.storageKey.split("/"));
  let buf: Buffer;
  try {
    buf = await readFile(abs);
  } catch {
    return new Response("Arquivo não encontrado no servidor", { status: 404 });
  }

  const nome = encodeURIComponent(anexo.nomeOriginal);
  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": anexo.mimeType ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${nome}`,
    },
  });
}
