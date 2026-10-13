import type { SurveyInfo } from "./types";

export const andrelandiaSurvey: SurveyInfo = {
  title: "Sobre o levantamento — Andrelândia/MG",
  fields: [
    { label: "Equipamento aéreo", value: "DJI Mavic 3 Multispectral (Mavic 3M)." },
    { label: "Base GNSS", value: "Emlid Reach RS2." },
    { label: "Método", value: "Levantamento aerofotogramétrico com posicionamento das imagens por PPK, base processada pelo IBGE-PPP e pontos de campo RTK corrigidos." },
    { label: "Ortomosaico", value: "Resolução de 4,30 cm/pixel." },
    { label: "Imagens processadas", value: "347." },
    { label: "Referência cartográfica do projeto", value: "SIRGAS 2000 / UTM zona 23S — EPSG:31983." },
    { label: "Apoio de campo", value: "Cinco pontos, sendo três de controle e dois de verificação." },
    { label: "Processamento", value: "Agisoft Metashape Professional." },
  ],
  quality: [
    "Nos dois pontos de verificação, o relatório fotogramétrico registrou erro quadrático médio (RMSE) de 1,09 cm na horizontal e 3,61 cm na vertical. Esses resultados descrevem os pontos avaliados e não garantem a mesma precisão em toda a área ou nas medições feitas no visualizador.",
    "As camadas IBGE, ANA e ANADEM complementam o levantamento local e possuem fontes, escalas e métodos próprios.",
  ],
};
