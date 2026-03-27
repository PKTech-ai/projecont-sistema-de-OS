"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ProjecontLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email: data.email,
      senha: data.senha,
      redirect: false,
    });

    if (result?.error) {
      setError("Email ou senha incorretos.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#001F3E] flex-col items-center justify-center relative overflow-hidden p-12">
        {/* Brand pattern background */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'%3E%3Cpath d='M10 6C10 6 22 6 22 18C22 24 18 28 10 28C10 28 10 16 10 6Z' fill='%231AB6D9'/%3E%3Cpath d='M10 30C10 30 22 30 22 42C22 48 18 52 10 52C10 52 10 40 10 30Z' fill='%231AB6D9' opacity='0.7'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center gap-8">
          <ProjecontLogo variant="dark" size="lg" showTagline />
          <div className="max-w-xs">
            <p className="text-white/70 text-sm leading-relaxed">
              Sistema de chamados internos para gerenciamento e acompanhamento de
              demandas entre setores.
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {[
              { label: "Contábil", color: "bg-[#1AB6D9]/20 text-[#1AB6D9]" },
              { label: "Fiscal", color: "bg-white/10 text-white/70" },
              { label: "Departamento Pessoal", color: "bg-white/10 text-white/70" },
              { label: "IA", color: "bg-white/10 text-white/70" },
            ].map((s) => (
              <div
                key={s.label}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${s.color}`}
              >
                {s.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-white p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex justify-center mb-8">
            <ProjecontLogo variant="light" size="md" showTagline />
          </div>

          <Card className="border-0 shadow-none">
            <CardHeader className="px-0 pb-6">
              <CardTitle className="text-2xl font-bold text-[#001F3E]">
                Bem-vindo de volta
              </CardTitle>
              <CardDescription className="text-[#64789B]">
                Faça login para acessar o sistema de chamados
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#3E3E3D] font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com.br"
                    {...register("email")}
                    className="h-11 border-[#DCE2EB] focus-visible:ring-[#1AB6D9]"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-sm">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha" className="text-[#3E3E3D] font-medium">
                    Senha
                  </Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="••••••••"
                    {...register("senha")}
                    className="h-11 border-[#DCE2EB] focus-visible:ring-[#1AB6D9]"
                  />
                  {errors.senha && (
                    <p className="text-red-500 text-sm">{errors.senha.message}</p>
                  )}
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#1AB6D9] hover:bg-[#2082BE] text-white font-semibold transition-colors"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-[#8E8E8D] mt-8">
            Projecont Consultoria Contábil · Sistema Interno
          </p>
        </div>
      </div>
    </div>
  );
}
