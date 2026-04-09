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
  criarUsuario,
  alterarStatusUsuario,
  alterarRoleUsuario,
  atualizarCadastroUsuario,
} from "@/server/actions/usuarios";
import { formatDate } from "@/lib/utils";
import { Plus, UserCheck, UserX, Pencil, UserCircle } from "lucide-react";
import type { Role, TipoSetor } from "@prisma/client";
import { ROLES_GESTOR_GERENCIA } from "@/lib/gestor-permissions";

interface Setor { id: string; nome: string; tipo: TipoSetor }
interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  criadoEm: Date;
  origemContabilPro?: boolean;
  telefone: string | null;
  cargo: string | null;
  observacoes: string | null;
  setor: { nome: string; tipo: TipoSetor };
}

const ROLES: Role[] = ["ANALISTA", "GESTOR", "SAC", "SUPERADMIN", "TV"];

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: "bg-ds-ink text-white border-0",
  GESTOR: "bg-ds-info text-white border-0",
  ANALISTA: "bg-ds-pebble text-ds-ink border-0",
  SAC: "bg-ds-success-bg text-ds-success-fg border border-ds-pebble",
  TV: "bg-zinc-100 text-zinc-600 border-0",
};

// ─── Formulário de Novo Usuário ───────────────────────────────────────────────

