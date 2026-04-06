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
import { DotGridBackground } from "@/components/ui/DotGridBackground";

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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Painel escuro — grade de pontos sutil (caderno escuro) */}
      <div className="hidden lg:flex lg:w-1/2 ds-bg-dot-grid-ink flex-col items-center justify-center relative overflow-hidden p-12">
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
              { label: "Contábil", color: "bg-ds-info/20 text-ds-info" },
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

      {/* Formulário — papel com grade de pontos (notebook) */}
      <DotGridBackground className="flex flex-1 flex-col items-center justify-center p-6 lg:p-10 min-h-[60vh] lg:min-h-screen">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex justify-center mb-8">
            <ProjecontLogo variant="light" size="md" showTagline />
          </div>

          <Card className="border border-ds-pebble/80 rounded-[11px] bg-white/90 shadow-sm backdrop-blur-[2px]">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="text-[22px] font-medium text-ds-ink tracking-tight">
                Bem-vindo de volta
              </CardTitle>
              <CardDescription className="text-ds-ash text-[13px]">
                Faça login para acessar o sistema de chamados
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="ds-label">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com.br"
                    {...register("email")}
                    className="h-10 rounded-[5px] border-ds-stone text-sm focus-visible:border-ds-ink focus-visible:ring-ds-ink/10"
                  />
                  {errors.email && (
                    <p className="text-ds-danger text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="senha" className="ds-label">
                    Senha
                  </Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="••••••••"
                    {...register("senha")}
                    className="h-10 rounded-[5px] border-ds-stone text-sm focus-visible:border-ds-ink focus-visible:ring-ds-ink/10"
                  />
                  <p className="ds-hint">Mínimo 6 caracteres</p>
                  {errors.senha && (
                    <p className="text-ds-danger text-xs mt-1">{errors.senha.message}</p>
                  )}
                </div>

                {error && (
                  <div className="ds-alert-err" role="alert">
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-10 font-medium rounded-[5px] mt-2"
                >
                  {loading ? "Entrando..." : "Entrar"}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-[11px] text-ds-ash mt-8">
            Projecont Consultoria Contábil · Sistema Interno
          </p>
        </div>
      </DotGridBackground>
    </div>
  );
}
