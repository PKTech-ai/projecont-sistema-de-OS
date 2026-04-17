/**
 * Testes para o webhook de usuários do Contábil Pro.
 * Prisma é mockado para isolar a lógica HTTP e de negócio.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    usuario: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    setor: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/contabil-sync-placeholder", () => ({
  getSyncPasswordHash: vi.fn().mockResolvedValue("hashed_placeholder"),
}));

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed_password") },
}));

// ── Importações após mocks ─────────────────────────────────────────────────
import { POST } from "./route";
import { prisma } from "@/lib/prisma";

const WEBHOOK_SECRET = "test-secret";

function makeRequest(body: unknown, secret = WEBHOOK_SECRET) {
  return new Request("http://localhost/api/webhooks/contabil-pro/usuarios", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": secret,
    },
    body: JSON.stringify(body),
  });
}

const mockSetor = { id: "setor-1", tipo: "CONTABIL", nome: "Contábil" };

beforeEach(() => {
  process.env.WEBHOOK_SECRET = WEBHOOK_SECRET;
  vi.mocked(prisma.setor.findFirst).mockResolvedValue(mockSetor as any);
  vi.mocked(prisma.usuario.upsert).mockResolvedValue({ id: "user-1" } as any);
  vi.mocked(prisma.usuario.updateMany).mockResolvedValue({ count: 1 } as any);
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── usuario.upsert ─────────────────────────────────────────────────────────

describe("usuario.upsert", () => {
  it("cria/atualiza usuário com dados válidos", async () => {
    const req = makeRequest({
      event: "usuario.upsert",
      data: { id: "u1", email: "ana@pktech.ai", nome: "Ana Lima", role: "ANALISTA", ativo: true },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(prisma.usuario.upsert).toHaveBeenCalledOnce();
  });

  it("recusa sem email e sem username", async () => {
    const req = makeRequest({
      event: "usuario.upsert",
      data: { id: "u1", nome: "Sem Identificador" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("recusa sem data.id", async () => {
    const req = makeRequest({ event: "usuario.upsert", data: { email: "x@y.com" } });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it("retorna 500 quando setor CONTABIL não existe", async () => {
    vi.mocked(prisma.setor.findFirst).mockResolvedValue(null);
    const req = makeRequest({
      event: "usuario.upsert",
      data: { id: "u1", email: "x@pktech.ai", nome: "X" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(500);
  });
});

// ── usuario.deleted ────────────────────────────────────────────────────────

describe("usuario.deleted", () => {
  it("desativa o usuário (soft-delete)", async () => {
    const req = makeRequest({ event: "usuario.deleted", data: { id: "u1" } });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(prisma.usuario.updateMany).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: expect.objectContaining({ ativo: false }),
    });
  });
});

// ── usuario.password_sync ──────────────────────────────────────────────────

describe("usuario.password_sync", () => {
  it("atualiza senha quando usuário existe", async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue({ id: "u1" } as any);
    vi.mocked(prisma.usuario.update).mockResolvedValue({ id: "u1" } as any);

    const req = makeRequest({
      event: "usuario.password_sync",
      data: { id: "u1", newPassword: "nova_senha_123" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(prisma.usuario.update).toHaveBeenCalledOnce();
  });

  it("retorna 503 quando usuário não existe (força retry no remetente)", async () => {
    vi.mocked(prisma.usuario.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.usuario.findFirst).mockResolvedValue(null);

    const req = makeRequest({
      event: "usuario.password_sync",
      data: { id: "u-inexistente", email: "x@y.com", newPassword: "nova_senha" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(503);
  });

  it("retorna 400 quando newPassword está ausente", async () => {
    const req = makeRequest({
      event: "usuario.password_sync",
      data: { id: "u1" },
    });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});

// ── Autenticação ───────────────────────────────────────────────────────────

describe("autenticação do webhook", () => {
  it("rejeita com chave errada (401)", async () => {
    const req = makeRequest(
      { event: "usuario.upsert", data: { id: "u1", email: "x@y.com", nome: "X" } },
      "chave-errada"
    );
    const res = await POST(req as any);
    expect(res.status).toBe(401);
  });
});
