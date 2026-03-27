"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { criarProjeto, editarProjeto, ativarDesativarProjeto } from "@/server/actions/projetos";
import { formatDate } from "@/lib/utils";
import { Plus, Pencil } from "lucide-react";
import type { TipoSetor } from "@prisma/client";

interface Setor { id: string; nome: string; tipo: TipoSetor }
interface Projeto {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  criadoEm: Date;
  setor: Setor;
}

// ─── Novo Projeto ─────────────────────────────────────────────────────────────

function NovoProjetoDialog({ setorIA }: { setorIA: Setor }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const result = await criarProjeto({
        nome: String(fd.get("nome")),
        descricao: String(fd.get("descricao") || ""),
        setorId: setorIA.id,
      });
      if ("error" in result) { setError(result.error); return; }
      setOpen(false); setError("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Novo Projeto
        </Button>
      } />
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-[#F8FAFC] px-6 py-5 border-b border-[#DCE2EB]">
          <DialogTitle className="text-xl font-bold text-[#001F3E] flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1AB6D9]/10 flex items-center justify-center">
              <Plus className="h-4 w-4 text-[#1AB6D9]" />
            </div>
            Criar Projeto IA
          </DialogTitle>
          <p className="text-sm text-[#64789B] mt-1.5 ml-10">
            Cadastre um novo projeto para vincular chamados de Inteligência Artificial.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[#3E3E3D] font-medium">Nome do projeto *</Label>
            <Input name="nome" required minLength={2} placeholder="Ex: Automação de Folha v2" className="border-[#DCE2EB] focus-visible:ring-[#1AB6D9]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#3E3E3D] font-medium">Descrição <span className="text-[#64789B] font-normal text-xs">(opcional)</span></Label>
            <Textarea name="descricao" rows={3} placeholder="Descreva brevemente o objetivo do projeto..." className="border-[#DCE2EB] focus-visible:ring-[#1AB6D9]" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-md mt-2">{error}</p>}
          <div className="flex justify-end gap-3 pt-5 border-t border-[#DCE2EB] mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-[#DCE2EB] text-[#64789B]">Cancelar</Button>
            <Button type="submit" disabled={pending} className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white">
              {pending ? "Criando..." : "Criar Projeto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Editar Projeto ───────────────────────────────────────────────────────────

function EditarProjetoDialog({ projeto }: { projeto: Projeto }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const result = await editarProjeto(projeto.id, {
        nome: String(fd.get("nome")),
        descricao: String(fd.get("descricao") || ""),
      });
      if ("error" in result) { setError(result.error); return; }
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#64789B] hover:text-[#001F3E] hover:bg-[#F8FAFC]" title="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
      } />
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-[#F8FAFC] px-6 py-5 border-b border-[#DCE2EB]">
          <DialogTitle className="text-xl font-bold text-[#001F3E] flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2082BE]/10 flex items-center justify-center">
              <Pencil className="h-4 w-4 text-[#2082BE]" />
            </div>
            Editar Projeto
          </DialogTitle>
          <p className="text-sm text-[#64789B] mt-1.5 ml-10">
            Atualize as informações do projeto <strong className="text-[#3E3E3D]">{projeto.nome}</strong>.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[#3E3E3D] font-medium">Nome *</Label>
            <Input name="nome" defaultValue={projeto.nome} required minLength={2} className="border-[#DCE2EB] focus-visible:ring-[#1AB6D9]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#3E3E3D] font-medium">Descrição</Label>
            <Textarea name="descricao" defaultValue={projeto.descricao ?? ""} rows={3} className="border-[#DCE2EB] focus-visible:ring-[#1AB6D9]" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-md mt-2">{error}</p>}
          <div className="flex justify-end gap-3 pt-5 border-t border-[#DCE2EB] mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-[#DCE2EB] text-[#64789B]">Cancelar</Button>
            <Button type="submit" disabled={pending} className="bg-[#2082BE] hover:bg-[#001F3E] text-white">
              {pending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Toggle Ativo ─────────────────────────────────────────────────────────────

function ToggleAtivoButton({ projeto }: { projeto: Projeto }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => { await ativarDesativarProjeto(projeto.id, !projeto.ativo); })}
      className={`text-xs ${projeto.ativo
        ? "border-red-200 text-red-600 hover:bg-red-50"
        : "border-green-200 text-green-600 hover:bg-green-50"}`}
    >
      {projeto.ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function ProjetosClient({
  projetos,
  setorIA,
}: {
  projetos: Projeto[];
  setorIA: Setor;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#001F3E]">Projetos — Setor IA</h2>
          <p className="text-[#64789B] text-sm mt-1">{projetos.length} projetos cadastrados</p>
        </div>
        <NovoProjetoDialog setorIA={setorIA} />
      </div>

      <div className="bg-white rounded-xl border border-[#DCE2EB] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#DCE2EB]/50 hover:bg-[#DCE2EB]/50">
              <TableHead className="text-[#001F3E] font-semibold">Nome</TableHead>
              <TableHead className="text-[#001F3E] font-semibold">Setor</TableHead>
              <TableHead className="text-[#001F3E] font-semibold">Descrição</TableHead>
              <TableHead className="text-[#001F3E] font-semibold">Status</TableHead>
              <TableHead className="text-[#001F3E] font-semibold">Criado em</TableHead>
              <TableHead className="text-[#001F3E] font-semibold w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projetos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-[#64789B]">
                  Nenhum projeto cadastrado ainda.
                </TableCell>
              </TableRow>
            ) : projetos.map((p, i) => (
              <TableRow key={p.id} className={i % 2 === 1 ? "bg-[#F8FAFC]" : "bg-white"}>
                <TableCell className="font-medium text-[#3E3E3D]">{p.nome}</TableCell>
                <TableCell>
                  <Badge className="bg-[#DCE2EB] text-[#001F3E] border-0">{p.setor.nome}</Badge>
                </TableCell>
                <TableCell className="text-[#64789B] text-sm max-w-xs">
                  <span className="line-clamp-1">{p.descricao ?? "—"}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={p.ativo
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-zinc-50 text-zinc-500 border-zinc-200"}>
                    {p.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-[#64789B] text-sm">{formatDate(p.criadoEm)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <EditarProjetoDialog projeto={p} />
                    <ToggleAtivoButton projeto={p} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
