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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  DsDialogHeader,
  DsDialogBody,
  DsDialogActions,
  DsFormAlert,
  dsDialogContentClass,
} from "@/components/ui/ds-dialog";
import { cn } from "@/lib/utils";
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

function NovoProjetoDialog({ setorNovoProjeto }: { setorNovoProjeto: Setor }) {
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
        setorId: setorNovoProjeto.id,
      });
      if ("error" in result) { setError(result.error); return; }
      setOpen(false); setError("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-ds-info hover:bg-ds-ink-dark text-white gap-2 shadow-sm">
          <Plus className="h-4 w-4" /> Novo Projeto
        </Button>
      } />
      <DialogContent className={cn(dsDialogContentClass, "max-w-md")} showCloseButton>
        <DsDialogHeader
          icon={Plus}
          title="Novo projeto"
          description={
            <>
              Setor <strong className="text-ds-charcoal">{setorNovoProjeto.nome}</strong> — projetos IA podem ser vinculados na abertura do chamado.
            </>
          }
        />
        <form onSubmit={handleSubmit}>
          <DsDialogBody>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="ds-label">Nome do projeto *</Label>
                <Input
                  name="nome"
                  required
                  minLength={2}
                  placeholder="Ex.: Automação de Folha v2"
                  className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="ds-label">
                  Descrição <span className="font-normal text-ds-ash">(opcional)</span>
                </Label>
                <Textarea
                  name="descricao"
                  rows={3}
                  placeholder="Objetivo do projeto, escopo ou links internos."
                  className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10"
                />
              </div>
            </div>
            {error ? <DsFormAlert>{error}</DsFormAlert> : null}
          </DsDialogBody>
          <DsDialogActions>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-ds-pebble">
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="bg-ds-ink text-ds-paper hover:bg-ds-ink-dark">
              {pending ? "Criando..." : "Criar projeto"}
            </Button>
          </DsDialogActions>
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
        <Button variant="ghost" size="icon" className="h-8 w-8 text-ds-ash hover:text-ds-ink hover:bg-ds-paper" title="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
      } />
      <DialogContent className={cn(dsDialogContentClass, "max-w-md")} showCloseButton>
        <DsDialogHeader
          icon={Pencil}
          title="Editar projeto"
          description={
            <>
              Projeto <strong className="text-ds-charcoal">{projeto.nome}</strong> ({projeto.setor.nome}).
            </>
          }
        />
        <form onSubmit={handleSubmit}>
          <DsDialogBody>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="ds-label">Nome *</Label>
                <Input
                  name="nome"
                  defaultValue={projeto.nome}
                  required
                  minLength={2}
                  className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="ds-label">Descrição</Label>
                <Textarea
                  name="descricao"
                  defaultValue={projeto.descricao ?? ""}
                  rows={3}
                  className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10"
                />
              </div>
            </div>
            {error ? <DsFormAlert>{error}</DsFormAlert> : null}
          </DsDialogBody>
          <DsDialogActions>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-ds-pebble">
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="bg-ds-ink text-ds-paper hover:bg-ds-ink-dark">
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DsDialogActions>
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
  setorContexto,
  setorNovoProjeto,
  modo,
}: {
  projetos: Projeto[];
  setorContexto: Setor;
  setorNovoProjeto: Setor;
  modo: "superadmin" | "setor";
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ds-ink">
            {modo === "superadmin" ? "Projetos — todos os setores" : `Projetos — ${setorContexto.nome}`}
          </h2>
          <p className="text-ds-ash text-sm mt-1">{projetos.length} projeto(s)</p>
        </div>
        <NovoProjetoDialog setorNovoProjeto={setorNovoProjeto} />
      </div>

      <div className="bg-white rounded-xl border border-ds-pebble overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-ds-pebble/50 hover:bg-ds-pebble/50">
              <TableHead className="text-ds-ink font-semibold">Nome</TableHead>
              <TableHead className="text-ds-ink font-semibold">Setor</TableHead>
              <TableHead className="text-ds-ink font-semibold">Descrição</TableHead>
              <TableHead className="text-ds-ink font-semibold">Status</TableHead>
              <TableHead className="text-ds-ink font-semibold">Criado em</TableHead>
              <TableHead className="text-ds-ink font-semibold w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projetos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-ds-ash">
                  Nenhum projeto cadastrado ainda.
                </TableCell>
              </TableRow>
            ) : projetos.map((p, i) => (
              <TableRow key={p.id} className={i % 2 === 1 ? "bg-ds-paper" : "bg-white"}>
                <TableCell className="font-medium text-ds-charcoal">{p.nome}</TableCell>
                <TableCell>
                  <Badge className="bg-ds-pebble text-ds-ink border-0">{p.setor.nome}</Badge>
                </TableCell>
                <TableCell className="text-ds-ash text-sm max-w-xs">
                  <span className="line-clamp-1">{p.descricao ?? "—"}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={p.ativo
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-zinc-50 text-zinc-500 border-zinc-200"}>
                    {p.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-ds-ash text-sm">{formatDate(p.criadoEm)}</TableCell>
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
