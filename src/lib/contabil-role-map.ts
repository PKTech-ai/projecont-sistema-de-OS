import type { Role } from "@prisma/client";

/**
 * Mapeia strings de role do Contábil Pro para o enum do OS.
 * Fallback seguro: ANALISTA (menor privilégio operacional por defeito).
 */
export function mapContabilRoleToOs(roleRaw: string | undefined | null): Role {
  const r = (roleRaw ?? "").trim().toUpperCase();
  const map: Record<string, Role> = {
    MASTER: "GESTOR",
    MANAGER: "GESTOR",
    GESTOR: "GESTOR",
    DIRETOR: "GESTOR",
    ANALYST: "ANALISTA",
    ANALISTA: "ANALISTA",
    ANALYSTA: "ANALISTA",
    SAC: "SAC",
    TV: "TV",
    SUPERADMIN: "SUPERADMIN",
  };
  const mapped = map[r];
  if (!mapped) {
    console.warn(`[contabil-role-map] Role desconhecida do Contábil Pro: "${roleRaw}" → fallback ANALISTA`);
    return "ANALISTA";
  }
  return mapped;
}
