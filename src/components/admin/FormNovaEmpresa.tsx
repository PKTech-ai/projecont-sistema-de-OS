"use client";

import { useState } from "react";
import { criarEmpresa, ativarDesativarEmpresa } from "@/server/actions/empresas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Building2 } from "lucide-react";

export function FormNovaEmpresa() {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setError("Nome é obrigatório"); return; }
    setLoading(true);
    setError(null);
    const result = await criarEmpresa({ nome: nome.trim() });
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    setNome("");
    setOpen(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} className="bg-ds-info hover:bg-ds-ink-dark text-white">
        <Building2 className="h-4 w-4 mr-2" />
        Nova Empresa
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-ds-ink">Cadastrar Empresa</DialogTitle>
          </DialogHeader>
          <form onSubmit={onSubmit} className="space-y-4 mt-2">
            <div>
              <label className="block text-xs font-medium text-ds-ash mb-1">Razão Social / Nome</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full border border-ds-pebble rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ds-info/40 focus:border-ds-info"
                placeholder="Ex: Alpha Distribuidora Ltda"
              />
              {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setNome(""); setOpen(false); }} className="border-ds-pebble text-ds-ash">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-ds-info hover:bg-ds-ink-dark text-white">
                {loading ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface BotaoStatusEmpresaProps {
  empresaId: string;
  ativo: boolean;
}

export function BotaoStatusEmpresa({ empresaId, ativo }: BotaoStatusEmpresaProps) {
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await ativarDesativarEmpresa(empresaId, !ativo);
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
