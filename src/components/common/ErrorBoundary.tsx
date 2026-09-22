import React, { Component, ErrorInfo, ReactNode } from 'react';
import { NotFoundPage } from '../../pages/NotFoundPage';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Registra silenciosamente no console do desenvolvedor sem expor nenhum dado na UI (OWASP ASVS)
    if (import.meta.env?.DEV) {
      console.warn('[ErrorBoundary] Erro capturado em tempo de execução:', error.message);
    }
  }

  public handleReset = () => {
    this.setState({ hasError: false });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <NotFoundPage
          errorCode="Erro"
          title="Algo deu errado"
          description="Ocorreu uma instabilidade temporária. Seus dados estão seguros. Tente recarregar a página."
          isErrorBoundary={true}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}
