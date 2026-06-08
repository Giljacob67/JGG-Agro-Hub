import { describe, expect, it } from "vitest";
import { ROUTES, isCrmPath } from "./routes";

describe("routes", () => {
  it("define rotas canônicas /agro", () => {
    expect(ROUTES.commandCenter).toBe("/agro/command-center");
    expect(ROUTES.copilot).toBe("/agro/copilot");
    expect(ROUTES.knowledge).toBe("/agro/knowledge");
    expect(ROUTES.crm.leads).toBe("/agro/crm/leads");
    expect(ROUTES.crm.leadDetail("LD-001")).toBe("/agro/crm/leads/LD-001");
    expect(ROUTES.crm.accountDetail("AC-101")).toBe("/agro/crm/accounts/AC-101");
    expect(ROUTES.crm.opportunityDetail("OP-201")).toBe(
      "/agro/crm/opportunities/OP-201",
    );
    expect(ROUTES.crm.matterDetail("MT-301")).toBe("/agro/crm/matters/MT-301");
  });

  it("detecta paths CRM legados e novos", () => {
    expect(isCrmPath("/agro/crm/leads")).toBe(true);
    expect(isCrmPath("/crm/leads")).toBe(true);
    expect(isCrmPath("/institucional")).toBe(false);
  });
});