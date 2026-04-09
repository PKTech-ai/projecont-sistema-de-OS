"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DotGridBackground } from "@/components/ui/DotGridBackground";
import { Eye, EyeOff, KeyRound } from "lucide-react";

const schema = z
  .object({
    novaSenha: z.string().min(8, "Mínimo 8 caracteres"),
    confirmar: z.string().min(8, "Confirme a nova senha"),
    nome: z.string().min(2, "Informe seu nome completo"),
  })
  .refine((d) => d.novaSenha === d.confirmar, {
    message: "As senhas não coincidem",
    path: ["confirmar"],
  });

type Form = z.infer<typeof schema>;

export default function AlterarSenhaPage() {
  const router = useRouter();
  const [showNova, setShowNova] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  async function onSubmit(data: Form) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/usuario/alterar-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ novaSenha: data.novaSenha, nome: data.nome }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Erro ao alterar senha");
      }
      // Forçar novo login para regenerar token sem primeiroAcesso
      await signOut({ redirect: false });
      router.push("/login?senha=alterada");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  return (
    <DotGridBackground className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="border border-ds-pebble/80 rounded-[11px] bg-white/90 shadow-sm backdrop-blur-[2px]">
          <CardHeader className="px-6 pt-6 pb-2">
            <div className="flex items-center gap-3 mb-1">
              <span className="bg-ds-info/10 rounded-full p-2">
                <KeyRound className="h-5 w-5 text-ds-info" />
              </span>
              <CardTitle className="text-[20px] font-medium text-ds-ink tracking-tight">
                Defina sua senha
              </CardTitle>
            </div>
            <CardDescription className="text-ds-ash text-[13px]">
              Este é seu primeiro acesso. Escolha uma senha segura e informe seu nome.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Nome */}
              <div className="space-y-1.5">
                <Label htmlFor="nome" className="ds-label">Nome completo</Label>
                <Input
                  id="nome"
                  placeholder="Karina Melo"
                  {...register("nome")}
                  className="h-10 rounded-[5px] border-ds-stone text-sm focus-visible:border-ds-ink focus-visible:ring-ds-ink/10"
                />
                {errors.nome && (
                  <p className="text-ds-danger text-xs">{errors.nome.message}</p>
                )}
              </div>

              {/* Nova senha */}
              <div className="space-y-1.5">
                <Label htmlFor="novaSenha" className="ds-label">Nova senha</Label>
                <div className="relative">
                  <Input
                    id="novaSenha"
                    type={showNova ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    {...register("novaSenha")}
                    className="h-10 rounded-[5px] border-ds-stone text-sm focus-visible:border-ds-ink focus-visible:ring-ds-ink/10 pr-10"
                  />
                  <button type="button" onClick={() => setShowNova((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-ds-ash hover:text-ds-ink transition-colors"
                    aria-label={showNova ? "Ocultar" : "Mostrar"}>
                    {showNova ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.novaSenha && (
                  <p className="text-ds-danger text-xs">{errors.novaSenha.message}</p>
                )}
              </div>

              {/* Confirmar */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmar" className="ds-label">Confirmar nova senha</Label>
                <div className="relative">
                  <Input
                    id="confirmar"
                    type={showConf ? "text" : "password"}
                    placeholder="Repita a senha"
                    {...register("confirmar")}
                    className="h-10 rounded-[5px] border-ds-stone text-sm focus-visible:border-ds-ink focus-visible:ring-ds-ink/10 pr-10"
                  />
                  <button type="button" onClick={() => setShowConf((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-ds-ash hover:text-ds-ink transition-colors"
                    aria-label={showConf ? "Ocultar" : "Mostrar"}>
                    {showConf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmar && (
                  <p className="text-ds-danger text-xs">{errors.confirmar.message}</p>
                )}
              </div>

              {error && (
                <div className="ds-alert-err" role="alert"><span>{error}</span></div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-10 font-medium rounded-[5px] mt-2"
              >
                {loading ? "Salvando..." : "Salvar e entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-ds-ash mt-6">
          Projecont Consultoria Contábil · Sistema Interno
        </p>
      </div>
    </DotGridBackground>
  );
}
