# ADR-002 — Server Actions em vez de tRPC

**Data:** 2026-03-23
**Status:** Aceito

## Contexto

O briefing técnico original mencionava `src/app/api/trpc/[trpc]/route.ts` como opção. Foi necessário decidir entre tRPC e Server Actions do Next.js 14.

## Decisão

Usar **Server Actions do Next.js 14** como camada de mutação/consulta.

## Justificativa

1. **Alinhamento com App Router**: Server Actions são a solução nativa do Next.js 14 para formulários e mutações — sem setup adicional
2. **Menos camadas**: tRPC exige configuração de routers, procedures, providers no cliente e tipos exportados — Server Actions funcionam com uma função `async` marcada com `"use server"`
3. **Type-safety nativa**: TypeScript inferência direta entre action e componente cliente, sem schema de rotas intermediário
4. **Sem endpoint exposto**: Server Actions não criam endpoints HTTP públicos (exceto o endpoint interno do Next.js), reduzindo superfície de ataque

## Consequências

- A pasta `src/app/api/trpc/` **não existe** neste projeto — o Cursor não deve criá-la
- Toda lógica de mutação fica em `src/server/actions/`
- Toda lógica de consulta fica em `src/server/queries/`
- O único endpoint HTTP exposto é `src/app/api/jobs/auto-fechar/route.ts` (para o cron) e `src/app/api/auth/[...nextauth]/route.ts`
