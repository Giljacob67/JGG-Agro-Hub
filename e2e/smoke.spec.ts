import { test, expect } from "@playwright/test";

const DEV_PASSWORD = "jgg-agro-dev";

test.describe("JGG Agro Hub — smoke", () => {
  test("landing institucional carrega", async ({ page }) => {
    await page.goto("/institucional");
    await expect(
      page.getByRole("heading", {
        name: /Estratégia jurídica para o agronegócio/i,
      }),
    ).toBeVisible();
  });

  test("login redireciona para command center", async ({ page }) => {
    await page.goto("/agro/login");
    await page.getByLabel("Senha").fill(DEV_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/agro\/command-center/);
    await expect(
      page.getByRole("heading", { name: "Mesa de Operações" }),
    ).toBeVisible();
  });

  test("fluxo CRM: criar lead e abrir detalhe", async ({ page }) => {
    await page.goto("/agro/login");
    await page.getByLabel("Senha").fill(DEV_PASSWORD);
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/agro\/command-center/);

    await page.goto("/agro/crm/leads");
    await expect(
      page.getByRole("heading", { name: "Leads Agro" }),
    ).toBeVisible();

    const leadName = `E2E Lead ${Date.now()}`;
    await page.getByRole("button", { name: "Novo lead" }).click();
    await page.getByLabel("Nome / razão social").fill(leadName);
    await page.getByLabel("Região").fill("MT — Sorriso");
    await page.getByRole("button", { name: "Criar lead" }).click();

    await expect(page).toHaveURL(/\/agro\/crm\/leads\//);
    await expect(page.getByRole("heading", { name: leadName })).toBeVisible();
  });
});