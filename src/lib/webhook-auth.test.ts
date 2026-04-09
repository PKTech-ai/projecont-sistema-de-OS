import { describe, it, expect, afterEach, vi } from "vitest";
import { assertWebhookSecret } from "./webhook-auth";

describe("assertWebhookSecret", () => {
  const prev = process.env.WEBHOOK_SECRET;
  const errLog = vi.spyOn(console, "error").mockImplementation(() => {});

  afterEach(() => {
    if (prev === undefined) delete process.env.WEBHOOK_SECRET;
    else process.env.WEBHOOK_SECRET = prev;
    errLog.mockClear();
  });

  it("retorna 500 quando WEBHOOK_SECRET não está definido", () => {
    delete process.env.WEBHOOK_SECRET;
    const req = new Request("http://localhost/webhook", { headers: {} });
    const res = assertWebhookSecret(req);
    expect(res?.status).toBe(500);
  });

  it("retorna 401 quando a chave está errada ou ausente", () => {
    process.env.WEBHOOK_SECRET = "segredo-producao";
    const semHeader = new Request("http://localhost/webhook", { headers: {} });
    expect(assertWebhookSecret(semHeader)?.status).toBe(401);

    const errada = new Request("http://localhost/webhook", {
      headers: { "x-api-key": "outra" },
    });
    expect(assertWebhookSecret(errada)?.status).toBe(401);
  });

  it("retorna null quando autorizado", () => {
    process.env.WEBHOOK_SECRET = "segredo-producao";
    const ok = new Request("http://localhost/webhook", {
      headers: { "x-api-key": "segredo-producao" },
    });
    expect(assertWebhookSecret(ok)).toBeNull();
  });
});
