import { useEffect, useRef } from "react";
import { Cartesian2, EllipsoidGeodesic, type Viewer } from "cesium";

// Approximate horizontal scale at the map center; hide when looking at the sky.
export function MapScale({ viewer }: { viewer: Viewer | null }) {
  const element = useRef<HTMLOutputElement>(null);
  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;
    const output = element.current;
    if (!output) return;
    let previous = "";
    let lastUpdate = 0;
    const update = () => {
      if (viewer.isDestroyed() || performance.now() - lastUpdate < 150) return;
      lastUpdate = performance.now();
      const ellipsoid = viewer.scene.globe.ellipsoid;
      const x = viewer.canvas.clientWidth / 2;
      const y = viewer.canvas.clientHeight / 2;
      const pick = (point: Cartesian2) => {
        const ray = viewer.camera.getPickRay(point);
        return (ray && viewer.scene.globe.pick(ray, viewer.scene)) ?? viewer.camera.pickEllipsoid(point, ellipsoid);
      };
      const left = pick(new Cartesian2(x - 50, y));
      const right = pick(new Cartesian2(x + 50, y));
      if (!left || !right) { output.hidden = true; return; }
      const start = ellipsoid.cartesianToCartographic(left);
      const end = ellipsoid.cartesianToCartographic(right);
      let distance: number;
      try { distance = new EllipsoidGeodesic(start, end, ellipsoid).surfaceDistance; }
      catch { output.hidden = true; return; }
      if (!Number.isFinite(distance) || distance <= 0) { output.hidden = true; return; }
      const magnitude = Math.pow(10, Math.floor(Math.log10(distance)));
      const amount = [5, 2, 1].map(value => value * magnitude).find(value => value <= distance) ?? magnitude;
      const width = 100 * amount / distance;
      const label = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(amount >= 1000 ? amount / 1000 : amount) + (amount >= 1000 ? " km" : " m");
      const key = label + width.toFixed(1);
      output.hidden = false;
      if (key !== previous) {
        output.textContent = label;
        output.style.width = `${width}px`;
        previous = key;
      }
    };
    update();
    return viewer.scene.postRender.addEventListener(update);
  }, [viewer]);
  return <output ref={element} className="map-scale" aria-label="Escala aproximada no centro do mapa" hidden />;
}
