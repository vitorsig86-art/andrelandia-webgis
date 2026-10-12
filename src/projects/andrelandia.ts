import type { GeographicBounds, ModelClippingConfig, ProjectConfig, ProjectLayerConfig, VectorPopupConfig } from "./types";

export const R2_BASE_URL = "https://pub-7b53e999b0434e53846f72151ecc1995.r2.dev";
export const GEOJSON_FILENAMES = {
  propertyArea: "area_imovel.geojson",
  contours: "curvas_3m.geojson",
  drainage: "rede_drenagem_geojson.geojson",
  basins: "microbacias_drone.geojson",
  municipality: "info_municipio.geojson",
  climate: "clima.geojson",
  geology: "geologia.geojson",
  geomorphology: "geomorfologia.geojson",
  soils: "pedologia.geojson",
  vegetation: "vegetacao.geojson",
  macroContours: "curvas_10m_anadem.geojson",
  anaBasins: "microbacia_ana.geojson",
  simulatedBasins: "simu_microbacias_anadem.geojson",
  anaDrainage: "drenagem_ana.geojson",
  simulatedDrainage: "simu_drenagem_anadem.geojson",
} as const;
export const GEOJSON_URLS = Object.fromEntries(Object.entries(GEOJSON_FILENAMES).map(([key, filename]) => [key, `${R2_BASE_URL}/geojson/${filename}`])) as Record<keyof typeof GEOJSON_FILENAMES, string>;
export const RASTER_DIRECTORIES = { ortho: "orto", dtm: "mdt", dsm: "mds", slope: "decli", aspect: "aspect", ndvi: "ndvi", elevation: "dem%20macro" } as const;
export const ORTHO_BOUNDS: GeographicBounds = [-44.384765625, -21.861498734, -44.296875, -21.779905343];
const surveyBounds: GeographicBounds = [-44.47265625, -21.943045533, -44.296875, -21.779905343];
const macroBounds: GeographicBounds = [-45, -27.05912579, -39.375, -16.63619188];
const territorial = "CONTEXTO TERRITORIAL";
const physical = "MEIO FÍSICO";
const relief = "RELEVO E HIDROLOGIA";
const basinPalette = ["#2B8CBE", "#7B6BB0", "#D49B36", "#47A887", "#C9697B", "#829C42", "#5C85C4", "#B57948"];
type GeoStyle = NonNullable<Extract<ProjectLayerConfig["source"], { format: "geojson" }>["style"]>;
const polygon = (color: string, opacity: number, width = 1.5): GeoStyle => ({ stroke: color, strokeWidth: width, fill: color, fillOpacity: opacity, clampToGround: true, zIndex: 1 });
const basinStyle: GeoStyle = { ...polygon("#67518C", 0.22), palette: { property: "STREAM_ID", colors: basinPalette } };
const drainageStyle: GeoStyle = {
  stroke: "#42C5E8", strokeWidth: 1, clampToGround: true, zIndex: 12,
  classification: { property: "STRAHLER", classes: {
    "1": { stroke: "#58C9E8", strokeWidth: 1 },
    "2": { stroke: "#30B8DF", strokeWidth: 1.5 },
    "3": { stroke: "#159BD5", strokeWidth: 2 },
    "4": { stroke: "#117EC5", strokeWidth: 2.8 },
    "5": { stroke: "#0862AF", strokeWidth: 3.6 },
  } },
};
const contourStyle = (width: number): GeoStyle => ({ stroke: "#111111", strokeWidth: width, clampToGround: true, zIndex: 10 });
const field = (property: string, label: string, options: Omit<VectorPopupConfig["fields"][number], "property" | "label"> = {}): VectorPopupConfig["fields"][number] => ({ property, label, ...options });
const elevationFields = [field("ELEVATION", "Cota", { unit: "m", decimals: 0 })];
const drainageFields = [field("STRAHLER", "Ordem Strahler", { format: "integer" }), field("DRAIN_AREA", "Área drenada", { unit: "ha", decimals: 4 })];
const basinFields = [field("ENCLOSED_AREA", "Área", { unit: "ha", decimals: 3 }), field("PERIMETER", "Perímetro", { unit: "km", decimals: 3 }), field("STREAM_ID", "Identificação", { format: "integer" })];

