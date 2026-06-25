import { describe, it, expect } from "vitest";
import { hasPermission, roleCanAccess, getResourcePermissions } from "./auth.js";

describe("hasPermission (RBAC)", () => {
  it("gestao tem acesso total (wildcard) a qualquer recurso/ação", () => {
    expect(hasPermission("gestao", "leads", "delete")).toBe(true);
    expect(hasPermission("gestao", "recurso-arbitrario", "export")).toBe(true);
    expect(hasPermission("gestao", "copilot", "update")).toBe(true);
  });

  it("comercial pode escrever leads mas não excluir matters", () => {
    expect(hasPermission("comercial", "leads", "create")).toBe(true);
    expect(hasPermission("comercial", "leads", "delete")).toBe(true);
    expect(hasPermission("comercial", "matters", "delete")).toBe(false);
    expect(hasPermission("comercial", "matters", "read")).toBe(false);
  });

  it("comercial tem copilot só leitura (não update)", () => {
    expect(hasPermission("comercial", "copilot", "read")).toBe(true);
    expect(hasPermission("comercial", "copilot", "update")).toBe(false);
  });

  it("juridico controla matters/tasks/deadlines mas não leads", () => {
    expect(hasPermission("juridico", "matters", "delete")).toBe(true);
    expect(hasPermission("juridico", "tasks", "update")).toBe(true);
    expect(hasPermission("juridico", "leads", "read")).toBe(false);
    expect(hasPermission("juridico", "leads", "create")).toBe(false);
  });

  it("properties: comercial cria/atualiza mas não exclui", () => {
    expect(hasPermission("comercial", "properties", "create")).toBe(true);
    expect(hasPermission("comercial", "properties", "delete")).toBe(false);
  });

  it("recurso desconhecido nega para papéis não-gestao", () => {
    expect(hasPermission("comercial", "recurso-x", "read")).toBe(false);
    expect(hasPermission("juridico", "recurso-x", "read")).toBe(false);
  });
});

describe("roleCanAccess", () => {
  it("gestao acessa tudo; demais só recursos mapeados", () => {
    expect(roleCanAccess("gestao", "qualquer-coisa")).toBe(true);
    expect(roleCanAccess("comercial", "leads")).toBe(true);
    expect(roleCanAccess("comercial", "matters")).toBe(false);
    expect(roleCanAccess("juridico", "matters")).toBe(true);
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

  it("comercial em leads não inclui export", () => {
    const perms = getResourcePermissions("comercial", "leads");
    expect(perms).toContain("create");
    expect(perms).not.toContain("export");
  });

  it("recurso não mapeado retorna vazio para não-gestao", () => {
    expect(getResourcePermissions("comercial", "recurso-x")).toEqual([]);
  });
});
