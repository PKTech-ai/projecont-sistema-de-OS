import type { Role } from "@prisma/client";

/** Perfis que o gestor pode criar ou atribuir no próprio setor */
export const ROLES_GESTOR_GERENCIA: Role[] = ["ANALISTA", "SAC"];

export function isGestorRole(role: string | undefined): boolean {
  return role === "GESTOR";
}
