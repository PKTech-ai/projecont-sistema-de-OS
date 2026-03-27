# Escopo Fechado — Sistema de Chamados Internos
## Projecont Consultoria Contábil · v1.0

---

## 1. Módulos Inclusos (In-Scope)

### Módulo A: Autenticação e Autorização
- Login com email + senha (bcrypt)
- Roles: ANALISTA, GESTOR, SUPERADMIN, TV
- Sessão JWT via NextAuth v5
- Sessão TV é read-only — sem acesso a qualquer mutação

### Módulo B: Chamados
- Abertura de chamado com roteamento automático via VinculoEmpresa
- Máquina de estados: ABERTO → EM_ANDAMENTO → AGUARDANDO_VALIDACAO → CONCLUIDO
- Transferência de chamado (GESTOR dentro do setor / SUPERADMIN qualquer setor)
- Cancelamento (GESTOR ou SUPERADMIN, qualquer status)
- Histórico de status completo (HistoricoStatus)
- Comentários por chamado
- Cálculo de SLA por dias úteis (lib/sla.ts)
- Persona de cliente (emNomeDeCliente — apenas GESTOR/SUPERADMIN)

### Módulo C: Projetos (Setor IA)
- CRUD de projetos vinculados ao setor IA
- Acesso: ANALISTA/GESTOR do setor IA e SUPERADMIN
- Chamados do setor IA vinculados a projetos (sem roteamento automático)

### Módulo D: Dashboards
- Dashboard pessoal com KPIs e chamados ativos
- Dashboard de setor
- Notificações in-app com badge de não lidas

### Módulo E: Painel Admin (SUPERADMIN)
- CRUD de usuários (ativar/desativar, alterar role/setor)
- CRUD de empresas e VinculoEmpresa
- CRUD de templates de chamado

### Módulo F: TV Display
- Página fullscreen read-only por setor
- Auto-refresh a cada 30 segundos
- Sem botões, formulários ou links de mutação

### Módulo G: Job de Auto-Fechamento
- Fecha automaticamente chamados em AGUARDANDO_VALIDACAO após 48h úteis
- Endpoint protegido por CRON_SECRET
- Chamado pelo crontab do servidor via curl

---

## 2. O Que Está Fora do Escopo (Out-of-Scope) 🚫

- Integração com ERP ou sistemas externos
- Notificação por WhatsApp ou e-mail externo
- Acesso de clientes externos ao sistema
- App mobile
- Controle de carga de trabalho por analista
- Gestão de demandas internas de um mesmo setor
- tRPC ou qualquer camada de RPC adicional
- Deploy em Vercel ou cloud pública

---

## 3. Critérios de Exceção

Qualquer funcionalidade fora deste escopo requer a abertura de um Change Request formal e aprovação do Sponsor antes de ser implementada. A IA (Cursor) deve recusar pedidos fora deste escopo e acionar o processo de mudança.
