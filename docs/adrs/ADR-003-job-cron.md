# ADR-003 — Arquitetura do Job de Auto-Fechamento

**Data:** 2026-03-23
**Status:** Aceito

## Contexto

O sistema precisa fechar automaticamente chamados em `AGUARDANDO_VALIDACAO` após 48 horas úteis sem validação pelo solicitante. O deploy é self-hosted em servidor Linux.

## Decisão

Arquitetura de dois componentes:

1. **`src/jobs/autoFechar.ts`** — Função `executarAutoFechamento()` com toda a lógica de negócio (consulta, transição de status, notificações), isolada e testável independentemente
2. **`src/app/api/jobs/auto-fechar/route.ts`** — Endpoint HTTP `POST` que importa e executa a função acima, protegido por header `Authorization: Bearer $CRON_SECRET`

O **crontab do servidor** faz a chamada HTTP:
```bash
# /etc/crontab ou crontab do usuário node
0 * * * * curl -s -X POST http://localhost:3000/api/jobs/auto-fechar \
  -H "Authorization: Bearer SEU_CRON_SECRET" \
  >> /var/log/chamados-job.log 2>&1
```

## Justificativa

- **Mantém um único processo rodando**: o servidor Next.js já está em execução — não é necessário um processo Node.js separado para o job
- **Lógica isolada e testável**: a função `executarAutoFechamento()` pode ser testada unitariamente sem subir o servidor HTTP
- **Segurança**: requisições sem o `CRON_SECRET` correto retornam 401
- **Observabilidade**: o log da execução (quantidade processada, erros) vai para o arquivo de log

## Alternativas Descartadas

- **node-cron dentro do processo Next.js**: descartado — o App Router não garante que o processo do servidor Next.js rode continuamente sem restart; crontab do SO é mais confiável
- **Script ts-node isolado**: descartado — exige processo adicional e configuração de environment separada
