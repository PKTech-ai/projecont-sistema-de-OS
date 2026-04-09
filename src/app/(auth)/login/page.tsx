"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DotGridBackground } from "@/components/ui/DotGridBackground";
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  usuario: z.string().min(1, "Informe seu usuário"),
  senha: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
  lembrar: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

// Logo SVG inline — marca Projecont (cyan "#00AEEF" sobre fundo escuro)
function ProjecontLogoMarca({ size = 72 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 320 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Projecont logo"
    >
      {/* Fundo circular escuro */}
      <rect width="320" height="320" rx="32" fill="#0D1B2A" />
      {/* Pétala esquerda — forma folha para baixo */}
      <path
        d="M100 60 C100 60 60 100 60 160 C60 220 100 260 160 260 C160 260 100 220 100 160 C100 100 100 60 100 60Z"
        fill="#00C8EF"
      />
      {/* Pétala direita — forma folha para cima */}
      <path
        d="M160 60 C220 60 260 100 260 160 C260 160 220 120 160 120 C160 120 160 60 160 60Z"
        fill="#00C8EF"
      />
    </svg>
  );
}

// Versão horizontal com texto para o painel escuro
function ProjecontLogoDark() {
  return (
    <div className="flex items-center gap-4">
      <ProjecontLogoMarca size={64} />
      <div className="flex flex-col">
        <span className="text-white font-bold text-3xl tracking-tight leading-none">
          projecont
        </span>
        <span className="text-white/60 text-sm font-normal mt-0.5">
          Consultoria Contábil
        </span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { lembrar: false },
  });

  async function onSubmit(data: LoginForm) {
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      usuario: data.usuario,
      senha: data.senha,
      redirect: false,
    });

    if (result?.error) {
      setError("Usuário ou senha incorretos.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Painel escuro com logo corrigida */}
      <div className="hidden lg:flex lg:w-1/2 ds-bg-dot-grid-ink flex-col items-center justify-center relative overflow-hidden p-12">
        <div className="relative z-10 flex flex-col items-center text-center gap-10">
          <ProjecontLogoDark />

          <p className="text-white/60 text-sm leading-relaxed max-w-xs">
            Sistema de chamados internos para gerenciamento e acompanhamento de
            demandas entre setores.
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            {[
              { label: "Contábil", color: "bg-ds-info/20 text-ds-info" },
              { label: "Fiscal", color: "bg-white/10 text-white/70" },
              { label: "Departamento Pessoal", color: "bg-white/10 text-white/70" },
              { label: "Inteligência Artificial", color: "bg-white/10 text-white/70" },
              { label: "Societário", color: "bg-white/10 text-white/70" },
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

      {/* Formulário */}
      <DotGridBackground className="flex flex-1 flex-col items-center justify-center p-6 lg:p-10 min-h-[60vh] lg:min-h-screen">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="lg:hidden flex justify-center mb-8">
            <ProjecontLogoDark />
          </div>

          <Card className="border border-ds-pebble/80 rounded-[11px] bg-white/90 shadow-sm backdrop-blur-[2px]">
            <CardHeader className="px-6 pt-6 pb-2">
              <CardTitle className="text-[22px] font-medium text-ds-ink tracking-tight">
                Bem-vindo de volta
              </CardTitle>
              <CardDescription className="text-ds-ash text-[13px]">
                Entre com seu usuário e senha para acessar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Campo Usuário */}
                <div className="space-y-1.5">
                  <Label htmlFor="usuario" className="ds-label">
                    Usuário
                  </Label>
                  <Input
                    id="usuario"
                    type="text"
                    placeholder="karina.melo"
                    autoComplete="username"
                    {...register("usuario")}
                    className="h-10 rounded-[5px] border-ds-stone text-sm focus-visible:border-ds-ink focus-visible:ring-ds-ink/10"
                  />
                  {errors.usuario && (
                    <p className="text-ds-danger text-xs mt-1">{errors.usuario.message}</p>
                  )}
                </div>

                {/* Campo Senha com olhinho */}
                <div className="space-y-1.5">
                  <Label htmlFor="senha" className="ds-label">
                    Senha
                  </Label>
                  <div className="relative">
                    <Input
                      id="senha"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••"
                      autoComplete="current-password"
                      {...register("senha")}
                      className="h-10 rounded-[5px] border-ds-stone text-sm focus-visible:border-ds-ink focus-visible:ring-ds-ink/10 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-ds-ash hover:text-ds-ink transition-colors"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.senha && (
                    <p className="text-ds-danger text-xs mt-1">{errors.senha.message}</p>
                  )}
                </div>

                {/* Lembrar de mim */}
                <div className="flex items-center gap-2">
                  <input
                    id="lembrar"
                    type="checkbox"
                    {...register("lembrar")}
                    className="h-4 w-4 rounded border-ds-stone accent-ds-ink cursor-pointer"
                  />
                  <Label htmlFor="lembrar" className="text-[13px] text-ds-ash cursor-pointer select-none">
                    Lembrar de mim
                  </Label>
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

              {process.env.NEXT_PUBLIC_CONTABIL_LOGIN_URL ? (
                <p className="text-center text-[12px] text-ds-ash mt-4 px-2">
                  Sessão unida ao Contábil Pro:{" "}
                  <a
                    href={process.env.NEXT_PUBLIC_CONTABIL_LOGIN_URL}
                    className="text-ds-info underline underline-offset-2 font-medium"
                  >
                    abrir login do Contábil Pro
                  </a>
                </p>
              ) : null}
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
