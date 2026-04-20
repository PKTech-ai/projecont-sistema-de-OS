"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  criarEmpresa,
  ativarDesativarEmpresa,
  upsertVinculo,
  removerVinculo,
  importarDeParaVinculosCsv,
  atualizarDadosEmpresa,
} from "@/server/actions/empresas";
import { formatDate } from "@/lib/utils";
import { formatarCnpjExibicao } from "@/lib/cnpj";
import { Plus, Building2, Link2, Trash2, PlusCircle, Upload, Pencil } from "lucide-react";
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
  origemContabilPro?: boolean;
  cnpj: string | null;
  razaoSocial: string | null;
  nomeFantasia: string | null;
  emailContato: string | null;
  telefone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  observacoes: string | null;
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
  { tipo: "SOCIETARIO", label: "Societário" },
];

// ─── Importar de/para (CSV) ───────────────────────────────────────────────────

function ImportarDeParaDialog() {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [resultado, setResultado] = useState<{
    importados: number;
    ignorados: number;
    erros: string[];
  } | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const csv = String(fd.get("csv") ?? "");
    setError("");
    setResultado(null);
    startTransition(async () => {
      const r = await importarDeParaVinculosCsv(csv);
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setResultado(r.data!);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" className="gap-2 border-ds-pebble text-ds-charcoal shadow-sm hover:bg-ds-paper">
          <Upload className="h-4 w-4" />
          Importar de/para
        </Button>
      } />
      <DialogContent className={cn(dsDialogContentClass, "max-w-xl")} showCloseButton>
        <DsDialogHeader
          icon={Upload}
          title="Importar vínculos (de/para)"
          description={
            <>
              Cole um CSV com cabeçalho na primeira linha. Colunas aceitas:{" "}
              <strong className="text-ds-ink">email_responsavel</strong> (ou usuario_email),{" "}
              <strong className="text-ds-ink">tipo_servico</strong> (CONTABIL, FISCAL, DP, IA, CLIENTES, SOCIETARIO) e{" "}
              <strong className="text-ds-ink">cnpj</strong> ou <strong className="text-ds-ink">empresa_nome</strong>.
              Empresas e usuários precisam já existir no sistema.
            </>
          }
        />
        <form onSubmit={handleSubmit}>
          <DsDialogBody className="max-h-[min(420px,70vh)] overflow-y-auto">
            <div className="space-y-1.5">
              <Label htmlFor="csv" className="ds-label">
                Conteúdo CSV
              </Label>
              <Textarea
                id="csv"
                name="csv"
                rows={12}
                placeholder={`email_responsavel;tipo_servico;cnpj\nana@empresa.com.br;CONTABIL;12345678000199`}
                className="min-h-[200px] rounded-[5px] border-ds-stone font-mono text-xs focus-visible:ring-ds-ink/10"
                required
              />
            </div>
            {error ? <DsFormAlert>{error}</DsFormAlert> : null}
            {resultado ? (
              <div className="space-y-2 rounded-[5px] border border-ds-pebble bg-ds-paper/80 p-3 text-sm">
                <p className="font-semibold text-ds-ink">
                  Importados: {resultado.importados} · Ignorados: {resultado.ignorados}
                </p>
                {resultado.erros.length > 0 ? (
                  <ul className="max-h-32 list-inside list-disc overflow-y-auto text-xs text-ds-charcoal">
                    {resultado.erros.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-ds-success-fg">Nenhum aviso por linha.</p>
                )}
              </div>
            ) : null}
          </DsDialogBody>
          <DsDialogActions>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-ds-pebble">
              Fechar
            </Button>
            <Button type="submit" disabled={pending} className="bg-ds-ink text-ds-paper hover:bg-ds-ink-dark">
              {pending ? "Processando..." : "Importar"}
            </Button>
          </DsDialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Editar cadastro empresa (superadmin) ─────────────────────────────────────

function EditarEmpresaDialog({ empresa }: { empresa: Empresa }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await atualizarDadosEmpresa({
        id: empresa.id,
        nome: String(fd.get("nome")),
        cnpj: String(fd.get("cnpj") || ""),
        razaoSocial: String(fd.get("razaoSocial") || ""),
        nomeFantasia: String(fd.get("nomeFantasia") || ""),
        emailContato: String(fd.get("emailContato") || ""),
        telefone: String(fd.get("telefone") || ""),
        cep: String(fd.get("cep") || ""),
        logradouro: String(fd.get("logradouro") || ""),
        numero: String(fd.get("numero") || ""),
        complemento: String(fd.get("complemento") || ""),
        bairro: String(fd.get("bairro") || ""),
        cidade: String(fd.get("cidade") || ""),
        uf: String(fd.get("uf") || ""),
        observacoes: String(fd.get("observacoes") || ""),
      });
      if ("error" in r) setError(r.error);
      else {
        setOpen(false);
        setError("");
      }
    });
  }

  const inputCls =
    "rounded-[5px] border-ds-stone focus-visible:border-ds-ink focus-visible:ring-ds-ink/10";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-ds-ash hover:text-ds-ink" title="Editar cadastro">
          <Pencil className="h-4 w-4" />
        </Button>
      } />
      <DialogContent className={cn(dsDialogContentClass, "max-w-lg")} showCloseButton>
        <DsDialogHeader
          icon={Building2}
          title="Cadastro da empresa"
          description="Razão social, CNPJ, contatos e endereço usados para identificação e integrações."
        />
        <form onSubmit={handleSubmit}>
          <DsDialogBody className="max-h-[min(480px,75vh)] overflow-y-auto">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="ds-label">Nome exibido *</Label>
                <Input name="nome" required minLength={2} defaultValue={empresa.nome} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="ds-label">CNPJ</Label>
                <Input name="cnpj" placeholder="Somente números" defaultValue={empresa.cnpj ?? ""} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="ds-label">UF</Label>
                <Input name="uf" maxLength={2} defaultValue={empresa.uf ?? ""} className={inputCls} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="ds-label">Razão social</Label>
                <Input name="razaoSocial" defaultValue={empresa.razaoSocial ?? ""} className={inputCls} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="ds-label">Nome fantasia</Label>
                <Input name="nomeFantasia" defaultValue={empresa.nomeFantasia ?? ""} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="ds-label">E-mail</Label>
                <Input name="emailContato" type="email" defaultValue={empresa.emailContato ?? ""} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="ds-label">Telefone</Label>
                <Input name="telefone" defaultValue={empresa.telefone ?? ""} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="ds-label">CEP</Label>
                <Input name="cep" defaultValue={empresa.cep ?? ""} className={inputCls} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="ds-label">Logradouro</Label>
                <Input name="logradouro" defaultValue={empresa.logradouro ?? ""} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="ds-label">Número</Label>
                <Input name="numero" defaultValue={empresa.numero ?? ""} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="ds-label">Complemento</Label>
                <Input name="complemento" defaultValue={empresa.complemento ?? ""} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="ds-label">Bairro</Label>
                <Input name="bairro" defaultValue={empresa.bairro ?? ""} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label className="ds-label">Cidade</Label>
                <Input name="cidade" defaultValue={empresa.cidade ?? ""} className={inputCls} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="ds-label">Observações</Label>
                <Textarea name="observacoes" rows={3} defaultValue={empresa.observacoes ?? ""} className={inputCls} />
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
      const result = await criarEmpresa({
        nome: String(data.get("nome")),
        cnpj: String(data.get("cnpj") || "") || null,
        razaoSocial: String(data.get("razaoSocial") || "") || null,
        nomeFantasia: String(data.get("nomeFantasia") || "") || null,
        emailContato: String(data.get("emailContato") || "") || null,
        telefone: String(data.get("telefone") || "") || null,
        cep: String(data.get("cep") || "") || null,
        logradouro: String(data.get("logradouro") || "") || null,
        numero: String(data.get("numero") || "") || null,
        complemento: String(data.get("complemento") || "") || null,
        bairro: String(data.get("bairro") || "") || null,
        cidade: String(data.get("cidade") || "") || null,
        uf: String(data.get("uf") || "") || null,
        observacoes: String(data.get("observacoes") || "") || null,
      });
      if ("error" in result) {
        setError(result.error);
      } else {
        setOpen(false);
        setError("");
        form.reset();
      }
    });
  }

  const inputCls =
    "rounded-[5px] border-ds-stone focus-visible:border-ds-ink focus-visible:ring-ds-ink/10";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-ds-info hover:bg-ds-ink-dark text-white gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Nova Empresa
        </Button>
      } />
      <DialogContent className={cn(dsDialogContentClass, "max-w-lg")} showCloseButton>
        <DsDialogHeader
          icon={Building2}
          title="Cadastrar empresa"
          description="Nome e CNPJ identificam a empresa nos chamados e no de/para com o sistema contábil."
        />
        <form onSubmit={handleSubmit}>
          <DsDialogBody className="max-h-[min(480px,75vh)] overflow-y-auto">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ne-nome" className="ds-label">
                  Nome exibido *
                </Label>
                <Input
                  id="ne-nome"
                  name="nome"
                  placeholder="Ex.: Alpha Distribuidora Ltda"
                  required
                  minLength={2}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ne-cnpj" className="ds-label">
                  CNPJ
                </Label>
                <Input id="ne-cnpj" name="cnpj" placeholder="14 dígitos" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ne-uf" className="ds-label">
                  UF
                </Label>
                <Input id="ne-uf" name="uf" maxLength={2} placeholder="SP" className={inputCls} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ne-razao" className="ds-label">
                  Razão social
                </Label>
                <Input id="ne-razao" name="razaoSocial" className={inputCls} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ne-fantasia" className="ds-label">
                  Nome fantasia
                </Label>
                <Input id="ne-fantasia" name="nomeFantasia" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ne-mail" className="ds-label">
                  E-mail
                </Label>
                <Input id="ne-mail" name="emailContato" type="email" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ne-tel" className="ds-label">
                  Telefone
                </Label>
                <Input id="ne-tel" name="telefone" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ne-cep" className="ds-label">
                  CEP
                </Label>
                <Input id="ne-cep" name="cep" className={inputCls} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ne-log" className="ds-label">
                  Logradouro
                </Label>
                <Input id="ne-log" name="logradouro" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ne-num" className="ds-label">
                  Número
                </Label>
                <Input id="ne-num" name="numero" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ne-comp" className="ds-label">
                  Complemento
                </Label>
                <Input id="ne-comp" name="complemento" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ne-bairro" className="ds-label">
                  Bairro
                </Label>
                <Input id="ne-bairro" name="bairro" className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ne-cidade" className="ds-label">
                  Cidade
                </Label>
                <Input id="ne-cidade" name="cidade" className={inputCls} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ne-obs" className="ds-label">
                  Observações
                </Label>
                <Textarea id="ne-obs" name="observacoes" rows={2} className={inputCls} />
              </div>
            </div>
            {error ? <DsFormAlert>{error}</DsFormAlert> : null}
          </DsDialogBody>
          <DsDialogActions>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-ds-pebble">
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="bg-ds-ink text-ds-paper hover:bg-ds-ink-dark">
              {pending ? "Criando..." : "Criar empresa"}
            </Button>
          </DsDialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Gerenciar Vínculos ───────────────────────────────────────────────────────

