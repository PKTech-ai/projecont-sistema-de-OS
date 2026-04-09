import type { Role, TipoSetor } from "@prisma/client";

declare module "next-auth" {
  interface User {
    role: Role;
    setorId: string;
    setorTipo: TipoSetor;
    primeiroAcesso: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      setorId: string;
      setorTipo: TipoSetor;
      primeiroAcesso: boolean;
    };
  }
}

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { error: string };

