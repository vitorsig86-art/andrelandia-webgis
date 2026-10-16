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
    <section className={`walk-mode-control ${active ? "is-active" : ""}`} aria-label="Caminhada experimental">
      <button type="button" onClick={active ? exit : enter} disabled={active ? false : unavailable} aria-pressed={active}>
        {active ? "Sair" : "Caminhar"}
      </button>
      {active && <p role="status">WASD para mover<br />Mouse para olhar<br />ESC para sair</p>}
      {message && <p className="walk-mode-error" role="alert">{message}</p>}
    </section>
  );
}
