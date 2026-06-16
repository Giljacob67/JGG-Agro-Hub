import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-4">
            <div className="text-4xl">!</div>
            <h2 className="text-lg font-semibold">Algo deu errado</h2>
            <p className="text-sm text-muted-foreground">
              Ocorreu um erro inesperado. Tente recarregar a pagina.
            </p>
            <p className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded">
              {this.state.error?.message}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
            >
              Recarregar pagina
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
