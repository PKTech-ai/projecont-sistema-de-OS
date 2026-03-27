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
import { criarUsuario, alterarStatusUsuario, alterarRoleUsuario } from "@/server/actions/usuarios";
import { formatDate } from "@/lib/utils";
import { Plus, UserCheck, UserX, Pencil } from "lucide-react";
import type { Role, TipoSetor } from "@prisma/client";

interface Setor { id: string; nome: string; tipo: TipoSetor }
interface Usuario {
  id: string;
  nome: string;
  email: string;
  role: Role;
  ativo: boolean;
  criadoEm: Date;
  setor: { nome: string; tipo: TipoSetor };
}

const ROLES: Role[] = ["ANALISTA", "GESTOR", "SUPERADMIN", "TV"];

const ROLE_COLORS: Record<string, string> = {
  SUPERADMIN: "bg-[#001F3E] text-white border-0",
  GESTOR: "bg-[#2082BE] text-white border-0",
  ANALISTA: "bg-[#DCE2EB] text-[#001F3E] border-0",
  TV: "bg-zinc-100 text-zinc-600 border-0",
};

// ─── Formulário de Novo Usuário ───────────────────────────────────────────────

function NovoUsuarioDialog({ setores }: { setores: Setor[] }) {
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
        setorId: String(data.get("setorId")),
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
        <Button className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white gap-2 shadow-sm">
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      } />
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <div className="bg-[#F8FAFC] px-6 py-5 border-b border-[#DCE2EB]">
          <DialogTitle className="text-xl font-bold text-[#001F3E] flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#1AB6D9]/10 flex items-center justify-center">
              <UserCheck className="h-4 w-4 text-[#1AB6D9]" />
            </div>
            Criar Novo Usuário
          </DialogTitle>
          <p className="text-sm text-[#64789B] mt-1.5 ml-10">
            Preencha os dados abaixo para cadastrar um novo acesso ao sistema.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nome" className="text-[#3E3E3D] font-medium">Nome completo *</Label>
            <Input id="nome" name="nome" placeholder="Ex: João Silva" required className="border-[#DCE2EB] focus-visible:ring-[#1AB6D9]" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[#3E3E3D] font-medium">E-mail corporativo *</Label>
            <Input id="email" name="email" type="email" placeholder="joao@projecont.com.br" required className="border-[#DCE2EB] focus-visible:ring-[#1AB6D9]" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha" className="text-[#3E3E3D] font-medium">Senha inicial *</Label>
            <Input id="senha" name="senha" type="password" placeholder="Mínimo 6 caracteres" minLength={6} required className="border-[#DCE2EB] focus-visible:ring-[#1AB6D9]" />
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-[#3E3E3D] font-medium">Perfil de Acesso *</Label>
              <select
                id="role"
                name="role"
                required
                className="w-full h-10 rounded-md border border-[#DCE2EB] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1AB6D9]/40 text-[#3E3E3D]"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="setorId" className="text-[#3E3E3D] font-medium">Setor Vinculado *</Label>
              <select
                id="setorId"
                name="setorId"
                required
                className="w-full h-10 rounded-md border border-[#DCE2EB] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1AB6D9]/40 text-[#3E3E3D]"
              >
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>{s.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-md mt-2">{error}</p>}

          <div className="flex justify-end gap-3 pt-5 border-t border-[#DCE2EB] mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-[#DCE2EB] text-[#64789B]">
              Cancelar
            </Button>
            <Button type="submit" disabled={pending} className="bg-[#1AB6D9] hover:bg-[#2082BE] text-white">
              {pending ? "Criando..." : "Criar Usuário"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Dialog Editar Role/Setor ─────────────────────────────────────────────────

function EditarRoleDialog({
  usuario,
  setores,
}: {
  usuario: Usuario;
  setores: Setor[];
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
        String(data.get("setorId"))
      );
      if ("error" in result) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#64789B] hover:text-[#001F3E] hover:bg-[#F8FAFC]">
          <Pencil className="h-4 w-4" />
        </Button>
      } />
      <DialogContent className="max-w-sm p-0 overflow-hidden">
        <div className="bg-[#F8FAFC] px-6 py-5 border-b border-[#DCE2EB]">
          <DialogTitle className="text-lg font-bold text-[#001F3E] flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2082BE]/10 flex items-center justify-center">
              <Pencil className="h-4 w-4 text-[#2082BE]" />
            </div>
            Editar Acesso
          </DialogTitle>
          <p className="text-sm text-[#64789B] mt-1.5 ml-10">
            Atualize o perfil ou setor de <strong className="text-[#3E3E3D]">{usuario.nome}</strong>.
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[#3E3E3D] font-medium">Perfil de Acesso</Label>
            <select
              name="role"
              defaultValue={usuario.role}
              className="w-full h-10 rounded-md border border-[#DCE2EB] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1AB6D9]/40 text-[#3E3E3D]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[#3E3E3D] font-medium">Setor Vinculado</Label>
            <select
              name="setorId"
              defaultValue={setores.find((s) => s.nome === usuario.setor.nome)?.id}
              className="w-full h-10 rounded-md border border-[#DCE2EB] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1AB6D9]/40 text-[#3E3E3D]"
            >
              {setores.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
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

// ─── Toggle Status ────────────────────────────────────────────────────────────

function ToggleStatusButton({ usuario }: { usuario: Usuario }) {
  const [pending, startTransition] = useTransition();

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
      disabled={pending}
    >
      {usuario.ativo ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
    </Button>
  );
}

// ─── Main Client Component ────────────────────────────────────────────────────

export function UsuariosClient({
  usuarios,
  setores,
}: {
  usuarios: Usuario[];
  setores: Setor[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[#001F3E]">Usuários</h2>
          <p className="text-[#64789B] text-sm mt-1">{usuarios.length} usuários cadastrados</p>
        </div>
        <NovoUsuarioDialog setores={setores} />
      </div>

      <div className="bg-white rounded-xl border border-[#DCE2EB] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#DCE2EB]/50 hover:bg-[#DCE2EB]/50">
              <TableHead className="text-[#001F3E] font-semibold">Nome</TableHead>
              <TableHead className="text-[#001F3E] font-semibold">Email</TableHead>
              <TableHead className="text-[#001F3E] font-semibold">Perfil</TableHead>
              <TableHead className="text-[#001F3E] font-semibold">Setor</TableHead>
              <TableHead className="text-[#001F3E] font-semibold">Status</TableHead>
              <TableHead className="text-[#001F3E] font-semibold">Criado em</TableHead>
              <TableHead className="text-[#001F3E] font-semibold w-20">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios.map((u, i) => (
              <TableRow key={u.id} className={i % 2 === 1 ? "bg-[#F8FAFC]" : "bg-white"}>
                <TableCell className="font-medium text-[#3E3E3D]">{u.nome}</TableCell>
                <TableCell className="text-[#64789B] text-sm">{u.email}</TableCell>
                <TableCell>
                  <Badge className={`${ROLE_COLORS[u.role]} font-medium text-xs`}>
                    {u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-[#3E3E3D] text-sm">{u.setor.nome}</TableCell>
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
                <TableCell className="text-[#64789B] text-sm">{formatDate(u.criadoEm)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <EditarRoleDialog usuario={u} setores={setores} />
                    <ToggleStatusButton usuario={u} />
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
