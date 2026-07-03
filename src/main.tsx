import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { CopilotChatWidget } from "@/components/copilot/copilot-chat-widget";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // Ferramenta interna de uso contínuo — refetch a cada troca de aba do
      // navegador gera requests redundantes sem ganho perceptível (dado já
      // fresco por staleTime). Refetch on mount/reconnect seguem ativos.
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <App />
            {/* Renderizado fora das rotas para sobreviver à troca de aba/rota —
                o painel do Copilot e a conversa não remontam ao navegar. */}
            <CopilotChatWidget />
            <Toaster position="top-right" richColors closeButton />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);