// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CrmLoadingState, CrmErrorState } from "./loading-state";

describe("CrmLoadingState", () => {
  it("renderiza rótulo padrão", () => {
    render(<CrmLoadingState />);
    expect(screen.getByText("Carregando dados…")).toBeInTheDocument();
  });

  it("aceita rótulo customizado", () => {
    render(<CrmLoadingState label="Buscando leads…" />);
    expect(screen.getByText("Buscando leads…")).toBeInTheDocument();
  });
});

describe("CrmErrorState", () => {
  it("mostra mensagem padrão e detalhe do erro", () => {
    render(<CrmErrorState error={new Error("timeout do banco")} />);
    expect(
      screen.getByText("Não foi possível carregar os dados. Tente novamente."),
    ).toBeInTheDocument();
    expect(screen.getByText("timeout do banco")).toBeInTheDocument();
  });

  it("omite detalhe quando erro não é Error", () => {
    render(<CrmErrorState error={"x"} label="Falhou" />);
    expect(screen.getByText("Falhou")).toBeInTheDocument();
    expect(screen.queryByText("x")).not.toBeInTheDocument();
  });
});
