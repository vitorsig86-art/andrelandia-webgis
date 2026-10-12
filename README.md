# Cardeal Map — Andrelândia

WebGIS independente de Andrelândia/MG, derivado do template Cardeal Map. React, TypeScript, Vite e Cesium foram preservados. Não há seletor de projetos.

## Configuração

Todas as fontes, filenames, bounds, níveis de zoom, estilos, popups e visibilidades estão em `src/projects/andrelandia.ts`.

Crie `.env.local` a partir de `.env.example` e configure localmente:

- `VITE_CESIUM_ION_TOKEN`: Bing Aerial with Labels e Cesium World Terrain.
- `VITE_CESIUM_3D_TOKEN`: somente o modelo ion 5900038.

Nenhum token do template foi copiado. O modelo começa desligado; a ausência de seu token só afeta sua ativação. Tokens VITE são visíveis ao navegador; use escopo de assets/origens adequado.

A câmera inicial e Home usam `ORTHO_BOUNDS`. Uma futura câmera aprovada pode ser adicionada em `andrelandiaProject.initialCamera`, com longitude, latitude, height, heading, pitch e roll. Nenhum clipping permanente está configurado.

## Dados e legendas

R2 público: https://pub-7b53e999b0434e53846f72151ecc1995.r2.dev

Rasters: `/<diretório>/{z}/{x}/{reverseY}.png`, Web Mercator, PNG 256×256. Temáticos usam `legendMode: "embedded"`; Ortomosaico usa `"none"`. Legendas `"external"` continuam suportadas pela infraestrutura e pela configuração `legend`.

Vetores: `/geojson/<filename>.geojson`, CRS84/WGS84, longitude/latitude. São carregados apenas após ativação e reutilizados nas ativações seguintes. Fontes incompatíveis são rejeitadas sem reprojeção no navegador.

Publicar/confirmar `curvas_2m.geojson` e `rede_drenagem.geojson`: os arquivos locais inspecionados ainda se chamam `curvas_3m.geojson` e `rede_drenagem_geojson.geojson`. Corrija filenames em um único local se necessário.

A camada de conservação consulta somente `ucfed_andrelandia.geojson` quando solicitada. O arquivo bruto `ucfed.geojson` nunca é uma fonte do viewer. Arquivo regional ausente resulta em mensagem local de pendência/indisponibilidade.

## Validação desta entrega

`npm.cmd run typecheck` aprovado (os dois projetos TypeScript). Não foram executados build, navegador ou checks completos. Não houve commit ou push.

Acesso remoto ao R2 não pôde ser confirmado por falha de conexão. Os popups usam os atributos dos 14 GeoJSONs locais inspecionados. Consulte `IMPLEMENTATION_REPORT.md` para detalhes e pendências.