function NovoUsuarioDialog({
  setores,
  modo,
  setorGestorId,
}: {
  setores: Setor[];
  modo: "superadmin" | "gestor";
  setorGestorId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);

    startTransition(async () => {
      const result = await criarUsuario({
        nome: String(data.get("nome")),
        email: String(data.get("email")),
        senha: String(data.get("senha")),
        role: String(data.get("role")) as Role,
        setorId: modo === "gestor" ? String(setorGestorId) : String(data.get("setorId")),
        telefone: String(data.get("telefone") || "").trim() || null,
        cargo: String(data.get("cargo") || "").trim() || null,
        observacoes: String(data.get("observacoes") || "").trim() || null,
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button className="bg-ds-info hover:bg-ds-ink-dark text-white gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      } />
      <DialogContent className={cn(dsDialogContentClass, "max-w-lg")} showCloseButton>
        <DsDialogHeader
          icon={UserCheck}
          title="Novo usuário"
          description={
            modo === "gestor"
              ? "Cadastre analistas ou SAC apenas no seu setor."
              : "Acesso ao sistema: e-mail para login, perfil e setor de atuação."
          }
        />
        <form onSubmit={handleSubmit}>
          <DsDialogBody className="max-h-[min(520px,80vh)] overflow-y-auto">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nome" className="ds-label">
                  Nome completo *
                </Label>
                <Input
                  id="nome"
                  name="nome"
                  placeholder="Ex.: João Silva"
                  required
                  className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="ds-label">
                  E-mail corporativo *
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="joao@projecont.com.br"
                  required
                  className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="telefone" className="ds-label">
                  Telefone / ramal
                </Label>
                <Input
                  id="telefone"
                  name="telefone"
                  placeholder="Opcional"
                  className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="cargo" className="ds-label">
                  Cargo / função
                </Label>
                <Input
                  id="cargo"
                  name="cargo"
                  placeholder="Ex.: Analista contábil pleno"
                  className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="senha" className="ds-label">
                  Senha inicial *
                </Label>
                <Input
                  id="senha"
                  name="senha"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                  className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="role" className="ds-label">
                  Perfil *
                </Label>
                <select
                  id="role"
                  name="role"
                  required
                  className="h-10 w-full rounded-[5px] border border-ds-stone bg-white px-3 text-sm text-ds-charcoal focus:outline-none focus:ring-2 focus:ring-ds-ink/10"
                >
                  {(modo === "gestor" ? ROLES_GESTOR_GERENCIA : ROLES).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              {modo === "superadmin" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="setorId" className="ds-label">
                    Setor *
                  </Label>
                  <select
                    id="setorId"
                    name="setorId"
                    required
                    className="h-10 w-full rounded-[5px] border border-ds-stone bg-white px-3 text-sm text-ds-charcoal focus:outline-none focus:ring-2 focus:ring-ds-ink/10"
                  >
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="observacoes" className="ds-label">
                  Observações internas
                </Label>
                <Textarea
                  id="observacoes"
                  name="observacoes"
                  rows={2}
                  placeholder="Notas administrativas (não visíveis ao usuário em tela pública)."
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
              {pending ? "Criando..." : "Criar usuário"}
            </Button>
          </DsDialogActions>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog Editar Role/Setor ─────────────────────────────────────────────────

function EditarRoleDialog({
  usuario,
  setores,
  modo,
  setorGestorId,
}: {
  usuario: Usuario;
  setores: Setor[];
  modo: "superadmin" | "gestor";
  setorGestorId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await alterarRoleUsuario(
        usuario.id,
        String(data.get("role")) as Role,
        modo === "gestor" ? String(setorGestorId) : String(data.get("setorId"))
      );
      if ("error" in result) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  if (modo === "gestor" && usuario.role === "GESTOR") {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-ds-ash hover:text-ds-ink hover:bg-ds-paper">
          <Pencil className="h-4 w-4" />
        </Button>
      } />
      <DialogContent className={cn(dsDialogContentClass, "max-w-md")} showCloseButton>
        <DsDialogHeader
          icon={Pencil}
          title="Perfil e setor"
          description={
            <>
              Ajuste o perfil de acesso de <strong className="text-ds-charcoal">{usuario.nome}</strong>.
            </>
          }
        />
        <form onSubmit={handleSubmit}>
          <DsDialogBody>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="ds-label">Perfil</Label>
                <select
                  name="role"
                  defaultValue={usuario.role}
                  className="h-10 w-full rounded-[5px] border border-ds-stone bg-white px-3 text-sm text-ds-charcoal focus:outline-none focus:ring-2 focus:ring-ds-ink/10"
                >
                  {(modo === "gestor" ? ROLES_GESTOR_GERENCIA : ROLES).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              {modo === "superadmin" && (
                <div className="space-y-1.5">
                  <Label className="ds-label">Setor</Label>
                  <select
                    name="setorId"
                    defaultValue={setores.find((s) => s.nome === usuario.setor.nome)?.id}
                    className="h-10 w-full rounded-[5px] border border-ds-stone bg-white px-3 text-sm text-ds-charcoal focus:outline-none focus:ring-2 focus:ring-ds-ink/10"
                  >
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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

function EditarCadastroDialog({ usuario }: { usuario: Usuario }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const r = await atualizarCadastroUsuario({
        usuarioId: usuario.id,
        telefone: String(fd.get("telefone") || "").trim() || null,
        cargo: String(fd.get("cargo") || "").trim() || null,
        observacoes: String(fd.get("observacoes") || "").trim() || null,
      });
      if ("error" in r) setError(r.error);
      else {
        setOpen(false);
        setError("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-ds-ash hover:text-ds-ink" title="Dados cadastrais">
          <UserCircle className="h-4 w-4" />
        </Button>
      } />
      <DialogContent className={cn(dsDialogContentClass, "max-w-md")} showCloseButton>
        <DsDialogHeader
          icon={UserCircle}
          title="Dados cadastrais"
          description={`Telefone, cargo e observações internas de ${usuario.nome}.`}
        />
        <form onSubmit={handleSubmit}>
          <DsDialogBody>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="ds-label">Telefone / ramal</Label>
                <Input
                  name="telefone"
                  defaultValue={usuario.telefone ?? ""}
                  className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="ds-label">Cargo / função</Label>
                <Input
                  name="cargo"
                  defaultValue={usuario.cargo ?? ""}
                  className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="ds-label">Observações internas</Label>
                <Textarea
                  name="observacoes"
                  rows={3}
                  defaultValue={usuario.observacoes ?? ""}
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

// ─── Toggle Status ────────────────────────────────────────────────────────────

function ToggleStatusButton({
  usuario,
  modo,
  currentUserId,
}: {
  usuario: Usuario;
  modo: "superadmin" | "gestor";
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();

  const disabledGestor =
    modo === "gestor" &&
    (usuario.role === "GESTOR" || usuario.id === currentUserId);

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-7 w-7 ${usuario.ativo ? "text-green-600 hover:text-red-500" : "text-zinc-400 hover:text-green-600"}`}
      title={usuario.ativo ? "Desativar usuário" : "Ativar usuário"}
      onClick={() => {
        startTransition(async () => {
          await alterarStatusUsuario(usuario.id, !usuario.ativo);
        });
      }}
      disabled={pending || disabledGestor}
    >
      {usuario.ativo ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
    </Button>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function UsuariosClient({
  usuarios,
  setores,
  modo,
  setorGestorId,
  setorGestorNome,
  currentUserId,
}: {
  usuarios: Usuario[];
  setores: Setor[];
  modo: "superadmin" | "gestor";
  setorGestorId: string;
  setorGestorNome: string;
  currentUserId: string;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ds-ink">
            {modo === "gestor" ? `Equipe — ${setorGestorNome}` : "Usuários"}
          </h2>
          <p className="text-ds-ash text-sm mt-1">
            {modo === "gestor"
              ? `${usuarios.length} funcionário(s) do seu setor`
              : `${usuarios.length} usuários cadastrados`}
          </p>
        </div>
        <NovoUsuarioDialog setores={setores} modo={modo} setorGestorId={setorGestorId} />
      </div>

      <div className="bg-white rounded-xl border border-ds-pebble overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-ds-pebble/50 hover:bg-ds-pebble/50">
              <TableHead className="text-ds-ink font-semibold">Nome</TableHead>
              <TableHead className="text-ds-ink font-semibold">Email</TableHead>
              <TableHead className="text-ds-ink font-semibold">Telefone</TableHead>
              <TableHead className="text-ds-ink font-semibold">Cargo</TableHead>
              <TableHead className="text-ds-ink font-semibold">Perfil</TableHead>
              <TableHead className="text-ds-ink font-semibold">Setor</TableHead>
              <TableHead className="text-ds-ink font-semibold">Status</TableHead>
              <TableHead className="text-ds-ink font-semibold">Criado em</TableHead>
              <TableHead className="text-ds-ink font-semibold w-28">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u, i) => (
              <TableRow key={u.id} className={i % 2 === 1 ? "bg-ds-paper" : "bg-white"}>
                <TableCell className="font-medium text-ds-charcoal">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span>{u.nome}</span>
                    {u.origemContabilPro ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-ds-info/40 text-ds-info bg-ds-info/5 font-normal"
                      >
                        Contábil Pro
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-ds-ash text-sm">{u.email}</TableCell>
                <TableCell className="text-ds-ash text-sm">{u.telefone ?? "—"}</TableCell>
                <TableCell className="text-ds-ash text-sm max-w-[140px] truncate" title={u.cargo ?? ""}>
                  {u.cargo ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge className={`${ROLE_COLORS[u.role]} font-medium text-xs`}>
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-ds-charcoal text-sm">{u.setor.nome}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={u.ativo
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-zinc-50 text-zinc-500 border-zinc-200"
                    }
                  >
                    {u.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </TableCell>
                <TableCell className="text-ds-ash text-sm">{formatDate(u.criadoEm)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <EditarCadastroDialog usuario={u} />
                    <EditarRoleDialog
                      usuario={u}
                      setores={setores}
                      modo={modo}
                      setorGestorId={setorGestorId}
                    />
                    <ToggleStatusButton usuario={u} modo={modo} currentUserId={currentUserId} />
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
