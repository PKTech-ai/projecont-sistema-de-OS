import type { Session } from "next-auth";

/** Quem pode abrir a tela do chamado (alinhado à lógica do detalhe). */
export function usuarioPodeVerChamado(
  session: Session,
  chamado: {
    solicitanteId: string;
    responsavelId: string;
    setorDestinoId: string | null;
  }
): boolean {
  if (session.user.role === "SUPERADMIN") return true;
  if (
    session.user.id === chamado.solicitanteId ||
    session.user.id === chamado.responsavelId
  ) {
    return true;
  }
  if (
    session.user.role === "GESTOR" &&
    chamado.setorDestinoId &&
    chamado.setorDestinoId === session.user.setorId
  ) {
    return true;
  }
  return false;
}