function raster(id: keyof typeof RASTER_DIRECTORIES, name: string, bounds: GeographicBounds, minimumLevel: number, maximumLevel: number, subsection?: string): ProjectLayerConfig {
  return { id, name, description: name, kind: "raster", group: subsection ? "macro" : "raster", subsection,
    defaultVisible: id === "ortho", opacityControl: true, lazy: true, legendMode: id === "ortho" ? "none" : "embedded",
    source: { format: "tms", url: `${R2_BASE_URL}/${RASTER_DIRECTORIES[id]}/{z}/{x}/{reverseY}.png`, credit: "Cardeal Map", bounds, minimumLevel, maximumLevel, tileWidth: 256, tileHeight: 256, allowMissingTiles: true },
  };
}
function vector(id: keyof typeof GEOJSON_FILENAMES, name: string, style: GeoStyle, fields: VectorPopupConfig["fields"], subsection?: string, title = name): ProjectLayerConfig {
  return { id, name, description: name, kind: "vector", group: subsection ? "macro" : "vector", subsection,
    defaultVisible: false, lazy: true, opacityControl: true, legendMode: "none",
    source: { format: "geojson", url: GEOJSON_URLS[id], autoZoom: false, ignoreAltitude: true, uniqueFeatureIds: true, style, popup: { title, fields } },
  };
}

// Approved crop vertices: [longitude, latitude] in degrees, without a closing duplicate.
const modelClipping: ModelClippingConfig = {
  enabled: true,
  inverse: true,
  positions: [
    [-44.30882123, -21.83363139],
    [-44.31332853, -21.83902496],
    [-44.31408431, -21.84060761],
    [-44.30937673, -21.84455058],
    [-44.30822418, -21.84491085],
    [-44.30265144, -21.83834393],
    [-44.30299067, -21.83741000],
    [-44.30554564, -21.83542196],
    [-44.30694291, -21.83394748],
  ],
};

