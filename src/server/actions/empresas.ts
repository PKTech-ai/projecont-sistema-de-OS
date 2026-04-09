"use server";

import { getDashboardSession } from "@/lib/contabil-session";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/types";
import type { TipoSetor } from "@prisma/client";
import { normalizarCnpj } from "@/lib/cnpj";

const TIPOS_SERVICO: TipoSetor[] = ["CONTABIL", "FISCAL", "DP", "IA", "CLIENTES", "SOCIETARIO"];

const empresaCreateSchema = z.object({
  nome: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
  cnpj: z.string().optional().nullable(),
  razaoSocial: z.string().optional().nullable(),
  nomeFantasia: z.string().optional().nullable(),
  emailContato: z
    .string()
    .optional()
    .nullable()
    .refine((v) => !v?.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()), "E-mail de contato inválido"),
  telefone: z.string().optional().nullable(),
  cep: z.string().optional().nullable(),
  logradouro: z.string().optional().nullable(),
  numero: z.string().optional().nullable(),
  complemento: z.string().optional().nullable(),
  bairro: z.string().optional().nullable(),
  cidade: z.string().optional().nullable(),
  uf: z.string().max(2).optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

const empresaUpdateSchema = empresaCreateSchema.partial().extend({
  id: z.string(),
});

const vinculoSchema = z.object({
  empresaId: z.string(),
  tipoServico: z.string(),
  responsavelId: z.string(),
});

function pick(row: Record<string, string>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function splitCsvLine(line: string): string[] {
  const sep = line.includes(";") ? ";" : ",";
  return line.split(sep).map((c) => c.replace(/^"|"$/g, "").trim());
}

function parseCsvRecords(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };
  const rawHeaders = splitCsvLine(lines[0]!);
  const headers = rawHeaders.map((h) =>
    h
      .trim()
      .replace(/^\ufeff/, "")
      .toLowerCase()
      .replace(/\s+/g, "_")
  );
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = cells[j] ?? "";
    });
    rows.push(row);
  }
  return { headers, rows };
}

export async function criarEmpresa(
  input: z.infer<typeof empresaCreateSchema>
): Promise<ActionResult<{ id: string }>> {
  const session = await getDashboardSession();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "GESTOR") {
    return { error: "Não autorizado" };
  }

  const parsed = empresaCreateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const cnpjNorm = normalizarCnpj(parsed.data.cnpj ?? undefined);
  if (cnpjNorm) {
    const dupe = await prisma.empresa.findUnique({ where: { cnpj: cnpjNorm } });
    if (dupe) return { error: "Já existe uma empresa com este CNPJ" };
  }

  const nomeCheck = await prisma.empresa.findFirst({
    where: { nome: { equals: parsed.data.nome.trim(), mode: "insensitive" } },
  });
  if (nomeCheck) return { error: "Já existe uma empresa com este nome" };

  const empresa = await prisma.empresa.create({
    data: {
      nome: parsed.data.nome.trim(),
      cnpj: cnpjNorm,
      razaoSocial: parsed.data.razaoSocial?.trim() || null,
      nomeFantasia: parsed.data.nomeFantasia?.trim() || null,
      emailContato: parsed.data.emailContato?.trim() || null,
      telefone: parsed.data.telefone?.trim() || null,
      cep: parsed.data.cep?.replace(/\D/g, "") || null,
      logradouro: parsed.data.logradouro?.trim() || null,
      numero: parsed.data.numero?.trim() || null,
      complemento: parsed.data.complemento?.trim() || null,
      bairro: parsed.data.bairro?.trim() || null,
      cidade: parsed.data.cidade?.trim() || null,
      uf: parsed.data.uf?.trim().toUpperCase() || null,
      observacoes: parsed.data.observacoes?.trim() || null,
    },
  });
  revalidatePath("/admin/empresas");
  return { success: true, data: { id: empresa.id } };
}

