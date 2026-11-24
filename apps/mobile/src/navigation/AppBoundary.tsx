import React from 'react';
import AppRecoveryScreen from './AppRecoveryScreen';

export default class AppBoundary extends React.Component<React.PropsWithChildren<{ onRetry: () => void }>, { failed: boolean; attempt: number }> {
  state = { failed: false, attempt: 0 };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <AppRecoveryScreen title="No pudimos abrir esta pantalla" message="Podés volver al inicio. Tus proyectos guardados siguen disponibles." onRetry={() => {
      this.props.onRetry();
      this.setState(previous => ({ failed: false, attempt: previous.attempt + 1 }));
    }} />;
    return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
  }
}
