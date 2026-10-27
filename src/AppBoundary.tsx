import { Component, type ReactNode } from "react";
import { asset } from "./config";
export default class AppBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="recovery-screen">
        <img src={asset("logo")} alt="Viva!" width="280" height="160" />
        <h1>Vamos retomar seu cantinho?</h1>
        <p>Suas histórias continuam aqui.</p>
        <button className="primary" onClick={() => location.reload()}>
          Reabrir o Viva!
        </button>
      </main>
    );
  }
}