export async function atualizarDadosEmpresa(
  input: z.infer<typeof empresaUpdateSchema>
): Promise<ActionResult> {
  const session = await getDashboardSession();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role !== "SUPERADMIN") {
    return { error: "Apenas o administrador pode editar o cadastro completo da empresa" };
  }

  const parsed = empresaUpdateSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const { id, ...rest } = parsed.data;
  const cnpjNorm = rest.cnpj !== undefined ? normalizarCnpj(rest.cnpj) : undefined;
  if (cnpjNorm) {
    const dupe = await prisma.empresa.findFirst({
      where: { cnpj: cnpjNorm, NOT: { id } },
    });
    if (dupe) return { error: "Já existe outra empresa com este CNPJ" };
  }

  const data: Record<string, unknown> = {};
  if (rest.nome !== undefined) data.nome = rest.nome.trim();
  if (rest.cnpj !== undefined) data.cnpj = cnpjNorm;
  if (rest.razaoSocial !== undefined) data.razaoSocial = rest.razaoSocial?.trim() || null;
  if (rest.nomeFantasia !== undefined) data.nomeFantasia = rest.nomeFantasia?.trim() || null;
  if (rest.emailContato !== undefined) data.emailContato = rest.emailContato?.trim() || null;
  if (rest.telefone !== undefined) data.telefone = rest.telefone?.trim() || null;
  if (rest.cep !== undefined) data.cep = rest.cep?.replace(/\D/g, "") || null;
  if (rest.logradouro !== undefined) data.logradouro = rest.logradouro?.trim() || null;
  if (rest.numero !== undefined) data.numero = rest.numero?.trim() || null;
  if (rest.complemento !== undefined) data.complemento = rest.complemento?.trim() || null;
  if (rest.bairro !== undefined) data.bairro = rest.bairro?.trim() || null;
  if (rest.cidade !== undefined) data.cidade = rest.cidade?.trim() || null;
  if (rest.uf !== undefined) data.uf = rest.uf?.trim().toUpperCase() || null;
  if (rest.observacoes !== undefined) data.observacoes = rest.observacoes?.trim() || null;

  await prisma.empresa.update({ where: { id }, data });
  revalidatePath("/admin/empresas");
  return { success: true };
}

export async function ativarDesativarEmpresa(
  id: string,
  ativo: boolean
): Promise<ActionResult> {
  const session = await getDashboardSession();
  if (!session) return { error: "Não autorizado" };

  const empresa = await prisma.empresa.findUnique({
    where: { id },
    include: { vinculos: true },
  });
  if (!empresa) return { error: "Empresa não encontrada" };

  if (session.user.role === "SUPERADMIN") {
    await prisma.empresa.update({ where: { id }, data: { ativo } });
    revalidatePath("/admin/empresas");
    return { success: true };
  }

  if (session.user.role === "GESTOR") {
    const temVinculoSetor = empresa.vinculos.some(
      (v) => v.tipoServico === session.user.setorTipo
    );
    if (!temVinculoSetor) {
      return {
        error:
          "Só é possível ativar/desativar empresas que já tenham vínculo com o seu setor",
      };
    }
    await prisma.empresa.update({ where: { id }, data: { ativo } });
    revalidatePath("/admin/empresas");
    return { success: true };
  }

  return { error: "Não autorizado" };
}

export async function upsertVinculo(
  input: z.infer<typeof vinculoSchema>
): Promise<ActionResult> {
  const session = await getDashboardSession();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "GESTOR") {
    return { error: "Não autorizado" };
  }

  const parsed = vinculoSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados inválidos" };

  if (session.user.role === "GESTOR") {
    if (parsed.data.tipoServico !== session.user.setorTipo) {
      return { error: "Só pode gerenciar vínculos do seu setor" };
    }
    const resp = await prisma.usuario.findUnique({
      where: { id: parsed.data.responsavelId },
      include: { setor: true },
    });
    if (!resp || resp.setorId !== session.user.setorId) {
      return { error: "O responsável deve ser um funcionário do seu setor" };
    }
  }

  await prisma.vinculoEmpresa.upsert({
    where: {
      empresaId_tipoServico: {
        empresaId: parsed.data.empresaId,
        tipoServico: parsed.data.tipoServico,
      },
    },
    update: { responsavelId: parsed.data.responsavelId },
    create: parsed.data,
  });

  revalidatePath("/admin/empresas");
  return { success: true };
}

export async function removerVinculo(
  empresaId: string,
  tipoServico: string
): Promise<ActionResult> {
  const session = await getDashboardSession();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "GESTOR") {
    return { error: "Não autorizado" };
  }

  if (session.user.role === "GESTOR" && tipoServico !== session.user.setorTipo) {
    return { error: "Só pode remover vínculos do seu setor" };
  }

  await prisma.vinculoEmpresa.deleteMany({
    where: { empresaId, tipoServico },
  });

  revalidatePath("/admin/empresas");
  return { success: true };
}

