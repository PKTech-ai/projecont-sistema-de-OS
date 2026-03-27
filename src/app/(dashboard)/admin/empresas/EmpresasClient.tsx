"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  criarEmpresa,
  ativarDesativarEmpresa,
  upsertVinculo,
  removerVinculo,
} from "@/server/actions/empresas";
import { formatDate } from "@/lib/utils";
import { Plus, Building2, Link2, Trash2, PlusCircle } from "lucide-react";
import type { TipoSetor } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Vinculo {
  id: string;
  tipoServico: string;
  responsavel: { id: string; nome: string; setor: { tipo: TipoSetor } };
}

interface Empresa {
  id: string;
  nome: string;
  ativo: boolean;
  criadoEm: Date;
  vinculos: Vinculo[];
}

interface Usuario {
  id: string;
  nome: string;
  setor: { tipo: TipoSetor; nome: string };
}

const SETORES_SERVICO: { tipo: TipoSetor; label: string }[] = [
  { tipo: "CONTABIL", label: "Contábil" },
  { tipo: "FISCAL", label: "Fiscal" },
  { tipo: "DP", label: "Dep. Pessoal" },
  { tipo: "IA", label: "IA" },
  { tipo: "CLIENTES", label: "Clientes" },
];

// ─── Nova Empresa ─────────────────────────────────────────────────────────────

function NovaEmpresaDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await criarEmpresa({ nome: String(data.get("nome")) });
      if ("error" in result) {
        setError(result.error);
      } else {
        setOpen(false);
        setError("");
        form.reset();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      } />
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <div className="bg-[#F8FAFC] px-6 py-5 border-b border-[#DCE2EB]">
          <DialogTitle className="text-xl font-bold text-[#001F3E] flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1AB6D9]/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-[#1AB6D9]" />
            </div>
            Cadastrar Empresa
          </DialogTitle>
          <p className="text-sm text-[#64789B] mt-1.5 ml-10">
            Adicione uma nova empresa para o controle de vínculos e chamados.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome" className="text-[#3E3E3D] font-medium">Nome da empresa *</Label>
            <Input id="nome" name="nome" placeholder="Ex: Alpha Distribuidora Ltda" required minLength={2} className="border-[#DCE2EB] focus-visible:ring-[#1AB6D9]" />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-md mt-2">{error}</p>}
          <div className="flex justify-end gap-3 pt-5 border-t border-[#DCE2EB] mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-[#DCE2EB] text-[#64789B]">Cancelar</Button>
            <Button type="submit" disabled={pending} className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white">
              {pending ? "Criando..." : "Criar Empresa"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Gerenciar Vínculos ───────────────────────────────────────────────────────

function GerenciarVinculosDialog({
  empresa,
  usuarios,
}: {
  empresa: Empresa;
  usuarios: Usuario[];
}) {
  const [open, setOpen] = useState(false);
  const [pendingAdd, startAdd] = useTransition();
  const [pendingRemove, startRemove] = useTransition();
  const [selectedTipo, setSelectedTipo] = useState<TipoSetor>("CONTABIL");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState("");

  // Filtra usuários do setor selecionado (excluindo TV)
  const usuariosFiltrados = usuarios.filter(
    (u) => u.setor.tipo === selectedTipo
  );

  // Tipos já vinculados nesta empresa
  const tiposVinculados = new Set(empresa.vinculos.map((v) => v.tipoServico));

  function handleAddVinculo() {
    if (!selectedUserId) return;
    setError("");
    startAdd(async () => {
      const result = await upsertVinculo({
        empresaId: empresa.id,
        tipoServico: selectedTipo,
        responsavelId: selectedUserId,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setSelectedUserId("");
      }
    });
  }

  function handleRemoveVinculo(tipoServico: string) {
    startRemove(async () => {
      await removerVinculo(empresa.id, tipoServico);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 border-[#DCE2EB] text-[#64789B] hover:text-[#001F3E] text-xs shadow-sm hover:bg-[#F8FAFC]"
        >
          <Link2 className="h-3.5 w-3.5" />
          Vínculos ({empresa.vinculos.length})
        </Button>
      } />
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className="bg-[#F8FAFC] px-6 py-5 border-b border-[#DCE2EB]">
          <DialogTitle className="text-xl font-bold text-[#001F3E] flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2082BE]/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-[#2082BE]" />
            </div>
            {empresa.nome}
          </DialogTitle>
          <p className="text-sm text-[#64789B] mt-1.5 ml-10">
            Gerencie os responsáveis por cada serviço prestado para esta empresa.
          </p>
        </div>

        <div className="p-6 space-y-6 bg-white">
          {/* Vínculos existentes */}
          <div>
            <p className="text-sm font-semibold text-[#001F3E] mb-3">Responsáveis por setor</p>
            {empresa.vinculos.length === 0 ? (
              <p className="text-sm text-[#8E8E8D] italic py-3 text-center bg-[#F8FAFC] rounded-lg border border-dashed border-[#DCE2EB]">
                Nenhum vínculo cadastrado.
              </p>
            ) : (
              <div className="space-y-2">
                {empresa.vinculos.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between bg-white border border-[#DCE2EB] rounded-lg px-3 py-2.5 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold bg-[#001F3E] text-white px-2.5 py-1 rounded-md uppercase tracking-wider">
                        {v.tipoServico}
                      </span>
                      <span className="text-sm font-medium text-[#3E3E3D]">{v.responsavel.nome}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-[#64789B] hover:text-red-600 hover:bg-red-50 rounded-md"
                      onClick={() => handleRemoveVinculo(v.tipoServico)}
                      disabled={pendingRemove}
                      title="Remover vínculo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Adicionar novo vínculo */}
          <div className="bg-[#F8FAFC] rounded-xl p-5 border border-[#DCE2EB]">
            <p className="text-sm font-bold text-[#001F3E] mb-4">
              {tiposVinculados.size > 0 ? "Alterar ou adicionar responsável" : "Adicionar responsável"}
            </p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#64789B] uppercase tracking-wider">Setor / Serviço</Label>
                <select
                  value={selectedTipo}
                  onChange={(e) => {
                    setSelectedTipo(e.target.value as TipoSetor);
                    setSelectedUserId("");
                  }}
                  className="w-full h-10 rounded-md border border-[#DCE2EB] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1AB6D9]/40 text-[#3E3E3D]"
                >
                  {SETORES_SERVICO.map((s) => (
                    <option key={s.tipo} value={s.tipo}>
                      {s.label}
                      {tiposVinculados.has(s.tipo) ? " ✓" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-[#64789B] uppercase tracking-wider">Responsável</Label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full h-10 rounded-md border border-[#DCE2EB] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1AB6D9]/40 text-[#3E3E3D]"
                >
                  <option value="">Selecione...</option>
                  {usuariosFiltrados.map((u) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            {usuariosFiltrados.length === 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md mb-4">
                Nenhum funcionário cadastrado no setor <strong>{SETORES_SERVICO.find((s) => s.tipo === selectedTipo)?.label}</strong>.
              </p>
            )}
            {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-md mb-4">{error}</p>}
            <Button
              onClick={handleAddVinculo}
              disabled={!selectedUserId || pendingAdd}
              className="w-full bg-[#001F3E] hover:bg-[#2082BE] text-white gap-2 h-10"
            >
              <PlusCircle className="h-4 w-4" />
              {tiposVinculados.has(selectedTipo) ? "Atualizar responsável" : "Adicionar responsável"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Toggle Ativo ─────────────────────────────────────────────────────────────

function ToggleAtivoButton({ empresa }: { empresa: Empresa }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => {
        await ativarDesativarEmpresa(empresa.id, !empresa.ativo);
      })}
      className={`text-xs ${empresa.ativo
        ? "border-red-200 text-red-600 hover:bg-red-50"
        : "border-green-200 text-green-600 hover:bg-green-50"
        }`}
    >
      {empresa.ativo ? "Desativar" : "Ativar"}
    </Button>
  );
}

// ─── Main Client ──────────────────────────────────────────────────────────────

export function EmpresasClient({
  empresas,
  usuarios,
}: {
  empresas: Empresa[];
  usuarios: Usuario[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#001F3E]">Empresas e Vínculos</h2>
          <p className="text-[#64789B] text-sm mt-1">
            {empresas.length} empresas · {empresas.reduce((acc, e) => acc + e.vinculos.length, 0)} vínculos
          </p>
        </div>
        <NovaEmpresaDialog />
      </div>

      {/* Legenda */}
      <div className="bg-[#F0F9FF] border border-[#1AB6D9]/20 rounded-xl px-4 py-3 text-sm text-[#2082BE]">
        <strong>Regra de vínculos:</strong> cada empresa pode ter um responsável por tipo de serviço (Contábil, Fiscal, DP, IA).
        Funcionários <em>sem vínculo</em> também podem abrir chamados para solicitações internas ou projetos IA.
      </div>

      <div className="bg-white rounded-xl border border-[#DCE2EB] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#DCE2EB]/50 hover:bg-[#DCE2EB]/50">
              <TableHead className="text-[#001F3E] font-semibold">Empresa</TableHead>
              <TableHead className="text-[#001F3E] font-semibold">Status</TableHead>
              <TableHead className="text-[#001F3E] font-semibold">Vínculos cadastrados</TableHead>
              <TableHead className="text-[#001F3E] font-semibold">Criado em</TableHead>
              <TableHead className="text-[#001F3E] font-semibold w-36">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.map((e, i) => (
              <TableRow key={e.id} className={i % 2 === 1 ? "bg-[#F8FAFC]" : "bg-white"}>
                <TableCell className="font-medium text-[#3E3E3D]">{e.nome}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={e.ativo
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-zinc-50 text-zinc-500 border-zinc-200"
                    }
                  >
                    {e.ativo ? "Ativa" : "Inativa"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1.5">
                    {e.vinculos.length === 0 ? (
                      <span className="text-[#8E8E8D] text-xs italic">Sem vínculos</span>
                    ) : (
                      e.vinculos.map((v) => (
                        <span
                          key={v.id}
                          className="inline-flex items-center gap-1 text-xs bg-[#DCE2EB] text-[#001F3E] px-2 py-0.5 rounded-full"
                        >
                          <span className="font-semibold uppercase">{v.tipoServico}</span>
                          <span className="text-[#64789B]">→ {v.responsavel.nome}</span>
                        </span>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-[#64789B] text-sm">{formatDate(e.criadoEm)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <GerenciarVinculosDialog empresa={e} usuarios={usuarios} />
                    <ToggleAtivoButton empresa={e} />
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
