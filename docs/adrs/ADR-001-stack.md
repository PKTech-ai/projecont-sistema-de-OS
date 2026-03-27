# ADR-001 — Stack Tecnológica

**Data:** 2026-03-23
**Status:** Aceito
**Contexto:** Sistema de chamados internos para contabilidade, deploy self-hosted em rede interna.

## Decisão

- **Next.js 14 App Router** — framework full-stack com Server Components e Server Actions, elimina a necessidade de uma API separada
- **PostgreSQL** — banco relacional maduro, suporta transações, índices compostos e constraints necessárias para as regras de negócio
- **Prisma ORM** — type-safety nativo, migrations versionadas, seed declarativo
- **NextAuth v5 (Auth.js)** — autenticação com JWT, adapter Prisma, suporte a credentials provider
- **Tailwind CSS v4 + shadcn/ui** — sistema de design utilitário com componentes acessíveis e customizáveis
- **bcryptjs** — hash de senhas no servidor

## Consequências

- Deploy self-hosted via `next start` em servidor Linux com Node.js 20+
- Sem dependência de serviços cloud (Vercel, AWS, etc.)
- TypeScript strict em todo o projeto

## Alternativas Descartadas

- **tRPC**: descartado — Server Actions do Next.js 14 atendem o mesmo caso de uso com menos complexidade (ver ADR-002)
- **MySQL**: descartado em favor de PostgreSQL por suporte superior a índices e tipos de dados
- **Prisma Pulse / Accelerate**: fora do escopo (self-hosted)