export type ResultadoImportDePara = {
  importados: number;
  ignorados: number;
  erros: string[];
};

/** Importa de/para usuário ↔ empresa (vínculos) a partir de CSV. Colunas aceitas (cabeçalho na 1ª linha):
 * email_responsavel | usuario_email | email
 * tipo_servico | servico | setor  (CONTABIL, FISCAL, DP, IA, CLIENTES, SOCIETARIO)
 * cnpj | empresa_cnpj  (opcional se informar nome)
 * empresa_nome | nome_empresa | razao_social | nome
 */
export async function importarDeParaVinculosCsv(
  csvText: string
): Promise<ActionResult<ResultadoImportDePara>> {
  const session = await getDashboardSession();
  if (!session) return { error: "Não autorizado" };
  if (session.user.role !== "SUPERADMIN" && session.user.role !== "GESTOR") {
    return { error: "Não autorizado" };
  }

  const { rows } = parseCsvRecords(csvText);
  if (rows.length === 0) {
    return { error: "CSV vazio ou sem linhas de dados (inclua cabeçalho na primeira linha)." };
  }

  const erros: string[] = [];
  let importados = 0;
  let ignorados = 0;
  let linhaNum = 1;

  for (const row of rows) {
    linhaNum++;
    const email = pick(row, [
      "email_responsavel",
      "usuario_email",
      "email",
      "responsavel_email",
    ]).toLowerCase();
    let tipoRaw = pick(row, ["tipo_servico", "servico", "setor", "tipo"]).toUpperCase();
    const cnpjRaw = pick(row, ["cnpj", "empresa_cnpj", "cnpj_empresa"]);
    const nomeEmp = pick(row, [
      "empresa_nome",
      "nome_empresa",
      "razao_social",
      "nome",
      "empresa",
    ]);

    if (!email || !tipoRaw) {
      erros.push(`Linha ${linhaNum}: informe e-mail do responsável e tipo de serviço.`);
      ignorados++;
      continue;
    }

    if (session.user.role === "GESTOR" && tipoRaw !== session.user.setorTipo) {
      erros.push(
        `Linha ${linhaNum}: tipo "${tipoRaw}" ignorado — como gestor você só pode importar vínculos do setor ${session.user.setorTipo}.`
      );
      ignorados++;
      continue;
    }

    if (!TIPOS_SERVICO.includes(tipoRaw as TipoSetor)) {
      erros.push(
        `Linha ${linhaNum}: tipo_servico "${tipoRaw}" inválido. Use: ${TIPOS_SERVICO.join(", ")}.`
      );
      ignorados++;
      continue;
    }
    const tipoServico = tipoRaw as TipoSetor;

    const usuario = await prisma.usuario.findUnique({
      where: { email },
    });
    if (!usuario) {
      erros.push(`Linha ${linhaNum}: usuário não encontrado para o e-mail ${email}.`);
      ignorados++;
      continue;
    }

    let empresa = null as Awaited<ReturnType<typeof prisma.empresa.findFirst>>;
    const cnpjNorm = normalizarCnpj(cnpjRaw);
    if (cnpjNorm) {
      empresa = await prisma.empresa.findUnique({ where: { cnpj: cnpjNorm } });
    }
    if (!empresa && nomeEmp) {
      empresa = await prisma.empresa.findFirst({
        where: { nome: { equals: nomeEmp.trim(), mode: "insensitive" } },
      });
    }
    if (!empresa) {
      erros.push(
        `Linha ${linhaNum}: empresa não encontrada${cnpjNorm ? ` (CNPJ ${cnpjNorm})` : nomeEmp ? ` (“${nomeEmp}”)` : ""}. Cadastre a empresa antes ou ajuste o CSV.`
      );
      ignorados++;
      continue;
    }

    if (session.user.role === "GESTOR") {
      if (usuario.setorId !== session.user.setorId) {
        erros.push(
          `Linha ${linhaNum}: o responsável deve pertencer ao seu setor (${email}).`
        );
        ignorados++;
        continue;
      }
    }

    await prisma.vinculoEmpresa.upsert({
      where: {
        empresaId_tipoServico: {
          empresaId: empresa.id,
          tipoServico,
        },
      },
      update: { responsavelId: usuario.id },
      create: {
        empresaId: empresa.id,
        tipoServico,
        responsavelId: usuario.id,
      },
    });
    importados++;
  }

  revalidatePath("/admin/empresas");
  return {
    success: true,
    data: { importados, ignorados, erros },
  };
}
