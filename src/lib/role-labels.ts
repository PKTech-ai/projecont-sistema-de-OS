import type { Role } from "@prisma/client";

/** Mapeamento de Role (BD) → rótulo exibido na UI */
export const ROLE_LABELS: Record<Role, string> = {
  ANALISTA:   "Usuário",
  GESTOR:     "Gestor",
  SUPERADMIN: "Administrador",
  SAC:        "SAC",
  TV:         "TV",
};

/** Roles disponíveis para seleção pelo Gestor (não pode atribuir Gestor ou acima) */
export const ROLES_GESTOR_PODE_ATRIBUIR: Role[] = ["ANALISTA", "SAC"];

/** Todas as roles disponíveis para o Superadmin */
export const ROLES_TODAS: Role[] = ["ANALISTA", "GESTOR", "SAC", "SUPERADMIN", "TV"];
