"use client";

import { useState } from "react";
import { criarProjeto, editarProjeto, ativarDesativarProjeto } from "@/server/actions/projetos";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FolderPlus, Pencil } from "lucide-react";
import type { Setor } from "@prisma/client";

interface Props {
  setorIA: Setor;
}

export function FormNovoProjeto({ setorIA }: Props) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) { setError("Nome é obrigatório"); return; }
    setLoading(true);
    setError(null);
    const result = await criarProjeto({ nome: nome.trim(), descricao: descricao.trim(), setorId: setorIA.id });
    setLoading(false);
    if ("error" in result) { setError(result.error); return; }
    setNome(""); setDescricao("");
    setOpen(false);
  }

  const inputCls = "w-full border border-[#DCE2EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1AB6D9]/40 focus:border-[#1AB6D9]";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white">
          <FolderPlus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      } />
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#001F3E]">Novo Projeto — Setor IA</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-medium text-[#64789B] mb-1">Nome do projeto</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} placeholder="Ex: Automação Financeira Alpha" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64789B] mb-1">Descrição (opcional)</label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              rows={3}
              className={inputCls}
              placeholder="Descreva o objetivo do projeto..."
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-[#DCE2EB] text-[#64789B]">Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white">
              {loading ? "Criando..." : "Criar Projeto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditarProps {
  projetoId: string;
  nomeAtual: string;
  descricaoAtual?: string | null;
}

export function BotaoEditarProjeto({ projetoId, nomeAtual, descricaoAtual }: EditarProps) {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState(nomeAtual);
  const [descricao, setDescricao] = useState(descricaoAtual ?? "");
  const [loading, setLoading] = useState(false);

  async function salvar() {
    setLoading(true);
    await editarProjeto(projetoId, { nome, descricao });
    setLoading(false);
    setOpen(false);
  }

  const inputCls = "w-full border border-[#DCE2EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1AB6D9]/40";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" size="sm" className="border-[#DCE2EB] text-[#64789B] text-xs">
          <Pencil className="h-3 w-3 mr-1" />Editar
        </Button>
      } />
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[#001F3E]">Editar Projeto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-xs font-medium text-[#64789B] mb-1">Nome</label>
            <input value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#64789B] mb-1">Descrição</label>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className={inputCls} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="border-[#DCE2EB] text-[#64789B]">Cancelar</Button>
            <Button size="sm" disabled={loading} onClick={salvar} className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BotaoDesativarProjeto({ projetoId, ativo }: { projetoId: string; ativo: boolean }) {
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    if (ativo) {
      await ativarDesativarProjeto(projetoId, false);
    } else {
      const { editarProjeto: editar } = await import("@/server/actions/projetos");
      await editar(projetoId, { ativo: true } as never);
    }
    setLoading(false);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={toggle}
      className={ativo
        ? "border-red-200 text-red-600 hover:bg-red-50 text-xs"
        : "border-green-200 text-green-700 hover:bg-green-50 text-xs"
      }
    >
      {loading ? "..." : ativo ? "Desativar" : "Reativar"}
    </Button>
  );
}
