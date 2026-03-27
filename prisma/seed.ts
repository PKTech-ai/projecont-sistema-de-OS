import { loadEnvConfig } from "@next/env";
import path from "path";

loadEnvConfig(path.resolve(__dirname, ".."));

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d;
}
function daysFromNow(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return d;
}

async function main() {
  console.log("🌱 Limpando banco e reiniciando seed...");

  // ── Limpar na ordem correta (FK)
  await prisma.logPersona.deleteMany();
  await prisma.notificacao.deleteMany();
  await prisma.historicoStatus.deleteMany();
  await prisma.comentario.deleteMany();
  await prisma.chamado.deleteMany();
  await prisma.vinculoEmpresa.deleteMany();
  await prisma.projeto.deleteMany();
  await prisma.empresa.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.setor.deleteMany();
  console.log("✅ Banco limpo");

  // ── 1. SETORES (fixos — 5 exigidos pelo sistema)
  const setoresDef = [
    { nome: "Contábil",              tipo: "CONTABIL" as const },
    { nome: "Fiscal",                tipo: "FISCAL"   as const },
    { nome: "Departamento Pessoal",  tipo: "DP"       as const },
    { nome: "IA",                    tipo: "IA"       as const },
    { nome: "Clientes",              tipo: "CLIENTES" as const },
  ];
  for (const s of setoresDef) await prisma.setor.create({ data: s });
  const setores = await prisma.setor.findMany();
  const S = Object.fromEntries(setores.map((s) => [s.tipo, s]));
  console.log("✅ 5 setores criados");

  // ── 2. USUÁRIOS (admin + 5 — um por setor)
  const hash = (p: string) => bcrypt.hash(p, 10);
  const senha = await hash("projecont@2026");

  await prisma.usuario.createMany({
    data: [
      { nome: "Administrador",   email: "admin@projecont.com.br",        senha: await hash("admin123"),     role: "SUPERADMIN", setorId: S["IA"].id       },
      { nome: "Fernanda Rocha",  email: "gestor.contabil@projecont.com.br", senha, role: "GESTOR",    setorId: S["CONTABIL"].id },
      { nome: "Ana Santos",      email: "ana.santos@projecont.com.br",    senha, role: "ANALISTA",   setorId: S["CONTABIL"].id },
      { nome: "Pedro Alves",     email: "pedro.alves@projecont.com.br",   senha, role: "ANALISTA",   setorId: S["FISCAL"].id   },
      { nome: "Lúcia Ferreira",  email: "lucia.ferreira@projecont.com.br",senha, role: "GESTOR",     setorId: S["DP"].id       },
      { nome: "Thiago Souza",    email: "thiago.souza@projecont.com.br",  senha, role: "ANALISTA",   setorId: S["IA"].id       },
      { nome: "Painel TV",       email: "tv@projecont.com.br",            senha, role: "TV",         setorId: S["CONTABIL"].id },
    ],
  });
  const usuarios = await prisma.usuario.findMany();
  const U = Object.fromEntries(usuarios.map((u) => [u.email, u]));
  console.log("✅ 6 usuários criados (admin + 5)");

  // ── 3. EMPRESAS (5)
  const empresasNomes = [
    "Alpha Distribuidora Ltda",
    "Beta Consultores S.A.",
    "Gamma Indústria e Comércio",
    "Delta Serviços ME",
    "Epsilon Tecnologia",
  ];
  await prisma.empresa.createMany({ data: empresasNomes.map((nome) => ({ nome })) });
  const empresas = await prisma.empresa.findMany({ orderBy: { nome: "asc" } });
  const E = Object.fromEntries(empresas.map((e) => [e.nome, e]));
  console.log("✅ 5 empresas criadas");

  // ── 4. VÍNCULOS (empresa × setor → responsável)
  // Uma empresa pode ter MÚLTIPLOS vínculos, um por tipo de serviço
  await prisma.vinculoEmpresa.createMany({
    data: [
      // Alpha: contábil + fiscal + DP
      { empresaId: E["Alpha Distribuidora Ltda"].id, tipoServico: "CONTABIL", responsavelId: U["ana.santos@projecont.com.br"].id      },
      { empresaId: E["Alpha Distribuidora Ltda"].id, tipoServico: "FISCAL",   responsavelId: U["pedro.alves@projecont.com.br"].id     },
      { empresaId: E["Alpha Distribuidora Ltda"].id, tipoServico: "DP",       responsavelId: U["lucia.ferreira@projecont.com.br"].id  },
      // Beta: contábil + fiscal
      { empresaId: E["Beta Consultores S.A."].id,    tipoServico: "CONTABIL", responsavelId: U["ana.santos@projecont.com.br"].id      },
      { empresaId: E["Beta Consultores S.A."].id,    tipoServico: "FISCAL",   responsavelId: U["pedro.alves@projecont.com.br"].id     },
      // Gamma: apenas fiscal
      { empresaId: E["Gamma Indústria e Comércio"].id, tipoServico: "FISCAL", responsavelId: U["pedro.alves@projecont.com.br"].id     },
      // Delta: DP + contábil
      { empresaId: E["Delta Serviços ME"].id,         tipoServico: "DP",      responsavelId: U["lucia.ferreira@projecont.com.br"].id  },
      { empresaId: E["Delta Serviços ME"].id,         tipoServico: "CONTABIL",responsavelId: U["ana.santos@projecont.com.br"].id      },
      // Epsilon: apenas fiscal
      { empresaId: E["Epsilon Tecnologia"].id,        tipoServico: "FISCAL",  responsavelId: U["pedro.alves@projecont.com.br"].id     },
    ],
  });
  console.log("✅ 9 vínculos criados (múltiplos por empresa)");

  // ── 5. PROJETOS IA (3 — suficiente para demonstração)
  await prisma.projeto.createMany({
    data: [
      { nome: "Automação Financeira Alpha",  descricao: "Conciliação bancária automática via ML.",         setorId: S["IA"].id },
      { nome: "Chatbot Atendimento Beta",    descricao: "Chatbot LLM para triagem de atendimentos.",       setorId: S["IA"].id },
      { nome: "Dashboard BI Epsilon",        descricao: "Pipeline ETL + dashboards em tempo real.",        setorId: S["IA"].id },
    ],
  });
  const projetos = await prisma.projeto.findMany();
  const P = Object.fromEntries(projetos.map((p) => [p.nome, p]));
  console.log("✅ 3 projetos IA criados");

  // ── 6. CHAMADOS (5 — status variados)
  const admin = U["admin@projecont.com.br"];
  const fernanda = U["gestor.contabil@projecont.com.br"];
  const ana = U["ana.santos@projecont.com.br"];
  const pedro = U["pedro.alves@projecont.com.br"];
  const thiago = U["thiago.souza@projecont.com.br"];

  const [c1, c2, c3, c4, c5] = await Promise.all([
    // 1 — ABERTO, sem responsável (DP)
    prisma.chamado.create({ data: {
      titulo: "Certificado Digital Expirado — Delta Serviços",
      descricao: "O certificado A1 da Delta venceu ontem. Necessário emitir novo urgente pois NFs precisam ser emitidas.",
      status: "ABERTO", prioridade: "CRITICA",
      tipo: "INCIDENTE", urgencia: "MUITO_ALTA", impacto: "ALTO",
      prazoSla: daysFromNow(1), criadoEm: daysAgo(1),
      solicitanteId: fernanda.id,
      empresaId: E["Delta Serviços ME"].id,
      setorDestinoId: S["CONTABIL"].id,
    }}),
    // 2 — EM_ANDAMENTO (FISCAL)
    prisma.chamado.create({ data: {
      titulo: "Parcelamento PGFN — Gamma Indústria",
      descricao: "Débito de R$ 85.000 na PGFN referente a IRPJ/2022. Analisar modalidades PERT e preparar documentação.",
      status: "EM_ANDAMENTO", prioridade: "ALTA",
      tipo: "SOLICITACAO", urgencia: "ALTA", impacto: "ALTO",
      prazoSla: daysFromNow(3), criadoEm: daysAgo(4),
      solicitanteId: admin.id,
      responsavelId: pedro.id,
      empresaId: E["Gamma Indústria e Comércio"].id,
      setorDestinoId: S["FISCAL"].id,
    }}),
    // 3 — AGUARDANDO_VALIDACAO (CONTABIL)
    prisma.chamado.create({ data: {
      titulo: "Alteração de Sócio — Beta Consultores",
      descricao: "Saída do sócio João Ferreira e entrada de Marcos Paulo. Documentação enviada por e-mail.",
      status: "AGUARDANDO_VALIDACAO", prioridade: "MEDIA",
      tipo: "SOLICITACAO", urgencia: "MEDIA", impacto: "MEDIO",
      prazoSla: daysFromNow(5), criadoEm: daysAgo(6),
      entregueEm: daysAgo(1),
      solucao: "Alteração processada no sistema. Contrato social atualizado e enviado para a Junta Comercial. Prazo estimado para registro: 10 dias úteis.",
      solicitanteId: fernanda.id,
      responsavelId: ana.id,
      empresaId: E["Beta Consultores S.A."].id,
      setorDestinoId: S["CONTABIL"].id,
    }}),
    // 4 — CONCLUIDO (IA)
    prisma.chamado.create({ data: {
      titulo: "Deploy Modelo v2.1 — Automação Financeira Alpha",
      descricao: "Deploy da versão 2.1 em produção com rollback automático configurado para taxa de erro > 2% nas primeiras 24h.",
      status: "CONCLUIDO", prioridade: "ALTA",
      tipo: "SOLICITACAO", urgencia: "ALTA", impacto: "ALTO",
      prazoSla: daysAgo(1), criadoEm: daysAgo(14), concluidoEm: daysAgo(2),
      solucao: "Deploy realizado com sucesso. Taxa de erro: 0,3% nas primeiras 24h (abaixo do threshold de 2%). Monitoramento encerrado.",
      solicitanteId: admin.id,
      responsavelId: thiago.id,
      projetoId: P["Automação Financeira Alpha"].id,
      setorDestinoId: S["IA"].id,
    }}),
    // 5 — CANCELADO (DP)
    prisma.chamado.create({ data: {
      titulo: "Admissão de Funcionário — Epsilon Tecnologia",
      descricao: "Admissão de colaborador cancelada — vaga suspensa por decisão da diretoria.",
      status: "CANCELADO", prioridade: "BAIXA",
      tipo: "SOLICITACAO", urgencia: "BAIXA", impacto: "BAIXO",
      prazoSla: daysAgo(5), criadoEm: daysAgo(10),
      solicitanteId: fernanda.id,
      empresaId: E["Epsilon Tecnologia"].id,
      setorDestinoId: S["DP"].id,
    }}),
  ]);
  console.log("✅ 5 chamados criados");

  // ── 7. COMENTÁRIOS (5)
  await prisma.comentario.createMany({
    data: [
      { chamadoId: c1.id, autorId: fernanda.id, conteudo: "Urgente — cliente aguardando. Por favor priorizar.",             criadoEm: daysAgo(1) },
      { chamadoId: c2.id, autorId: pedro.id,    conteudo: "Consultei o REGULARIZE. PERT com 48x reduz 50% da multa. Preparando simulação.", criadoEm: daysAgo(3) },
      { chamadoId: c2.id, autorId: admin.id,    conteudo: "Aprovado. Prossiga com PERT e envie a simulação para validação.", criadoEm: daysAgo(2) },
      { chamadoId: c3.id, autorId: ana.id,      conteudo: "Documentação analisada. Enviado para validação do solicitante.", criadoEm: daysAgo(1) },
      { chamadoId: c4.id, autorId: thiago.id,   conteudo: "Deploy concluído. Monitoramento ativo — erro < 0,3% nas primeiras 24h. ✅", criadoEm: daysAgo(2) },
    ],
  });
  console.log("✅ 5 comentários criados");

  // ── 9. HISTÓRICO DE STATUS (5)
  await prisma.historicoStatus.createMany({
    data: [
      { chamadoId: c1.id, statusAntes: "ABERTO",              statusDepois: "ABERTO",              atorId: fernanda.id, criadoEm: daysAgo(1)  },
      { chamadoId: c2.id, statusAntes: "ABERTO",              statusDepois: "EM_ANDAMENTO",         atorId: pedro.id,    criadoEm: daysAgo(4)  },
      { chamadoId: c3.id, statusAntes: "EM_ANDAMENTO",        statusDepois: "AGUARDANDO_VALIDACAO", atorId: ana.id,      criadoEm: daysAgo(1)  },
      { chamadoId: c4.id, statusAntes: "AGUARDANDO_VALIDACAO",statusDepois: "CONCLUIDO",            atorId: admin.id,    criadoEm: daysAgo(2)  },
      { chamadoId: c5.id, statusAntes: "ABERTO",              statusDepois: "CANCELADO",            atorId: admin.id,    justificativa: "Vaga suspensa por decisão da diretoria.", criadoEm: daysAgo(5) },
    ],
  });
  console.log("✅ 5 históricos criados");

  // ── 10. NOTIFICAÇÕES (5)
  await prisma.notificacao.createMany({
    data: [
      { usuarioId: fernanda.id, chamadoId: c2.id, tipo: "NOVO_CHAMADO",        lida: false, criadoEm: daysAgo(4) },
      { usuarioId: pedro.id,    chamadoId: c2.id, tipo: "CHAMADO_ATRIBUIDO",   lida: true,  criadoEm: daysAgo(4) },
      { usuarioId: ana.id,      chamadoId: c3.id, tipo: "CHAMADO_ATRIBUIDO",   lida: false, criadoEm: daysAgo(6) },
      { usuarioId: fernanda.id, chamadoId: c3.id, tipo: "AGUARDANDO_VALIDACAO",lida: false, criadoEm: daysAgo(1) },
      { usuarioId: admin.id,    chamadoId: c4.id, tipo: "CHAMADO_CONCLUIDO",   lida: true,  criadoEm: daysAgo(2) },
    ],
  });
  console.log("✅ 5 notificações criadas");

  // ── Resumo
  console.log("");
  console.log("═══════════════════════════════════════════════════════");
  console.log("✅ Seed completo!");
  console.log("");
  console.log("📧 Logins:");
  console.log("   SUPERADMIN : admin@projecont.com.br     → senha: admin123");
  console.log("   GESTOR CT  : gestor.contabil@projecont.com.br → projecont@2026");
  console.log("   ANALISTA CT: ana.santos@projecont.com.br      → projecont@2026");
  console.log("   ANALISTA FS: pedro.alves@projecont.com.br     → projecont@2026");
  console.log("   GESTOR DP  : lucia.ferreira@projecont.com.br  → projecont@2026");
  console.log("   ANALISTA IA: thiago.souza@projecont.com.br    → projecont@2026");
  console.log("   PAINEL TV  : tv@projecont.com.br              → projecont@2026");
  console.log("═══════════════════════════════════════════════════════");
}

main()
  .catch((e) => { console.error("❌ Erro:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
