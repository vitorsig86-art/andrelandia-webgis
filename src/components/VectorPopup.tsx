import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Cartesian2, Entity, type Viewer } from "cesium";
import { isPerimeterPopup, readVectorPopup, resolveVectorPopupSelection } from "../cesium/vectorPopup";
import { placePopup, type ScreenPoint } from "./popupPosition";
import "./VectorPopup.css";

export function VectorPopup({ viewer }: { viewer: Viewer | null }) {
  const [popup, setPopup] = useState<ReturnType<typeof readVectorPopup>>(null);
  const popupRef = useRef<HTMLElement>(null);
  const clickRef = useRef<ScreenPoint | null>(null);
  const [anchor, setAnchor] = useState<ScreenPoint | null>(null);
  const [placement, setPlacement] = useState<{ left: number; top: number; maxWidth: number; maxHeight: number } | null>(null);
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    const canvas = viewer.canvas;
    const update = () => {
      const next = readVectorPopup(viewer.selectedEntity, viewer.clock.currentTime);
      setPopup(current => JSON.stringify(current) === JSON.stringify(next) ? current : next);
      setAnchor(clickRef.current);
    };
    // Observe clicks without replacing Cesium's picking or input actions.
    let touch = false;
    const rememberPoint = (event: PointerEvent) => {
      touch = event.pointerType === "touch";
      clickRef.current = { x: event.clientX, y: event.clientY };
    };
    const clicked = (event: MouseEvent) => {
      clickRef.current = { x: event.clientX, y: event.clientY };
      if (!viewer.isDestroyed() && (!viewer.selectedEntity || isPerimeterPopup(viewer.selectedEntity) || readVectorPopup(viewer.selectedEntity, viewer.clock.currentTime))) {
        const bounds = canvas.getBoundingClientRect();
        const point = new Cartesian2(event.clientX - bounds.left, event.clientY - bounds.top);
        const entitiesAt = (size?: number) => viewer.scene.drillPick(point, undefined, size, size)
          .map(hit => hit.id).filter((id): id is Entity => id instanceof Entity);
        const entities = entitiesAt();
        // GPU picking follows the rendered ground line in oblique 3D, including its
        // clamping. Enlarge only the hit rectangle, never the visual line width.
        // Keep nearby targets exclusive to perimeter-configured popups.
        const nearby = !viewer.selectedEntity || isPerimeterPopup(viewer.selectedEntity) ? entitiesAt(touch ? 21 : 7) : [];
        const selected = resolveVectorPopupSelection(viewer.selectedEntity, entities, viewer.clock.currentTime, nearby);
        if (selected !== viewer.selectedEntity) viewer.selectedEntity = selected;
      }
      update();
    };
    canvas.addEventListener("pointerdown", rememberPoint);
    canvas.addEventListener("click", clicked);
    update();
    const remove = viewer.selectedEntityChanged.addEventListener(update);
    const removeTick = viewer.clock.onTick.addEventListener(update);
    return () => {
      removeTick();
      remove();
      canvas.removeEventListener("pointerdown", rememberPoint);
      canvas.removeEventListener("click", clicked);
    };
  }, [viewer]);

  useLayoutEffect(() => {
    if (!popup || !viewer || viewer.isDestroyed() || !popupRef.current) return;
    const element = popupRef.current;
    const shell = element.closest(".app-shell");
    const controls = [...(shell?.querySelectorAll<HTMLElement>(".measurement-controls, .navigation-controls, .raster-legend-stack, .map-alert, .cesium-viewer-bottom") ?? [])];
    const position = () => {
      if (viewer.isDestroyed()) return;
      const map = viewer.canvas.getBoundingClientRect();
      const bounds = { left: Math.max(0, map.left), top: Math.max(0, map.top), right: Math.min(window.innerWidth, map.right), bottom: Math.min(window.innerHeight, map.bottom) };
      const maxWidth = Math.max(0, Math.min(300, bounds.right - bounds.left - 24));
      const maxHeight = Math.max(0, bounds.bottom - bounds.top - 24);
      // Constrain before measuring so wrapping is included in collision checks.
      element.style.maxWidth = `${maxWidth}px`;
      element.style.maxHeight = `${maxHeight}px`;
      const rect = element.getBoundingClientRect();
      const obstacles = controls.filter(control => getComputedStyle(control).visibility !== "hidden")
        .map(control => control.getBoundingClientRect()).filter(control => control.width > 0 && control.height > 0);
      const point = anchor ?? { x: bounds.left + (bounds.right - bounds.left) / 2, y: bounds.top + 80 };
      const next = { ...placePopup(point, rect, bounds, obstacles), maxWidth, maxHeight };
      setPlacement(current => current && Object.keys(next).every(key => current[key as keyof typeof next] === next[key as keyof typeof next]) ? current : next);
    };
    position();
    const observer = new ResizeObserver(position);
    [element, viewer.canvas, ...controls].forEach(control => observer.observe(control));
    window.addEventListener("resize", position);
    return () => { observer.disconnect(); window.removeEventListener("resize", position); };
  }, [popup, anchor, viewer]);
  if (!popup) return null;
  return <section ref={popupRef} className="vector-popup" style={placement ?? { visibility: "hidden" }} aria-label="Informações da feição" aria-live="polite">
    <button type="button" aria-label="Fechar informações" onClick={() => {
      if (viewer && !viewer.isDestroyed()) viewer.selectedEntity = undefined;
      setPopup(null);
    }}>×</button>
    <strong>{popup.title}</strong>
    {popup.fields.map((field, index) => <div key={index}>
      {field.section && field.section !== popup.fields[index - 1]?.section && <h4>{field.section}</h4>}
      <p>{field.label && `${field.label}: `}{field.value}</p>
    </div>)}
  </section>;
}
