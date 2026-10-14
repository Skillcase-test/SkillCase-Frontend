import { Component } from "react";
import AppErrorFallback from "./AppErrorFallback";
import { captureTelemetryError } from "../telemetry";
import { isChunkLoadError } from "../utils/chunkErrors";

export default class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    captureTelemetryError(error, {
      domain: "runtime",
      reason_code: "render_error",
      handled: false,
      severity: "fatal",
    });
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <AppErrorFallback
        staleChunk={isChunkLoadError(error)}
        resetError={() => this.setState({ error: null })}
      />
    );
  }
}