function GerenciarVinculosDialog({
  empresa,
  usuarios,
  modo,
  setorTipoGestor,
}: {
  empresa: Empresa;
  usuarios: Usuario[];
  modo: "superadmin" | "gestor";
  setorTipoGestor?: TipoSetor;
}) {
  const [open, setOpen] = useState(false);
  const [pendingAdd, startAdd] = useTransition();
  const [pendingRemove, startRemove] = useTransition();
  const [selectedTipo, setSelectedTipo] = useState<TipoSetor>(
    modo === "gestor" && setorTipoGestor ? setorTipoGestor : "CONTABIL"
  );
  const [selectedUserId, setSelectedUserId] = useState("");
  const [searchUser, setSearchUser] = useState("");
  const [error, setError] = useState("");

  const tipoEfetivo = modo === "gestor" && setorTipoGestor ? setorTipoGestor : selectedTipo;

  // Filtra usuários do setor selecionado (excluindo TV)
  const usuariosFiltrados = usuarios.filter(
    (u) => u.setor.tipo === tipoEfetivo
  );

  const usuariosDoSetorPesquisados = usuariosFiltrados.filter(u =>
    u.nome.toLowerCase().includes(searchUser.toLowerCase())
  );

  // Tipos já vinculados nesta empresa
  const tiposVinculados = new Set(empresa.vinculos.map((v) => v.tipoServico));

  function handleAddVinculo() {
    if (!selectedUserId) return;
    setError("");
    startAdd(async () => {
      const result = await upsertVinculo({
        empresaId: empresa.id,
        tipoServico: tipoEfetivo,
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
          className="gap-1.5 border-ds-pebble text-ds-ash hover:text-ds-ink text-xs shadow-sm hover:bg-ds-paper"
        >
          <Link2 className="h-3.5 w-3.5" />
          Vínculos ({empresa.vinculos.length})
        </Button>
      } />
      <DialogContent className={cn(dsDialogContentClass, "max-w-lg")} showCloseButton>
        <DsDialogHeader
          icon={Link2}
          title={empresa.nome}
          description="Defina qual colaborador responde por esta empresa em cada tipo de serviço (de/para usado na abertura de chamados)."
        />

        <div className="space-y-6 bg-white px-6 py-5">
          {/* Vínculos existentes */}
          <div>
            <p className="text-sm font-semibold text-ds-ink mb-3">Responsáveis por setor</p>
            {empresa.vinculos.length === 0 ? (
              <p className="text-sm text-brand-gray-mid italic py-3 text-center bg-ds-paper rounded-lg border border-dashed border-ds-pebble">
                Nenhum vínculo cadastrado.
              </p>
            ) : (
              <div className="space-y-2">
                {empresa.vinculos.map((v) => {
                  const podeRemover =
                    modo === "superadmin" ||
                    (modo === "gestor" && setorTipoGestor === v.tipoServico);
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between bg-white border border-ds-pebble rounded-lg px-3 py-2.5 shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-bold bg-ds-ink text-white px-2.5 py-1 rounded-md uppercase tracking-wider">
                          {v.tipoServico}
                        </span>
                        <span className="text-sm font-medium text-ds-charcoal">{v.responsavel.nome}</span>
                      </div>
                      {podeRemover ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-ds-ash hover:text-red-600 hover:bg-red-50 rounded-md"
                          onClick={() => handleRemoveVinculo(v.tipoServico)}
                          disabled={pendingRemove}
                          title="Remover vínculo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-[10px] text-ds-ash uppercase">Outro setor</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Adicionar novo vínculo */}
          <div className="bg-ds-paper rounded-xl p-5 border border-ds-pebble">
            <p className="text-sm font-bold text-ds-ink mb-4">
              {tiposVinculados.size > 0 ? "Alterar ou adicionar responsável" : "Adicionar responsável"}
            </p>
            <div className={`grid gap-4 mb-4 ${modo === "gestor" ? "grid-cols-1" : "grid-cols-2"}`}>
              {modo === "superadmin" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-ds-ash uppercase tracking-wider">Setor / Serviço</Label>
                  <select
                    value={selectedTipo}
                    onChange={(e) => {
                      setSelectedTipo(e.target.value as TipoSetor);
                      setSelectedUserId("");
                    }}
                    className="w-full h-10 rounded-md border border-ds-pebble bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ds-info/40 text-ds-charcoal"
                  >
                    {SETORES_SERVICO.map((s) => (
                      <option key={s.tipo} value={s.tipo}>
                        {s.label}
                        {tiposVinculados.has(s.tipo) ? " ✓" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {modo === "gestor" && setorTipoGestor && (
                <p className="text-xs text-ds-charcoal bg-ds-linen border border-ds-pebble rounded-lg px-3 py-2">
                  Serviço: <strong>{SETORES_SERVICO.find((s) => s.tipo === setorTipoGestor)?.label}</strong>
                </p>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-ds-ash uppercase tracking-wider">Responsável</Label>
                <Input
                  placeholder="Pesquisar..."
                  value={searchUser}
                  onChange={(e) => setSearchUser(e.target.value)}
                  className="h-9 text-sm"
                />
                <div className="h-32 overflow-y-auto border border-ds-pebble rounded-md bg-white">
                  {usuariosDoSetorPesquisados.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={cn(
                        "px-3 py-2 text-sm cursor-pointer hover:bg-ds-paper transition-colors",
                        selectedUserId === u.id
                          ? "bg-ds-info-bg text-ds-info font-medium border-l-[3px] border-l-ds-info"
                          : "text-ds-charcoal"
                      )}
                    >
                      {u.nome}
                    </div>
                  ))}
                  {usuariosDoSetorPesquisados.length === 0 && (
                    <div className="p-3 text-xs text-ds-ash text-center italic">
                      Nenhum resultado
                    </div>
                  )}
                </div>
              </div>
            </div>
            {usuariosFiltrados.length === 0 && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-md mb-4">
                Nenhum funcionário cadastrado no setor{" "}
                <strong>{SETORES_SERVICO.find((s) => s.tipo === tipoEfetivo)?.label}</strong>.
              </p>
            )}
            {error ? <DsFormAlert className="mb-4">{error}</DsFormAlert> : null}
            <Button
              onClick={handleAddVinculo}
              disabled={!selectedUserId || pendingAdd}
              className="w-full bg-ds-ink hover:bg-ds-ink-dark text-white gap-2 h-10"
            >
              <PlusCircle className="h-4 w-4" />
              {tiposVinculados.has(tipoEfetivo) ? "Atualizar responsável" : "Adicionar responsável"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Toggle Ativo ─────────────────────────────────────────────────────────────

function ToggleAtivoButton({
  empresa,
  podeToggle,
}: {
  empresa: Empresa;
  podeToggle: boolean;
}) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending || !podeToggle}
      title={!podeToggle ? "Só é possível após existir vínculo com o seu setor" : undefined}
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
  modo,
  setorTipoGestor,
}: {
  empresas: Empresa[];
  usuarios: Usuario[];
  modo: "superadmin" | "gestor";
  setorTipoGestor?: TipoSetor;
}) {
  const [searchGeral, setSearchGeral] = useState("");

  const empresasFiltradas = empresas.filter((e) => {
    if (!searchGeral) return true;
    const lower = searchGeral.toLowerCase();
    const cleanCnpj = searchGeral.replace(/\D/g, "");
    return (
      (e.nome && e.nome.toLowerCase().includes(lower)) ||
      (e.razaoSocial && e.razaoSocial.toLowerCase().includes(lower)) ||
      (e.cnpj && cleanCnpj && e.cnpj.includes(cleanCnpj))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ds-ink">
            {modo === "gestor" ? "Empresas — seu setor" : "Empresas e Vínculos"}
          </h2>
          <p className="text-ds-ash text-sm mt-1">
            {empresasFiltradas.length} empresas encontradas
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Buscar por nome ou CNPJ..."
            value={searchGeral}
            onChange={(e) => setSearchGeral(e.target.value)}
            className="w-64 h-9 bg-white shadow-sm"
          />
          <ImportarDeParaDialog />
          <NovaEmpresaDialog />
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-ds-info-bg border border-ds-info/20 rounded-xl px-4 py-3 text-sm text-ds-info">
        {modo === "gestor" && setorTipoGestor ? (
          <>
            <strong>Gestor:</strong> você define o responsável do seu tipo de serviço (
            {SETORES_SERVICO.find((s) => s.tipo === setorTipoGestor)?.label}) por empresa.
            Ativar ou desativar a empresa só é permitido quando já existir vínculo com o seu setor.
          </>
        ) : (
          <>
            <strong>Regra de vínculos:</strong> cada empresa pode ter um responsável por tipo de serviço (Contábil, Fiscal, DP, IA, Clientes).
            Use <strong>Importar de/para</strong> para carregar o CSV exportado do sistema contábil (usuário × empresa × serviço).
          </>
        )}
      </div>

      <div className="bg-white rounded-xl border border-ds-pebble overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-ds-pebble/50 hover:bg-ds-pebble/50">
              <TableHead className="text-ds-ink font-semibold">Empresa</TableHead>
              <TableHead className="text-ds-ink font-semibold">CNPJ</TableHead>
              <TableHead className="text-ds-ink font-semibold">Local</TableHead>
              <TableHead className="text-ds-ink font-semibold">Status</TableHead>
              <TableHead className="text-ds-ink font-semibold">Vínculos</TableHead>
              <TableHead className="text-ds-ink font-semibold">Criado em</TableHead>
              <TableHead className="text-ds-ink font-semibold w-44">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-ds-ash">
                  Nenhuma empresa encontrada para essa busca.
                </TableCell>
              </TableRow>
            ) : (
              empresasFiltradas.map((e, i) => {
                const podeToggleGestor = Boolean(
                modo === "superadmin" ||
                  (modo === "gestor" &&
                    setorTipoGestor &&
                    e.vinculos.some((v) => v.tipoServico === setorTipoGestor))
              );
              return (
              <TableRow key={e.id} className={i % 2 === 1 ? "bg-ds-paper" : "bg-white"}>
                <TableCell className="font-medium text-ds-charcoal">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{e.nome}</span>
                    {e.origemContabilPro ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-ds-info/40 text-ds-info bg-ds-info/5 font-normal"
                      >
                        Contábil Pro
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-ds-ash text-xs font-mono">
                  {e.cnpj ? formatarCnpjExibicao(e.cnpj) : "—"}
                </TableCell>
                <TableCell className="text-ds-ash text-sm">
                  {e.cidade || e.uf
                    ? [e.cidade, e.uf].filter(Boolean).join(" / ")
                    : "—"}
                </TableCell>
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
                      <span className="text-brand-gray-mid text-xs italic">Sem vínculos</span>
                    ) : (
                      e.vinculos.map((v) => (
                        <span
                          key={v.id}
                          className="inline-flex items-center gap-1 text-xs bg-ds-pebble text-ds-ink px-2 py-0.5 rounded-full"
                        >
                          <span className="font-semibold uppercase">{v.tipoServico}</span>
                          <span className="text-ds-ash">→ {v.responsavel.nome}</span>
                        </span>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-ds-ash text-sm">{formatDate(e.criadoEm)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    {modo === "superadmin" ? <EditarEmpresaDialog empresa={e} /> : null}
                    <GerenciarVinculosDialog
                      empresa={e}
                      usuarios={usuarios}
                      modo={modo}
                      setorTipoGestor={setorTipoGestor}
                    />
                    <ToggleAtivoButton empresa={e} podeToggle={podeToggleGestor} />
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
