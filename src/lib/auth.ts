import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";

const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(6),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const usuario = await prisma.usuario.findUnique({
          where: { email: parsed.data.email },
          include: { setor: true },
        });

        if (!usuario || !usuario.ativo) return null;

        const senhaValida = await bcrypt.compare(
          parsed.data.senha,
          usuario.senha
        );
        if (!senhaValida) return null;

        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nome,
          role: usuario.role,
          setorId: usuario.setorId,
          setorTipo: usuario.setor.tipo,
        };
      },
    }),
  ],
});
