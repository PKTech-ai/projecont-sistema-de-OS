# Especificação de Design: Hub de Administração Geral e Gerenciamento de Setores

Este documento especifica a criação de uma área de administração centralizada ("System Admin") e a expansão de controle sobre usuários (Nome, E-mail, Perfil, Setor, Cargo/Função) e setores.

---

## 1. Usuário Administrador
Para garantir acesso irrestrito às novas e existentes ferramentas de administração, será adicionado um usuário padrão no banco de dados com permissões master.

### Credenciais:
* **E-mail**: `admin@pktech.ai`
* **Senha**: `Admin123` (armazenada com hash bcrypt)
* **Perfil/Role**: `SUPERADMIN`
* **Setor**: `IA` (Setor padrão do administrador do sistema)

---

## 2. Ações do Servidor (Server Actions)

### 2.1. Usuários (`src/server/actions/usuarios.ts`)
A server action `atualizarCadastroUsuario` será expandida para suportar a atualização de todos os campos críticos.

```typescript
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

**Regras de validação e permissões na Action:**
1. **Unicidade de E-mail**: Se o e-mail for alterado, verificar se não existe outro usuário com o mesmo e-mail no banco de dados.
2. **SUPERADMIN**: Tem permissão para alterar qualquer campo de qualquer usuário (Nome, E-mail, Role, Setor, Telefone, Cargo, Observações).
3. **GESTOR**:
   * Só pode editar usuários pertencentes ao mesmo `setorId` que o seu.
   * Não pode alterar o campo `setorId` (não pode transferir usuários de setor).
   * Não pode promover usuários para as roles `SUPERADMIN` ou `TV`.
   * Não pode alterar dados de um `SUPERADMIN` ou outro `GESTOR`.

### 2.2. Setores (`src/server/actions/setores.ts`) [NOVA]
Criaremos uma nova action para gerenciar os setores. Como os setores são associados a um enum `TipoSetor` no banco de dados, o gerenciamento consistirá na edição do nome de exibição.

* **`editarSetor(setorId: string, nome: string)`**:
  * Permissão: Apenas usuários com a role `SUPERADMIN` podem executar.
  * Ação: Atualizar o campo `nome` do setor com o `id` correspondente.
  * Revalidação: Executar `revalidatePath("/admin/setores")` e `revalidatePath("/admin/usuarios")`.

---

## 3. Interfaces de Usuário (UI)

### 3.1. Hub de Administração Central (`src/app/(dashboard)/admin/page.tsx`) [NOVA]
Uma página inicial para a administração que exibe cartões de navegação elegantes para os módulos existentes e novos:
* **Usuários**: "Gerenciar usuários, cargos/funções, perfis de acesso e setores."
* **Empresas**: "Gerenciar empresas parceiras, CNPJ e vínculos de responsabilidade."
* **Setores**: "Gerenciar os setores cadastrados, visualizar estatísticas e editar nomes."
* **Projetos do setor**: "Visualizar e gerenciar projetos ativos nos setores."
* **Desempenho**: "Acompanhar métricas de SLA e tempo de entrega de chamados."

### 3.2. Gerenciamento de Setores (`src/app/(dashboard)/admin/setores/page.tsx` & `SetoresClient.tsx`) [NOVAS]
* **Tabela de Setores**: Exibe todos os setores cadastrados (`nome`, `tipo` e quantidade de usuários ativos vinculados).
* **Diálogo de Edição**: Um modal que permite alterar o nome do setor (ex.: mudar "Departamento Pessoal" para "DP").
* **Restrição**: Disponível apenas para `SUPERADMIN`. Outros perfis que tentarem acessar serão redirecionados para `/`.

### 3.3. Editor de Usuário Unificado (`src/app/(dashboard)/admin/usuarios/UsuariosClient.tsx`)
Substituiremos os diálogos `EditarCadastroDialog` e `EditarRoleDialog` por um único componente `EditarUsuarioDialog`.
* **Formulário Completo**:
  * Nome Completo (Habilitado para SUPERADMIN, desabilitado/leitura para GESTOR se for outro gestor)
  * E-mail Corporativo (Habilitado para SUPERADMIN)
  * Telefone / Ramal
  * Cargo / Função (Mapeado para o campo `cargo` do usuário)
  * Perfil (Role) (Select habilitado apenas para SUPERADMIN e, com limitações, para GESTOR)
  * Setor (Select habilitado apenas para SUPERADMIN)
  * Observações Internas

---

## 4. Menu Lateral (`src/components/layout/Sidebar.tsx`)
Adicionar o link de navegação para a página de Setores:
* **Rótulo**: "Setores"
* **Ícone**: `FolderKanban` ou `Building2` (adequado à estética atual)
* **Link**: `/admin/setores`
* **Permissões**: Exibido apenas se a role do usuário logado for `SUPERADMIN`.

---

## 5. Plano de Validação
* **Testes Manuais**:
  * Executar o seed e autenticar com o usuário `admin@pktech.ai`.
  * Acessar o novo Hub em `/admin` e a página de Setores em `/admin/setores`.
  * Editar o nome de um setor e verificar se reflete na lista de usuários.
  * Abrir o diálogo unificado de edição de usuário e alterar Nome, E-mail, Cargo, Perfil e Setor. Confirmar se os dados persistem corretamente no banco de dados.
  * Logar como `GESTOR` e garantir que as restrições de edição de usuários (não alterar e-mail/nome/setor de terceiros e não acessar `/admin/setores`) estão funcionando e protegidas.
