"use client";

import { useState } from "react";
import { alterarStatusUsuario, alterarRoleUsuario } from "@/server/actions/usuarios";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import type { Role, Setor } from "@prisma/client";

interface BotaoStatusProps {
  usuarioId: string;
  ativo: boolean;
}

export function BotaoStatusUsuario({ usuarioId, ativo }: BotaoStatusProps) {
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await alterarStatusUsuario(usuarioId, !ativo);
    setLoading(false);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={toggle}
      className={
        ativo
          ? "border-red-200 text-red-600 hover:bg-red-50 text-xs"
          : "border-green-200 text-green-700 hover:bg-green-50 text-xs"
      }
    >
      {loading ? "..." : ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}

interface EditarRoleProps {
  usuarioId: string;
  roleAtual: Role;
  setorIdAtual: string;
  setores: Setor[];
}

export function BotaoEditarRole({ usuarioId, roleAtual, setorIdAtual, setores }: EditarRoleProps) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(roleAtual);
  const [setorId, setSetorId] = useState(setorIdAtual);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function salvar() {
    setLoading(true);
    setError(null);
    const result = await alterarRoleUsuario(usuarioId, role, setorId);
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    setOpen(false);
  }

  const selectCls = "w-full border border-[#DCE2EB] rounded-lg px-3 py-2 text-sm text-[#3E3E3D] focus:outline-none focus:ring-2 focus:ring-[#1AB6D9]/40";
  const labelCls = "block text-xs font-medium text-[#64789B] mb-1";

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="border-[#DCE2EB] text-[#64789B] text-xs">
        <Pencil className="h-3 w-3 mr-1" />
        Editar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-[#001F3E]">Alterar Role / Setor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className={labelCls}>Role</label>
              <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={selectCls}>
                <option value="ANALISTA">Analista</option>
                <option value="GESTOR">Gestor</option>
                <option value="SUPERADMIN">Super Admin</option>
                <option value="TV">TV (Display)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Setor</label>
              <select value={setorId} onChange={(e) => setSetorId(e.target.value)} className={selectCls}>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="border-[#DCE2EB] text-[#64789B]">
                Cancelar
              </Button>
              <Button size="sm" disabled={loading} onClick={salvar} className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white">
                {loading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
