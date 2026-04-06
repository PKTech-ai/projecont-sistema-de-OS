# Controle de Sprints — Sistema de Chamados Internos
## Projecont · SOP-IA v2.0

---

## Sprint 0 — Scaffolding e Infraestrutura Base

- [x] create-next-app com TypeScript, Tailwind, App Router
- [x] Instalar dependências (Prisma, NextAuth, RHF, Zod, bcryptjs)
- [x] Inicializar shadcn/ui e adicionar componentes
- [x] Configurar brand tokens Projecont no globals.css
- [x] Criar ProjecontLogo com variantes dark/light
- [x] Criar prisma/schema.prisma completo
- [x] Criar src/lib/prisma.ts (singleton)
- [x] Criar src/lib/auth.ts (NextAuth credentials)
- [x] Criar src/lib/sla.ts (adicionarDiasUteis, diasUteisEntre)
- [x] Criar prisma/seed.ts (5 setores + SUPERADMIN)
- [x] Criar .cursor/rules
- [x] Criar .env.local com variáveis obrigatórias

---

## Sprint 1 — Auth + Layout Base

- [x] Página de login com layout split (brand-navy + formulário)
- [x] Route handler NextAuth
- [x] Middleware de proteção de rotas
- [x] Dashboard layout (sidebar + header)
- [x] Sidebar com navegação condicional por role
- [x] Header com notificações e menu do usuário
- [x] Redirect por role pós-login

---

## Sprint 2 — Módulo de Chamados Core

- [x] Server Action: criarChamado() com roteamento automático
- [x] Server Action: mudarStatus() com máquina de estados
- [x] Server Action: assumirChamadoIA()
- [x] Server Action: transferirChamado()
- [x] Server Action: cancelarChamado()
- [x] Server Action: adicionarComentario()
- [x] Queries: getChamados() com filtros por role
- [x] Queries: getChamadoById() com include completo
- [x] Página lista de chamados com tabela e paginação
- [x] Página novo chamado com formulário inteligente
- [x] Página detalhe do chamado com timeline e ações
- [x] Componente ChamadoStatus com badges corretos
- [x] Componente ChamadoPrioridade com badges corretos
- [x] Componente SlaIndicator
- [x] Componente AcoesCard com ações condicionais por role
- [x] Componente ComentariosSection

---

## Sprint 3 — Dashboards e Notificações

- [x] Queries: getKPIs() por role
- [x] Queries: getMeusChamados()
- [x] Queries: getChamadosSetor()
- [x] Dashboard pessoal com StatsCards
- [x] Dashboard de setor
- [x] Componente StatsCards com design Projecont
- [x] Componente TabelaChamados reutilizável

---

## Sprint 4 — Admin + Projetos IA + TV Display

- [x] Server Action: criarUsuario(), alterarStatusUsuario(), alterarRoleUsuario()
- [x] Server Action: criarProjeto(), editarProjeto(), desativarProjeto()
- [x] Página admin/usuarios (SUPERADMIN)
- [x] Página admin/empresas com VinculoEmpresa (SUPERADMIN)
- [ ] ~~Página admin/templates~~ — removido do escopo (sem módulo de templates)
- [x] Página admin/projetos (ANALISTA/GESTOR IA + SUPERADMIN)
- [x] Página TV fullscreen por setor com auto-refresh 30s
- [x] Componente TVRefresher

---

## Sprint 5 — Job Auto-Fechamento + SLA Visual

- [x] src/jobs/autoFechar.ts com executarAutoFechamento()
- [x] Endpoint /api/jobs/auto-fechar protegido por CRON_SECRET
- [x] SlaIndicator com badges vermelho/amarelo na tabela

---

## Sprint 6 — Qualidade e Deploy

- [x] docs/escopo.md
- [x] docs/adrs/ADR-001-stack.md
- [x] docs/adrs/ADR-002-server-actions.md
- [x] docs/adrs/ADR-003-job-cron.md
- [x] docs/deploy.md com crontab e comandos
- [x] docs/task.md (este arquivo)
- [ ] Prisma migration executada (requer banco de dados)
- [ ] Seed executado (requer banco de dados)
- [ ] Build de produção validado
- [ ] Teste fluxo completo: abertura → CONCLUIDO
- [ ] Senha SUPERADMIN trocada no primeiro login
