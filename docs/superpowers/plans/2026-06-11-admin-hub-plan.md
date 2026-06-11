# Hub de Administração Geral e Gerenciamento de Setores - Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar um hub de administração geral ("System Admin"), unificar os modais de edição de usuário para permitir alteração de Nome, E-mail, Setor, Perfil e Cargo, adicionar o gerenciamento de setores e cadastrar o usuário administrador `admin@pktech.ai`.

**Architecture:** Ações no servidor (Server Actions) em Next.js para manipulação de banco de dados por meio de transações Prisma seguras, protegidas por verificações de sessão. Interfaces em React Server e Client Components estilizadas conforme o Design System "Ink & Paper".

**Tech Stack:** Next.js (App Router), Prisma, Tailwind CSS v4, Lucide React, Zod, BcryptJS.

---

### Task 1: Seeding do Usuário Administrador

**Files:**
- Modify: [seed.ts](file:///Users/ryanrichard/projecont/projecont-sistema-de-os/prisma/seed.ts)

- [ ] **Step 1: Adicionar o usuário admin@pktech.ai no seed.ts**
  Atualizar a lista de usuários criados em `prisma/seed.ts` para incluir o usuário `admin@pktech.ai` com perfil `SUPERADMIN`.
  
  ```typescript
  // Localizar a lista em prisma/seed.ts por volta da linha 54
  // Adicionar o novo usuário:
  { 
    nome: "Admin PK Tech", 
    email: "admin@pktech.ai", 
    senha: await hash("Admin123"), 
    role: "SUPERADMIN", 
    setorId: S["IA"].id 
  }
  ```

- [ ] **Step 2: Rodar o seed para validar**
  Run: `npx prisma db seed`
  Expected: Execução com sucesso e saída contendo a criação dos usuários sem erros.

- [ ] **Step 3: Commit**
  ```bash
  git add prisma/seed.ts
  git commit -m "db: add admin@pktech.ai to seed data"
  ```

---

### Task 2: Server Actions para Usuários e Setores

**Files:**
- Modify: [src/server/actions/usuarios.ts](file:///Users/ryanrichard/projecont/projecont-sistema-de-os/src/server/actions/usuarios.ts)
- Create: [src/server/actions/setores.ts](file:///Users/ryanrichard/projecont/projecont-sistema-de-os/src/server/actions/setores.ts)

- [ ] **Step 1: Atualizar a action de edição de usuário em usuarios.ts**
  Expandir o schema `atualizarCadastroUsuarioSchema` e a lógica de `atualizarCadastroUsuario` para permitir atualizar Nome, E-mail, Role e SetorId.
  
  ```typescript
  // Substituir o atualizarCadastroUsuarioSchema existente em src/server/actions/usuarios.ts:
  const atualizarCadastroUsuarioSchema = z.object({
    usuarioId: z.string(),
    nome: z.string().min(2).optional(),
    email: z.string().email().optional(),
    role: z.nativeEnum(Role).optional(),
    setorId: z.string().optional(),
    telefone: z.string().optional().nullable(),
    cargo: z.string().optional().nullable(),
    observacoes: z.string().optional().nullable(),
  });
  ```
  
  E atualizar a lógica da função `atualizarCadastroUsuario` para validar a unicidade de e-mail e regras de permissão:
  
  ```typescript
  export async function atualizarCadastroUsuario(
    input: z.infer<typeof atualizarCadastroUsuarioSchema>
  ): Promise<ActionResult> {
    const session = await getDashboardSession();
    if (!session) return { error: "Não autorizado" };

    const parsed = atualizarCadastroUsuarioSchema.safeParse(input);
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

    const { usuarioId, nome, email, role, setorId, telefone, cargo, observacoes } = parsed.data;

    const alvo = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!alvo) return { error: "Usuário não encontrado" };

    // Validações de Permissões
    if (session.user.role !== "SUPERADMIN") {
      if (session.user.role === "GESTOR") {
        if (alvo.setorId !== session.user.setorId) {
          return { error: "Só é possível editar usuários do seu setor" };
        }
        if (alvo.role === "GESTOR" || alvo.role === "SUPERADMIN") {
          return { error: "Não autorizado a alterar gestores ou administradores" };
        }
        if (setorId && setorId !== session.user.setorId) {
          return { error: "Gestor não pode mudar o setor de um funcionário" };
        }
        if (role && (role === "SUPERADMIN" || role === "TV")) {
          return { error: "Gestor não pode atribuir essas permissões" };
        }
      } else {
        return { error: "Não autorizado" };
      }
    }

    // Validar unicidade do email se alterado
    if (email && email.toLowerCase().trim() !== alvo.email.toLowerCase().trim()) {
      const existing = await prisma.usuario.findFirst({
        where: { email: { equals: email.toLowerCase().trim(), mode: "insensitive" } }
      });
      if (existing) return { error: "E-mail já está cadastrado para outro usuário" };
    }

    await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        ...(nome && { nome: nome.trim() }),
        ...(email && { email: email.toLowerCase().trim() }),
        ...(role && { role }),
        ...(setorId && { setorId }),
        telefone: telefone !== undefined ? (telefone?.trim() || null) : undefined,
        cargo: cargo !== undefined ? (cargo?.trim() || null) : undefined,
        observacoes: observacoes !== undefined ? (observacoes?.trim() || null) : undefined,
      },
    });

    revalidatePath("/admin/usuarios");
    return { success: true };
  }
  ```

- [ ] **Step 2: Criar a server action de edição de setores em setores.ts**
  Escrever a action `editarSetor` em `src/server/actions/setores.ts`:
  
  ```typescript
  "use server";

  import { getDashboardSession } from "@/lib/contabil-session";
  import { prisma } from "@/lib/prisma";
  import { revalidatePath } from "next/cache";
  import { z } from "zod";
  import type { ActionResult } from "@/types";

  const editarSetorSchema = z.object({
    id: z.string(),
    nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  });

  export async function editarSetor(
    id: string,
    nome: string
  ): Promise<ActionResult> {
    const session = await getDashboardSession();
    if (!session || session.user.role !== "SUPERADMIN") {
      return { error: "Não autorizado. Apenas administradores do sistema podem editar setores." };
    }

    const parsed = editarSetorSchema.safeParse({ id, nome });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
    }

    try {
      await prisma.setor.update({
        where: { id: parsed.data.id },
        data: { nome: parsed.data.nome.trim() },
      });

      revalidatePath("/admin/setores");
      revalidatePath("/admin/usuarios");
      return { success: true };
    } catch (e: any) {
      return { error: "Erro ao atualizar o setor no banco de dados." };
    }
  }
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add src/server/actions/usuarios.ts src/server/actions/setores.ts
  git commit -m "feat: add user action updates and sector edit action"
  ```

---

### Task 3: Hub Central `/admin` e Sidebar

**Files:**
- Modify: [src/components/layout/Sidebar.tsx](file:///Users/ryanrichard/projecont/projecont-sistema-de-os/src/components/layout/Sidebar.tsx)
- Create: [src/app/(dashboard)/admin/page.tsx](file:///Users/ryanrichard/projecont/projecont-sistema-de-os/src/app/(dashboard)/admin/page.tsx)

- [ ] **Step 1: Adicionar Setores e link do painel no Sidebar.tsx**
  Localizar `adminItems` em `src/components/layout/Sidebar.tsx` e inserir o item "Setores".
  
  ```typescript
  // Modificar adminItems por volta da linha 63:
  const adminItems: NavItem[] = [
    {
      label: "Desempenho",
      href: "/admin/desempenho",
      icon: BarChart3,
      roles: ["SUPERADMIN", "GESTOR"],
    },
    {
      label: "Usuários",
      href: "/admin/usuarios",
      icon: Users,
      roles: ["SUPERADMIN", "GESTOR"],
    },
    {
      label: "Empresas",
      href: "/admin/empresas",
      icon: Building2,
      roles: ["SUPERADMIN", "GESTOR"],
    },
    {
      label: "Setores",
      href: "/admin/setores",
      icon: FolderKanban,
      roles: ["SUPERADMIN"],
    },
    {
      label: "Projetos do setor",
      href: "/admin/projetos",
      icon: FolderOpen,
      roles: ["SUPERADMIN", "ANALISTA", "GESTOR"],
    },
  ];
  ```

- [ ] **Step 2: Criar src/app/(dashboard)/admin/page.tsx**
  Criar a página inicial do painel admin com links visuais para todos os submódulos:
  
  ```typescript
  import { getDashboardSession } from "@/lib/contabil-session";
  import { redirect } from "next/navigation";
  import Link from "next/link";
  import { Users, Building2, FolderKanban, FolderOpen, BarChart3 } from "lucide-react";
  import { PageContextNav } from "@/components/layout/PageContextNav";
  import { DashboardMainScroll } from "@/components/layout/DashboardMainScroll";

  export default async function AdminDashboardPage() {
    const session = await getDashboardSession();
    if (!session) redirect("/login");

    const isGestor = session.user.role === "GESTOR";
    const isSuper = session.user.role === "SUPERADMIN";

    if (!isGestor && !isSuper) redirect("/");

    const cards = [
      {
        title: "Usuários",
        desc: isSuper ? "Gerenciar todos os usuários do sistema, perfis e setores." : "Gerenciar funcionários do setor.",
        href: "/admin/usuarios",
        icon: Users,
        show: true
      },
      {
        title: "Empresas",
        desc: "Visualizar empresas parceiras e vínculos de atendimento.",
        href: "/admin/empresas",
        icon: Building2,
        show: true
      },
      {
        title: "Setores",
        desc: "Visualizar setores cadastrados e alterar nomes de exibição.",
        href: "/admin/setores",
        icon: FolderKanban,
        show: isSuper
      },
      {
        title: "Projetos do Setor",
        desc: "Acompanhar e criar projetos para organização interna.",
        href: "/admin/projetos",
        icon: FolderOpen,
        show: true
      },
      {
        title: "Relatórios de Desempenho",
        desc: "Métricas de SLA, volumetria e tempos de conclusão de chamados.",
        href: "/admin/desempenho",
        icon: BarChart3,
        show: true
      }
    ].filter(c => c.show);

    return (
      <DashboardMainScroll>
        <div className="space-y-6">
          <PageContextNav items={[{ label: "Painel inicial", href: "/" }, { label: "Administração Geral" }]} />
          
          <div>
            <h2 className="text-2xl font-bold text-ds-ink">Administração do Sistema</h2>
            <p className="text-ds-ash text-sm mt-1">
              Selecione o módulo administrativo que deseja gerenciar.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map(c => {
              const Icon = c.icon;
              return (
                <Link 
                  key={c.href} 
                  href={c.href}
                  className="bg-white p-5 rounded-xl border border-ds-pebble hover:border-ds-ink-dark/30 hover:shadow-sm transition-all duration-200 flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="w-10 h-10 rounded-lg bg-ds-linen flex items-center justify-center text-ds-ink group-hover:bg-ds-ink group-hover:text-ds-paper transition-all">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-ds-ink text-base">{c.title}</h3>
                      <p className="text-ds-ash text-xs mt-1 leading-relaxed">{c.desc}</p>
                    </div>
                  </div>
                  <span className="text-xs text-ds-ink font-medium mt-4 flex items-center gap-1 group-hover:underline">
                    Acessar painel &rarr;
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </DashboardMainScroll>
    );
  }
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add src/components/layout/Sidebar.tsx src/app/\(dashboard\)/admin/page.tsx
  git commit -m "feat: add admin dashboard hub and Sidebar menu link for sectors"
  ```

---

### Task 4: Tela de Gerenciamento de Setores

**Files:**
- Create: [src/app/(dashboard)/admin/setores/page.tsx](file:///Users/ryanrichard/projecont/projecont-sistema-de-os/src/app/(dashboard)/admin/setores/page.tsx)
- Create: [src/app/(dashboard)/admin/setores/SetoresClient.tsx](file:///Users/ryanrichard/projecont/projecont-sistema-de-os/src/app/(dashboard)/admin/setores/SetoresClient.tsx)

- [ ] **Step 1: Criar src/app/(dashboard)/admin/setores/page.tsx**
  Carregar os setores do banco e as estatísticas de usuários de cada setor para passar ao Client Component.
  
  ```typescript
  import { getDashboardSession } from "@/lib/contabil-session";
  import { redirect } from "next/navigation";
  import { prisma } from "@/lib/prisma";
  import { SetoresClient } from "./SetoresClient";
  import { PageContextNav } from "@/components/layout/PageContextNav";
  import { DashboardMainScroll } from "@/components/layout/DashboardMainScroll";

  export default async function SetoresAdminPage() {
    const session = await getDashboardSession();
    if (!session) redirect("/login");

    if (session.user.role !== "SUPERADMIN") redirect("/");

    const setoresRaw = await prisma.setor.findMany({
      include: {
        _count: {
          select: { usuarios: { where: { ativo: true } } }
        }
      },
      orderBy: { nome: "asc" }
    });

    const setores = setoresRaw.map(s => ({
      id: s.id,
      nome: s.nome,
      tipo: s.tipo,
      usuariosAtivos: s._count.usuarios,
    }));

    return (
      <DashboardMainScroll>
        <>
          <PageContextNav
            items={[
              { label: "Painel inicial", href: "/" },
              { label: "Administração", href: "/admin" },
              { label: "Setores" },
            ]}
          />
          <SetoresClient setores={setores} />
        </>
      </DashboardMainScroll>
    );
  }
  ```

- [ ] **Step 2: Criar src/app/(dashboard)/admin/setores/SetoresClient.tsx**
  Implementar a tabela de exibição e o modal de edição do nome do setor.
  
  ```typescript
  "use client";

  import { useState, useTransition } from "react";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
  import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
  import { DsDialogHeader, DsDialogBody, DsDialogActions, DsFormAlert, dsDialogContentClass } from "@/components/ui/ds-dialog";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Pencil, FolderKanban } from "lucide-react";
  import { cn } from "@/lib/utils";
  import { editarSetor } from "@/server/actions/setores";

  interface Setor {
    id: string;
    nome: string;
    tipo: string;
    usuariosAtivos: number;
  }

  function EditarSetorDialog({ setor }: { setor: Setor }) {
    const [open, setOpen] = useState(false);
    const [pending, startTransition] = useTransition();
    const [error, setError] = useState("");

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      const data = new FormData(e.currentTarget);
      const novoNome = String(data.get("nome"));

      startTransition(async () => {
        const result = await editarSetor(setor.id, novoNome);
        if ("error" in result) {
          setError(result.error);
        } else {
          setOpen(false);
          setError("");
        }
      });
    }

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={
          <Button variant="ghost" size="icon" className="h-8 w-8 text-ds-ash hover:text-ds-ink" title="Editar nome">
            <Pencil className="h-4 w-4" />
          </Button>
        } />
        <DialogContent className={cn(dsDialogContentClass, "max-w-md")} showCloseButton>
          <DsDialogHeader
            icon={FolderKanban}
            title="Editar nome do setor"
            description={`Altere o nome de exibição do setor técnico.`}
          />
          <form onSubmit={handleSubmit}>
            <DsDialogBody>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="ds-label">Código / Identificador único</Label>
                  <Input value={setor.tipo} disabled className="bg-ds-linen/50 text-ds-ash cursor-not-allowed border-ds-pebble" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nome" className="ds-label">Nome de Exibição *</Label>
                  <Input id="nome" name="nome" defaultValue={setor.nome} required className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10" />
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

  export function SetoresClient({ setores }: { setores: Setor[] }) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-ds-ink">Setores do Sistema</h2>
          <p className="text-ds-ash text-sm mt-1">
            Lista de setores de atuação. A edição é restrita a administradores do sistema.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-ds-pebble overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-ds-pebble/50 hover:bg-ds-pebble/50">
                <TableHead className="text-ds-ink font-semibold">Nome de Exibição</TableHead>
                <TableHead className="text-ds-ink font-semibold">Código Interno (Tipo)</TableHead>
                <TableHead className="text-ds-ink font-semibold">Funcionários Ativos</TableHead>
                <TableHead className="text-ds-ink font-semibold w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {setores.map((s, i) => (
                <TableRow key={s.id} className={i % 2 === 1 ? "bg-ds-paper" : "bg-white"}>
                  <TableCell className="font-medium text-ds-charcoal">{s.nome}</TableCell>
                  <TableCell className="text-ds-ash text-sm font-mono">{s.tipo}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-ds-cream/60 border-ds-pebble text-ds-charcoal">
                      {s.usuariosAtivos} funcionário(s)
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <EditarSetorDialog setor={s} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }
  ```

- [ ] **Step 3: Commit**
  ```bash
  git add src/app/\(dashboard\)/admin/setores/page.tsx src/app/\(dashboard\)/admin/setores/SetoresClient.tsx
  git commit -m "feat: add sector administration list page and dialog components"
  ```

---

### Task 5: Editor Unificado de Usuários no Frontend

**Files:**
- Modify: [src/app/(dashboard)/admin/usuarios/UsuariosClient.tsx](file:///Users/ryanrichard/projecont/projecont-sistema-de-os/src/app/(dashboard)/admin/usuarios/UsuariosClient.tsx)

- [ ] **Step 1: Substituir EditarRoleDialog e EditarCadastroDialog por EditarUsuarioDialog**
  No arquivo `src/app/(dashboard)/admin/usuarios/UsuariosClient.tsx`:
  - Remover a declaração e o uso dos componentes `EditarRoleDialog` e `EditarCadastroDialog`.
  - Implementar o componente `EditarUsuarioDialog` que agrupa todos os dados de Nome, E-mail, Telefone, Cargo, Perfil (Role), Setor e Observações.
  
  ```typescript
  // Substituir EditarRoleDialog e EditarCadastroDialog pelo componente abaixo:
  function EditarUsuarioDialog({
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
      const fd = new FormData(e.currentTarget);

      startTransition(async () => {
        const payload = {
          usuarioId: usuario.id,
          nome: modo === "superadmin" ? String(fd.get("nome")) : undefined,
          email: modo === "superadmin" ? String(fd.get("email")) : undefined,
          role: String(fd.get("role")) as Role,
          setorId: modo === "superadmin" ? String(fd.get("setorId")) : String(setorGestorId),
          telefone: String(fd.get("telefone") || "").trim() || null,
          cargo: String(fd.get("cargo") || "").trim() || null,
          observacoes: String(fd.get("observacoes") || "").trim() || null,
        };

        const r = await atualizarCadastroUsuario(payload);
        if ("error" in r) {
          setError(r.error);
        } else {
          setOpen(false);
          setError("");
        }
      });
    }

    const disabledGestor = modo === "gestor" && usuario.role === "GESTOR";

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={
          <Button variant="ghost" size="icon" className="h-8 w-8 text-ds-ash hover:text-ds-ink" title="Editar dados">
            <Pencil className="h-4 w-4" />
          </Button>
        } />
        <DialogContent className={cn(dsDialogContentClass, "max-w-lg")} showCloseButton>
          <DsDialogHeader
            icon={UserCircle}
            title="Editar Usuário"
            description={`Altere as informações de ${usuario.nome}.`}
          />
          <form onSubmit={handleSubmit}>
            <DsDialogBody className="max-h-[min(520px,80vh)] overflow-y-auto">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="nome" className="ds-label">Nome Completo</Label>
                  <Input
                    id="nome"
                    name="nome"
                    defaultValue={usuario.nome}
                    disabled={modo !== "superadmin"}
                    required
                    className={cn(
                      "rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10",
                      modo !== "superadmin" && "bg-ds-linen/50 cursor-not-allowed"
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="ds-label">E-mail Corporativo</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={usuario.email}
                    disabled={modo !== "superadmin"}
                    required
                    className={cn(
                      "rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10",
                      modo !== "superadmin" && "bg-ds-linen/50 cursor-not-allowed"
                    )}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="telefone" className="ds-label">Telefone / Ramal</Label>
                  <Input
                    id="telefone"
                    name="telefone"
                    defaultValue={usuario.telefone ?? ""}
                    className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="cargo" className="ds-label">Cargo / Função</Label>
                  <Input
                    id="cargo"
                    name="cargo"
                    defaultValue={usuario.cargo ?? ""}
                    className="rounded-[5px] border-ds-stone focus-visible:ring-ds-ink/10"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor="role" className="ds-label">Perfil / Acesso *</Label>
                  <select
                    id="role"
                    name="role"
                    defaultValue={usuario.role}
                    disabled={disabledGestor}
                    className={cn(
                      "h-10 w-full rounded-[5px] border border-ds-stone bg-white px-3 text-sm text-ds-charcoal focus:outline-none focus:ring-2 focus:ring-ds-ink/10",
                      disabledGestor && "bg-ds-linen/50 cursor-not-allowed"
                    )}
                  >
                    {(modo === "gestor" ? ROLES_GESTOR_GERENCIA : ROLES).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="setorId" className="ds-label">Setor *</Label>
                  <select
                    id="setorId"
                    name="setorId"
                    defaultValue={setores.find((s) => s.nome === usuario.setor.nome)?.id}
                    disabled={modo !== "superadmin"}
                    className={cn(
                      "h-10 w-full rounded-[5px] border border-ds-stone bg-white px-3 text-sm text-ds-charcoal focus:outline-none focus:ring-2 focus:ring-ds-ink/10",
                      modo !== "superadmin" && "bg-ds-linen/50 cursor-not-allowed"
                    )}
                  >
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="observacoes" className="ds-label">Observações internas</Label>
                  <Textarea
                    id="observacoes"
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
  ```
  
  - Atualizar o retorno do map do corpo da tabela `usuarios.map` por volta da linha 629:
  
  ```typescript
  // Substituir os botões antigos:
  // <EditarCadastroDialog usuario={u} />
  // <EditarRoleDialog ... />
  // Por:
  <EditarUsuarioDialog
    usuario={u}
    setores={setores}
    modo={modo}
    setorGestorId={setorGestorId}
  />
  ```

- [ ] **Step 2: Commit**
  ```bash
  git add src/app/\(dashboard\)/admin/usuarios/UsuariosClient.tsx
  git commit -m "feat: unify edit user dialogs into single EditarUsuarioDialog"
  ```
