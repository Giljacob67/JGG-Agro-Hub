import { describe, it, expect } from "vitest";
import { hasPermission, roleCanAccess, getResourcePermissions } from "./auth.js";

describe("hasPermission (RBAC)", () => {
  it("gestao tem acesso total (wildcard) a qualquer recurso/ação", () => {
    expect(hasPermission("gestao", "leads", "delete")).toBe(true);
    expect(hasPermission("gestao", "recurso-arbitrario", "export")).toBe(true);
    expect(hasPermission("gestao", "copilot", "update")).toBe(true);
    expect(hasPermission("gestao", "users", "create")).toBe(true);
  });

  it("comercial tem acesso máximo ao workspace (wildcard)", () => {
    expect(hasPermission("comercial", "leads", "create")).toBe(true);
    expect(hasPermission("comercial", "leads", "delete")).toBe(true);
    // Workspace compartilhado: comercial agora alcança recursos jurídicos.
    expect(hasPermission("comercial", "matters", "delete")).toBe(true);
    expect(hasPermission("comercial", "matters", "read")).toBe(true);
    expect(hasPermission("comercial", "properties", "delete")).toBe(true);
  });

  it("juridico tem acesso máximo ao workspace (wildcard)", () => {
    expect(hasPermission("juridico", "matters", "delete")).toBe(true);
    expect(hasPermission("juridico", "tasks", "update")).toBe(true);
    // Workspace compartilhado: juridico agora alcança recursos comerciais.
    expect(hasPermission("juridico", "leads", "read")).toBe(true);
    expect(hasPermission("juridico", "leads", "create")).toBe(true);
    expect(hasPermission("juridico", "opportunities", "delete")).toBe(true);
  });

  it("Copilot é somente-leitura para comercial e juridico (config é gestao-only)", () => {
    expect(hasPermission("comercial", "copilot", "read")).toBe(true);
    expect(hasPermission("comercial", "copilot", "update")).toBe(false);
    expect(hasPermission("juridico", "copilot", "read")).toBe(true);
    expect(hasPermission("juridico", "copilot", "update")).toBe(false);
  });

  it("gestão de usuários (users) permanece exclusiva de gestao", () => {
    for (const action of ["read", "create", "update", "delete"] as const) {
      expect(hasPermission("comercial", "users", action)).toBe(false);
      expect(hasPermission("juridico", "users", action)).toBe(false);
    }
  });

  it("recurso arbitrário é liberado para papéis com wildcard", () => {
    expect(hasPermission("comercial", "recurso-x", "read")).toBe(true);
    expect(hasPermission("juridico", "recurso-x", "update")).toBe(true);
  });
});

describe("roleCanAccess", () => {
  it("gestao acessa tudo; comercial/juridico acessam o workspace inteiro", () => {
    expect(roleCanAccess("gestao", "qualquer-coisa")).toBe(true);
    expect(roleCanAccess("comercial", "leads")).toBe(true);
    expect(roleCanAccess("comercial", "matters")).toBe(true);
    expect(roleCanAccess("juridico", "matters")).toBe(true);
    expect(roleCanAccess("juridico", "leads")).toBe(true);
  });

  it("users (administração) só é acessível por gestao", () => {
    expect(roleCanAccess("gestao", "users")).toBe(true);
    expect(roleCanAccess("comercial", "users")).toBe(false);
    expect(roleCanAccess("juridico", "users")).toBe(false);
  });
});

describe("getResourcePermissions", () => {
  it("gestao recebe conjunto completo", () => {
    expect(getResourcePermissions("gestao", "leads")).toEqual([
      "read",
      "create",
      "update",
      "delete",
      "export",
    ]);
  });

  it("comercial/juridico recebem conjunto completo via wildcard", () => {
    expect(getResourcePermissions("comercial", "leads")).toContain("export");
    expect(getResourcePermissions("juridico", "matters")).toContain("delete");
    // Recurso arbitrário também herda o wildcard.
    expect(getResourcePermissions("comercial", "recurso-x")).toContain("read");
  });

  it("Copilot fica somente-leitura para comercial/juridico", () => {
    expect(getResourcePermissions("comercial", "copilot")).toEqual(["read"]);
    expect(getResourcePermissions("juridico", "copilot")).toEqual(["read"]);
  });

  it("users (administração) retorna vazio para não-gestao", () => {
    expect(getResourcePermissions("comercial", "users")).toEqual([]);
    expect(getResourcePermissions("juridico", "users")).toEqual([]);
  });
});
