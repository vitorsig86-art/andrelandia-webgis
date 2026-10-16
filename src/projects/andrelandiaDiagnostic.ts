import { andrelandiaScenes } from "./andrelandiaScenes";

export interface DiagnosticStep {
  title: string;
  text: string;
  layerIds?: string[];
  facts?: { label: string; value: string }[];
  references?: string[];
}

function sceneLayers(id: string): string[] {
  const scene = andrelandiaScenes.find(scene => scene.id === id);
  if (!scene) throw new Error(`Cena de diagnóstico inexistente: ${id}`);
  return scene.layerIds;
}

export const andrelandiaDiagnostic: DiagnosticStep[] = [
  {
    title: "O território",
    text: "Antes de decidir onde plantar, construir, conservar ou intervir, é preciso compreender a forma e as relações do território.",
    layerIds: sceneLayers("base"),
    facts: [
      { label: "Área do imóvel", value: "14,518 ha" },
      { label: "Município", value: "Andrelândia - MG" },
      { label: "Levantamento", value: "Drone + GNSS + bases territoriais oficiais" },
    ],
  },
  {
    title: "A forma do terreno",
    text: "Altitude, declividade e forma do relevo condicionam circulação da água, acessos, manejo, erosão e possibilidades de ocupação.",
    layerIds: sceneLayers("relevo"),
  },
  {
    title: "A água organiza o território",
    text: "A drenagem não respeita cercas. Entender microbacias e caminhos preferenciais da água ajuda a planejar o imóvel como parte de um sistema maior.",
    layerIds: sceneLayers("hidrologia"),
  },
  {
    title: "Cada vertente recebe o ambiente de forma diferente",
    text: "A orientação das vertentes influencia insolação, temperatura, umidade e comportamento da vegetação.",
    layerIds: ["basemap", "aspect", "propertyArea"],
  },
  {
    title: "Vegetação além da fotografia",
    text: "Índices espectrais ajudam a revelar padrões de vigor e diferenças que nem sempre aparecem claramente na imagem RGB.",
    layerIds: sceneLayers("vegetacao"),
  },
  {
    title: "O território tem uma história física",
    text: "Solo, geomorfologia, geologia e clima ajudam a explicar por que diferentes partes do território apresentam comportamentos distintos.",
    layerIds: ["basemap", "soils", "propertyArea"],
    references: ["Geomorfologia", "Geologia", "Clima"],
  },
  {
    title: "Entrar no território",
    text: "O modelo tridimensional permite perceber formas, volumes e relações espaciais difíceis de interpretar apenas em mapas planos.",
    // The property boundary is ground-clamped; coexistence on the mesh has not
    // been validated. Keep this composition limited to the existing model.
    layerIds: ["basemap", "model"],
  },
  {
    title: "Agora explore",
    text: "Combine as camadas, compare informações e investigue o território livremente.",
    // No composition: keep the user's current layers when finishing.
  },
];
