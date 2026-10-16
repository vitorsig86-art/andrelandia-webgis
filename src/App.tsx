import { lazy, Suspense, useState } from "react";
import { andrelandiaScenes, projects } from "./projects";
import { LayerPanel } from "./components/LayerPanel";
import { Legend } from "./components/Legend";
import { MapScale } from "./components/MapScale";
import { NavigationControls } from "./components/NavigationControls";
import { WalkModeControl } from "./components/WalkModeControl";
import { MeasurementToolbar } from "./components/MeasurementToolbar";
import { SurveyAbout } from "./components/SurveyAbout";
import { VectorPopup } from "./components/VectorPopup";
import { ModeSwitcher, type MapMode } from "./components/ModeSwitcher";
import { DiagnosticJourney } from "./components/DiagnosticJourney";
import { andrelandiaDiagnostic } from "./projects/andrelandiaDiagnostic";

import { useCesiumViewer } from "./hooks/useCesiumViewer";
import { useProjectLayers } from "./hooks/useProjectLayers";
import type { ProjectConfig } from "./projects/types";

const ModelDevelopmentTools = import.meta.env.DEV ? lazy(() => import("./components/ModelDevelopmentTools")) : null;

function defaultVisibility(project: ProjectConfig) {
  return new Set(project.layers.filter((layer) => layer.defaultVisible).map((layer) => layer.id));
}

export function App() {
  const project = projects[0];
  const [visible, setVisible] = useState(() => defaultVisibility(projects[0]));
  const [panelOpen, setPanelOpen] = useState(false);
  const [mode, setMode] = useState<MapMode>("explore");
  const [diagnosticStep, setDiagnosticStep] = useState(0);
  const [walkModeActive, setWalkModeActive] = useState(false);
  const { containerRef, viewer, error } = useCesiumViewer(Boolean(project.developmentTools?.cameraCapture));
  const { statuses, mapWarning, rasterOpacities, setRasterOpacity, getModel } = useProjectLayers(viewer, project, visible);
  const legendLayers = project.layers.filter((layer) => layer.legend && (layer.legendMode ?? "external") === "external" && visible.has(layer.id));
  const activeModelLayer = project.layers.find((layer) => layer.source.format === "3d-tiles" && visible.has(layer.id));
  const activeModel = activeModelLayer ? getModel(activeModelLayer.id) : null;

  function toggleLayer(id: string) {
    setVisible((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // A scene only publishes a new visibility set; loading, caching, tile order,
  // the camera and Home stay on the existing paths.
  function applyScene(layerIds: string[]) {
    setVisible(new Set(layerIds));
  }

  function changeDiagnosticStep(index: number) {
    const step = andrelandiaDiagnostic[index];
    if (!step) return;
    setDiagnosticStep(index);
    if (step.layerIds) applyScene(step.layerIds);
  }

  function changeMode(nextMode: MapMode) {
    if (nextMode === mode) return;
    setMode(nextMode);
    if (nextMode === "diagnostic") changeDiagnosticStep(0);
  }

  return (
    <main className="app-shell">
      <div ref={containerRef} className="map-container" aria-label="Mapa 3D interativo do projeto" />
      <header className="app-header">
        <a className="brand" href="/" aria-label="Página inicial do Cardeal Map Viewer">
          <img src="/logo-cardeal.png" alt="" />
          <span><strong>Cardeal Map</strong><span>Andrelândia - Minas Gerais</span></span>
        </a>
        <span className="header-divider" />
        <div className="header-project">
          {project.survey && <SurveyAbout survey={project.survey} />}
        </div>
        <button className="panel-toggle mobile-only" aria-expanded={panelOpen} aria-controls="layer-panel" onClick={() => setPanelOpen(!panelOpen)}>☰ <span>Camadas</span></button>
      </header>
      <ModeSwitcher mode={mode} onChange={changeMode} />
      {mode === "diagnostic" && <DiagnosticJourney
        steps={andrelandiaDiagnostic}
        stepIndex={diagnosticStep}
        onStepChange={changeDiagnosticStep}
        onExplore={() => changeMode("explore")}
      />}
      {panelOpen && <button type="button" className="drawer-backdrop" aria-label="Fechar painel de camadas" onClick={() => setPanelOpen(false)} />}
      <aside id="layer-panel" aria-label="Área de trabalho e camadas" className={`layer-panel ${panelOpen ? "is-open" : ""}`}>
        <LayerPanel project={project} statuses={statuses} visible={visible} rasterOpacities={rasterOpacities} onOpacityChange={setRasterOpacity} onToggle={toggleLayer} onClose={() => setPanelOpen(false)} scenes={andrelandiaScenes} onApplyScene={(scene) => applyScene(scene.layerIds)} />
      </aside>
      <NavigationControls viewer={viewer} project={project} disabled={Boolean(error) || walkModeActive} />
      <WalkModeControl
        viewer={viewer}
        tileset={activeModel}
        modelActive={Boolean(activeModelLayer)}
        disabled={Boolean(error)}
        onActiveChange={setWalkModeActive}
      />
      <MapScale viewer={viewer} />
      <MeasurementToolbar viewer={viewer} disabled={Boolean(error)} />
      <VectorPopup viewer={viewer} />
      {ModelDevelopmentTools && project.developmentTools?.modelAlignment &&
        <Suspense fallback={null}>
          {project.layers.filter(layer => layer.source.format === "3d-tiles" && visible.has(layer.id)).map(layer =>
            <ModelDevelopmentTools key={layer.id} viewer={viewer} tileset={getModel(layer.id)} alignment={Boolean(project.developmentTools?.modelAlignment)} />)}
        </Suspense>}
      {(error || mapWarning) && <div role="alert" className="map-alert">{error || mapWarning}</div>}
      {!viewer && !error && <div role="status" className="map-alert">Iniciando o visualizador 3D…</div>}
      {legendLayers.length > 0 && <div className="raster-legend-stack" role="group" aria-label="Legendas das camadas visíveis" tabIndex={0}>
        {legendLayers.map((layer) => layer.legend && <Legend key={layer.id} {...layer.legend} compact={layer.id === "ndvi"} visibility={visible.has(layer.id)} />)}
      </div>}
    </main>
  );
}
