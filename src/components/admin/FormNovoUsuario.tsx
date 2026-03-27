"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { criarUsuario } from "@/server/actions/usuarios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { UserPlus } from "lucide-react";
import type { Setor } from "@prisma/client";

const schema = z.object({
  nome: z.string().min(2, "Nome obrigatório"),
  email: z.string().email("Email inválido"),
  senha: z.string().min(6, "Mínimo 6 caracteres"),
  role: z.enum(["ANALISTA", "GESTOR", "SUPERADMIN", "TV"]),
  setorId: z.string().min(1, "Selecione um setor"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  setores: Setor[];
}

export function FormNovoUsuario({ setores }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: "ANALISTA" },
  });

  async function onSubmit(data: FormData) {
    setError(null);
    const result = await criarUsuario(data);
    if ("error" in result) { setError(result.error); return; }
    reset();
    setOpen(false);
  }

  const inputCls = "w-full border border-[#DCE2EB] rounded-lg px-3 py-2 text-sm text-[#3E3E3D] focus:outline-none focus:ring-2 focus:ring-[#1AB6D9]/40 focus:border-[#1AB6D9]";
  const labelCls = "block text-xs font-medium text-[#64789B] mb-1";
  const errorCls = "text-xs text-red-500 mt-0.5";

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white">
        <UserPlus className="h-4 w-4 mr-2" />
        Novo Usuário
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#001F3E]">Criar Novo Usuário</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div>
              <label className={labelCls}>Nome completo</label>
              <input {...register("nome")} className={inputCls} placeholder="Ex: Ana Santos" />
              {errors.nome && <p className={errorCls}>{errors.nome.message}</p>}
            </div>

            <div>
              <label className={labelCls}>Email</label>
              <input {...register("email")} type="email" className={inputCls} placeholder="usuario@projecont.com.br" />
              {errors.email && <p className={errorCls}>{errors.email.message}</p>}
            </div>

            <div>
              <label className={labelCls}>Senha inicial</label>
              <input {...register("senha")} type="password" className={inputCls} placeholder="Mínimo 6 caracteres" />
              {errors.senha && <p className={errorCls}>{errors.senha.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Role</label>
                <select {...register("role")} className={inputCls}>
                  <option value="ANALISTA">Analista</option>
                  <option value="GESTOR">Gestor</option>
                  <option value="SUPERADMIN">Super Admin</option>
                  <option value="TV">TV (Display)</option>
                </select>
                {errors.role && <p className={errorCls}>{errors.role.message}</p>}
              </div>

              <div>
                <label className={labelCls}>Setor</label>
                <select {...register("setorId")} className={inputCls}>
                  <option value="">Selecione...</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>{s.nome}</option>
                  ))}
                </select>
                {errors.setorId && <p className={errorCls}>{errors.setorId.message}</p>}
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => { reset(); setOpen(false); }}
                className="border-[#DCE2EB] text-[#64789B]"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white">
                {isSubmitting ? "Criando..." : "Criar Usuário"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