export const andrelandiaProject: ProjectConfig = {
  id: "andrelandia", name: "Cardeal Map", location: "Andrelândia - Minas Gerais", bounds: ORTHO_BOUNDS,
  // Opening and Home share this camera preset. Angles are degrees; height is meters.
  initialCamera: {
    longitude: -44.30957095,
    latitude: -21.84070305,
    height: 1849.57,
    heading: 34.93,
    pitch: -82.35,
    roll: 0.00,
  },
  developmentTools: { modelAlignment: false, cameraCapture: false },
  layers: [
    { id: "basemap", name: "Bing Aerial com rótulos", description: "Bing Maps via Cesium ion", kind: "basemap", group: "basemap", defaultVisible: true, legendMode: "none",
      source: { format: "ion-world-imagery", fallback: { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", credit: '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>', maximumLevel: 19 } } },
    { id: "model", name: "Modelo 3D", description: "Modelo fotogramétrico", kind: "3d-tiles", group: "model", defaultVisible: false, legendMode: "none", source: { format: "3d-tiles", source: "ion", assetId: 5900038, tokenEnv: "VITE_CESIUM_3D_TOKEN", clipping: modelClipping } },
    raster("ortho", "Ortomosaico", ORTHO_BOUNDS, 12, 21),
    raster("dtm", "Modelo Digital do Terreno", surveyBounds, 11, 20),
    raster("dsm", "Modelo Digital da Superfície", surveyBounds, 11, 20),
    raster("slope", "Declividade", surveyBounds, 11, 20),
    raster("aspect", "Orientação Solar", surveyBounds, 11, 20),
    raster("ndvi", "NDVI", surveyBounds, 11, 20),
    { ...vector("propertyArea", "Área do imóvel", { ...polygon("#FF0000", 0.01, 4), zIndex: 20 }, [
      field("ENCLOSED_AREA", "Área", { unit: "ha", decimals: 3 }),
      field("PERIMETER", "Perímetro", { unit: "km", decimals: 3 }),
    ]), defaultVisible: true },
    vector("contours", "Curvas de nível 2 m", contourStyle(1), elevationFields),
    vector("drainage", "Rede de drenagem", drainageStyle, drainageFields),
    vector("basins", "Microbacias", basinStyle, basinFields, undefined, "Microbacia"),
    vector("municipality", "Contexto Municipal IBGE", polygon("#6C7E89", 0.28, 2), [
      field("BaseRurU_2", "Município"), field("BaseRurUrb", "UF", { valueLabels: { "Minas Gerais": "MG" } }),
      field("Pop_Tot_Mu", "População total", { format: "integer", suffix: " habitantes" }),
      field("Pop_Urb_Mu", "População urbana", { format: "integer" }), field("Perc_Urb_U", "Percentual urbano", { decimals: 2, suffix: "%" }),
      field("Pop_Rur_Mu", "População rural", { format: "integer" }), field("Pop_Rur_Mu", "Percentual rural", { ratioTo: "Pop_Tot_Mu", decimals: 2, suffix: "%" }),
      field("Tipologia_", "Tipologia territorial", { valueLabels: { IntermediarioAdjacente: "Intermediário Adjacente" } }),
      field("Classes_Pe", "Urbanização"),
    ], territorial),
    vector("climate", "Clima IBGE", polygon("#28A7C9", 0.12), [field("ZONA", "Zona"), field("TP_UMIDADE", "Umidade"), field("DISTR_UMID", "Distribuição de umidade"), field("TEMPERATUR", "Temperatura"), field("DESC_COMPL", "Descrição completa")], territorial),
    vector("geology", "Geologia IBGE", polygon("#C68D67", 0.33, 2), [field("nm_unidade", "Unidade"), field("letra_simb", "Símbolo"), field("nm_tempo_g", "Tempo geológico"), field("nm_provinc", "Província"), field("nm_sub_pro", "Subprovíncia"), ...["nm_lito1", "nm_lito2", "nm_lito3", "nm_lito4"].map(property => field(property, "Litologia"))], physical),
    vector("geomorphology", "Geomorfologia IBGE", polygon("#BA9D50", 0.18), [field("nm_dominio", "Domínio"), field("nm_regiao", "Região"), field("nm_unidade", "Unidade"), field("categoria", "Categoria"), field("natureza", "Natureza"), field("caract", "Característica"), field("forma", "Forma"), field("dens_dren", "Densidade de drenagem"), field("aprof_inci", "Aprofundamento da incisão"), field("compartime", "Compartimento")], physical),
    vector("soils", "Pedologia IBGE", polygon("#B48357", 0.2), [field("nom_unidad", "Unidade"), field("legenda", "Solo"), field("ordem", "Ordem"), field("subordem", "Subordem"), field("grande_gru", "Grande grupo"), field("subgrupos", "Subgrupo"), field("textura", "Textura"), field("horizonte", "Horizonte"), field("relevo", "Relevo"), ...["componente", "component1", "component2", "component3"].map(property => field(property, "Componente", { section: "Associação de solos" })), ...["inclu_p1", "inclu_p2", "inclu_p3"].map(property => field(property, "Inclusão", { section: "Associação de solos" }))], physical),
    vector("vegetation", "Vegetação IBGE", polygon("#398D57", 0.2), [field("nm_uveg", "Vegetação atual/principal"), field("nm_pretet", "Vegetação pretérita"), field("nm_sec1", "Uso associado"), field("nm_sec2", "Classe associada"), field("leg_sup", "Dominância")], physical),
    raster("elevation", "Modelo de Elevação ANADEM", macroBounds, 6, 15, relief),
    vector("macroContours", "Curvas de nível 10 m — ANADEM", contourStyle(0.65), elevationFields, relief),
    vector("anaBasins", "Microbacias ANA", polygon("#8053BD", 0.025, 2.2), [field("wts_cd_pfafstetterbasin", "Código da microbacia", { format: "integer" }), field("wts_cd_pfafstetterbasincodeleve", "Nível Pfafstetter", { format: "integer" }), field("wts_gm_area", "Área", { unit: "km²", decimals: 4 })], relief),
    vector("simulatedBasins", "Microbacias simuladas ANADEM", basinStyle, [field("STREAM_ID", "STREAM ID", { format: "integer" }), field("ENCLOSED_AREA", "Área", { unit: "ha", decimals: 2 }), field("PERIMETER", "Perímetro", { unit: "km", decimals: 3 })], relief, "Microbacia simulada"),
    vector("anaDrainage", "Drenagem ANA", { stroke: "#163C80", strokeWidth: 2.3, clampToGround: true, zIndex: 13, classification: { property: "nuordemcda", classes: { "5": { strokeWidth: 2.3 }, "6": { strokeWidth: 3 }, "7": { strokeWidth: 3.7 } } } }, [field("nuordemcda", "Ordem", { format: "integer" }), field("nunivotcda", "Nível Otto", { format: "integer" }), field("nuareabacc", "Área da bacia", { unit: "km²", decimals: 3 }), field("nucompcda", "Comprimento", { unit: "km", decimals: 3 }), field("dsversao", "Versão/base")], relief),
    vector("simulatedDrainage", "Simulação de drenagem ANADEM", drainageStyle, drainageFields, relief),
  ],
};
