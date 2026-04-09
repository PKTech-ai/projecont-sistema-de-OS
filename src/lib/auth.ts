import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";

// Aceita username OU email no mesmo campo "usuario"
const loginSchema = z.object({
  usuario: z.string().min(1),
  senha: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        usuario: { label: "Usuário", type: "text" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const valor = parsed.data.usuario.toLowerCase().trim();

        // Tenta encontrar por username primeiro, depois por email
        const usuario = await prisma.usuario.findFirst({
          where: {
            OR: [{ username: valor }, { email: valor }],
            ativo: true,
          },
          include: { setor: true },
        });

        if (!usuario) return null;

        const senhaValida = await bcrypt.compare(
          parsed.data.senha,
          usuario.senha
        );
        if (!senhaValida) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nome || usuario.username || usuario.email,
          role: usuario.role,
          setorId: usuario.setorId,
          setorTipo: usuario.setor.tipo,
          primeiroAcesso: usuario.primeiroAcesso,
        };
      },
    }),
  ],
});
