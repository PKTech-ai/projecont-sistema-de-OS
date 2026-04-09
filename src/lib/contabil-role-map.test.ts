import { describe, it, expect, vi, afterEach } from "vitest";
import { mapContabilRoleToOs } from "./contabil-role-map";

describe("mapContabilRoleToOs", () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

  afterEach(() => {
    warn.mockClear();
  });

  it("mapeia roles conhecidas do Contábil Pro", () => {
    expect(mapContabilRoleToOs("MASTER")).toBe("GESTOR");
    expect(mapContabilRoleToOs("DIRETOR")).toBe("GESTOR");
    expect(mapContabilRoleToOs("ANALISTA")).toBe("ANALISTA");
    expect(mapContabilRoleToOs("SAC")).toBe("SAC");
    expect(mapContabilRoleToOs("TV")).toBe("TV");
    expect(mapContabilRoleToOs("SUPERADMIN")).toBe("SUPERADMIN");
  });

  it("ignora espaços e caixa", () => {
    expect(mapContabilRoleToOs("  gestor  ")).toBe("GESTOR");
  });

  it("usa fallback ANALISTA e avisa para role desconhecida", () => {
    expect(mapContabilRoleToOs("DESCONHECIDO")).toBe("ANALISTA");
    expect(warn).toHaveBeenCalled();
  });

  it("trata null/undefined", () => {
    expect(mapContabilRoleToOs(null)).toBe("ANALISTA");
    expect(mapContabilRoleToOs(undefined)).toBe("ANALISTA");
  });
});
