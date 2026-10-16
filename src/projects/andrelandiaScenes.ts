// Quick scenes for the layer panel. A scene only publishes a new set of layer
// ids to the viewer's existing visibility state: it never creates a layer, never
// touches opacity, the camera, Home or the Cesium lifecycle.
export interface WorkspaceScene {
  id: string;
  label: string;
  description: string;
  layerIds: string[];
}

// One opaque thematic raster at a time keeps every scene readable.
export const andrelandiaScenes: WorkspaceScene[] = [
  {
    id: "base",
    label: "BASE",
    description: "Bing Aerial com rótulos, Ortomosaico e Área do imóvel",
    layerIds: ["basemap", "ortho", "propertyArea"],
  },
  {
    id: "relevo",
    label: "RELEVO",
    description: "Bing Aerial com rótulos, Modelo Digital do Terreno, Curvas de nível 2 m e Área do imóvel",
    layerIds: ["basemap", "dtm", "contours", "propertyArea"],
  },
  {
    id: "hidrologia",
    label: "HIDROLOGIA",
    description: "Bing Aerial com rótulos, Ortomosaico, Rede de drenagem, Microbacias e Área do imóvel",
    layerIds: ["basemap", "ortho", "drainage", "basins", "propertyArea"],
  },
  {
    id: "vegetacao",
    label: "VEGETAÇÃO",
    description: "Bing Aerial com rótulos, NDVI e Área do imóvel",
    layerIds: ["basemap", "ndvi", "propertyArea"],
  },
];
