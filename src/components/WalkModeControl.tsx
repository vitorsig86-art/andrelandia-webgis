import { useCallback, useEffect, useRef, useState } from "react";
import type { Cesium3DTileset, Viewer } from "cesium";
import { createWalkMode, type WalkModeSession } from "../cesium/walkMode";
import "./WalkModeControl.css";

interface WalkModeControlProps {
  viewer: Viewer | null;
  tileset: Cesium3DTileset | null;
  modelActive: boolean;
  disabled?: boolean;
  onActiveChange(active: boolean): void;
}

export function WalkModeControl({ viewer, tileset, modelActive, disabled = false, onActiveChange }: WalkModeControlProps) {
  const sessionRef = useRef<WalkModeSession | null>(null);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const exit = useCallback(() => {
    sessionRef.current?.dispose();
    sessionRef.current = null;
    setActive(false);
    onActiveChange(false);
  }, [onActiveChange]);

  useEffect(() => () => {
    sessionRef.current?.dispose();
    sessionRef.current = null;
  }, []);

  useEffect(() => {
    if (active && (!viewer || viewer.isDestroyed() || !tileset || tileset.isDestroyed() || !tileset.show)) exit();
  }, [active, exit, tileset, viewer]);

  function enter(): void {
    if (!viewer || viewer.isDestroyed() || !tileset || tileset.isDestroyed() || disabled) return;
    try {
      const session = createWalkMode(viewer, tileset, {
        onExit: exit,
        onAvatarFallback: () => setMessage("Homem Mapa indisponível; o avatar provisório foi mantido."),
      });
      sessionRef.current = session;
      setMessage(null);
      setActive(true);
      onActiveChange(true);
    } catch (cause) {
      const fallback = "Não foi possível iniciar a caminhada experimental.";
      setMessage(cause instanceof Error ? cause.message : fallback);
    }
  }

  if (!modelActive) return null;
  const unavailable = disabled || !viewer || viewer.isDestroyed() || !tileset || tileset.isDestroyed();

  return (
    <section className={`walk-mode-control ${active ? "is-active" : ""}`} aria-label="Território Interativo">
      <button type="button" onClick={active ? exit : enter} disabled={active ? false : unavailable} aria-pressed={active}>
        <svg
          className="walk-mode-icon"
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m4 11 16-7-7 16-2-7-7-2Z" />
          <path d="m11 13 4-4" />
        </svg>
        <span>{active ? "Sair da exploração" : "Território Interativo"}</span>
      </button>
      {active && (
        <div className="walk-mode-help" role="status">
          <strong>Território Interativo</strong>
          <span className="walk-mode-description">Explore o território com o Homem Mapa.</span>
          <span>
            WASD para mover
            <br />
            Mouse para olhar
            <br />
            ESC para sair
          </span>
        </div>
      )}
      {message && <p className="walk-mode-error" role="alert">{message}</p>}
    </section>
  );
}
