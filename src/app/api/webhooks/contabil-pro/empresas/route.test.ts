/**
 * Testes para o webhook de empresas do Contábil Pro.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    empresa: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      updateMany: vi.fn(),
    },
    usuario: {
      findUnique: vi.fn(),
    },
    vinculoEmpresa: {
      upsert: vi.fn(),
    },
  },
}));

import { POST } from "./route";
import { prisma } from "@/lib/prisma";

const WEBHOOK_SECRET = "test-secret";

function makeRequest(body: unknown, secret = WEBHOOK_SECRET) {
  return new Request("http://localhost/api/webhooks/contabil-pro/empresas", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": secret },
    body: JSON.stringify(body),
  });
}

const mockEmpresa = { id: "emp-1", nome: "Empresa Teste", cnpj: "12345678000100" };

beforeEach(() => {
  process.env.WEBHOOK_SECRET = WEBHOOK_SECRET;
  vi.mocked(prisma.empresa.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.empresa.upsert).mockResolvedValue(mockEmpresa as any);
  vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.vinculoEmpresa.upsert).mockResolvedValue({} as any);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── empresa.upsert ─────────────────────────────────────────────────────────

describe("empresa.upsert", () => {
  it("cria empresa com CNPJ válido", async () => {
    const req = makeRequest({
      event: "empresa.upsert",
      data: { id: "emp-1", cnpj: "12345678000100", nome: "Empresa Teste" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(prisma.empresa.upsert).toHaveBeenCalledOnce();
  });

  it("rejeita CNPJ inválido (menos de 14 dígitos)", async () => {
    const req = makeRequest({
      event: "empresa.upsert",
      data: { id: "emp-1", cnpj: "1234", nome: "Empresa" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("salva os IDs de responsáveis do Contábil Pro na empresa", async () => {
    const req = makeRequest({
      event: "empresa.upsert",
      data: {
        id: "emp-1",
        cnpj: "12345678000100",
        nome: "Empresa",
        fiscalResponsavelId: "user-fiscal",
        rhResponsavelId: "user-rh",
      },
    });
    await POST(req as any);
    const upsertCall = vi.mocked(prisma.empresa.upsert).mock.calls[0][0];
    expect(upsertCall.create).toMatchObject({
      fiscalContabilId: "user-fiscal",
      rhContabilId: "user-rh",
    });
  });

  it("cria vínculo quando responsável existe no OS", async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id: "user-fiscal" } as any);
    const req = makeRequest({
      event: "empresa.upsert",
      data: {
        id: "emp-1",
        cnpj: "12345678000100",
        nome: "Empresa",
        fiscalResponsavelId: "user-fiscal",
      },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(prisma.vinculoEmpresa.upsert).toHaveBeenCalledOnce();
    const body = await res.json();
    expect(body.vinculosPendentes).toBe(0);
  });

  it("não cria vínculo e reporta pendente quando responsável não existe", async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null);
    const req = makeRequest({
      event: "empresa.upsert",
      data: {
        id: "emp-1",
        cnpj: "12345678000100",
        nome: "Empresa",
        fiscalResponsavelId: "user-inexistente",
      },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(prisma.vinculoEmpresa.upsert).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.vinculosPendentes).toBe(1);
  });
});

// ── empresa.deleted ────────────────────────────────────────────────────────

describe("empresa.deleted", () => {
  it("desativa a empresa (soft-delete)", async () => {
    vi.mocked(prisma.empresa.updateMany).mockResolvedValue({ count: 1 } as any);
    const req = makeRequest({ event: "empresa.deleted", data: { id: "emp-1" } });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(prisma.empresa.updateMany).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: expect.objectContaining({ ativo: false }),
    });
  });
});

// ── Autenticação ───────────────────────────────────────────────────────────

describe("autenticação", () => {
  it("rejeita com chave errada", async () => {
    const req = makeRequest(
      { event: "empresa.upsert", data: { id: "e1", cnpj: "12345678000100", nome: "X" } },
      "errada"
    );
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });
});
