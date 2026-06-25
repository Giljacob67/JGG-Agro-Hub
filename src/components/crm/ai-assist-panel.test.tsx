// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const useAuthMock = vi.fn();
const useAiAssistMock = vi.fn();

vi.mock("@/contexts/use-auth", () => ({
  useAuth: () => useAuthMock(),
}));
vi.mock("@/hooks/use-copilot", () => ({
  useAiAssist: (input: unknown, enabled: boolean) => useAiAssistMock(input, enabled),
}));

import { AiAssistPanel } from "./ai-assist-panel";

function queryResult(over: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
    ...over,
  };
}

describe("AiAssistPanel", () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useAiAssistMock.mockReset();
    useAiAssistMock.mockReturnValue(queryResult());
  });

  it("não renderiza nada sem acesso ao copilot", () => {
    useAuthMock.mockReturnValue({ user: { id: "u1" }, canAccess: () => false });
    const { container } = render(
      <AiAssistPanel task="summarize_matter" entityType="matter" entityId="m1" heading="Resumo IA" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("auto-run habilita a query quando permitido", () => {
    useAuthMock.mockReturnValue({ user: { id: "u1" }, canAccess: () => true });
    render(
      <AiAssistPanel task="summarize_matter" entityType="matter" entityId="m1" heading="Resumo IA" />,
    );
    expect(screen.getByText("Resumo IA")).toBeInTheDocument();
    // segundo argumento (enabled) deve ser true em auto-run com entityId
    expect(useAiAssistMock).toHaveBeenCalledWith(
      { task: "summarize_matter", entityType: "matter", entityId: "m1" },
      true,
    );
  });

  it("painel manual (autoRun=false) mantém query desabilitada", () => {
    useAuthMock.mockReturnValue({ user: { id: "u1" }, canAccess: () => true });
    render(
      <AiAssistPanel
        task="next_steps"
        entityType="opportunity"
        entityId="o1"
        heading="Próximos passos"
        autoRun={false}
      />,
    );
    expect(useAiAssistMock).toHaveBeenCalledWith(
      { task: "next_steps", entityType: "opportunity", entityId: "o1" },
      false,
    );
  });

  it("renderiza resultado da IA", () => {
    useAuthMock.mockReturnValue({ user: { id: "u1" }, canAccess: () => true });
    useAiAssistMock.mockReturnValue(
      queryResult({
        data: {
          title: "Síntese",
          content: "Demanda em fase inicial.",
          bullets: ["Confirmar prazo"],
          simulated: false,
          disclaimer: "Conteúdo informativo.",
        },
      }),
    );
    render(
      <AiAssistPanel task="summarize_matter" entityType="matter" entityId="m1" heading="Resumo IA" />,
    );
    expect(screen.getByText("Síntese")).toBeInTheDocument();
    expect(screen.getByText("Demanda em fase inicial.")).toBeInTheDocument();
    expect(screen.getByText("Confirmar prazo")).toBeInTheDocument();
  });
});
