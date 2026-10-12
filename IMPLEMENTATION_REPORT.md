# Entrega — Cardeal Map, Andrelândia/MG

## 1. Pasta criada

`C:\Users\Usuario\Desktop\andrelandia-webgis`.

Cópia limpa do template, sem .git, node_modules, dist, caches, artefatos de verificação ou arquivos .env com credenciais. .env.example foi preservado com valores vazios. Dependências foram instaladas posteriormente, via npm ci offline com scripts desabilitados, somente para a checagem TypeScript. Não foi inicializado Git.

## 2. Arquivos criados e modificados

Criados:

- `src/projects/andrelandia.ts`
- `src/hooks/useGeolocation.ts`
- `src/components/MapScale.tsx`
- `IMPLEMENTATION_REPORT.md`

Modificados na cópia:

- `README.md`
- `index.html`
- `src/App.tsx`
- `src/cesium/loadLayer.ts`
- `src/cesium/prepareGeoJson.ts`
- `src/cesium/vectorPopup.ts`
- `src/components/LayerPanel.css`
- `src/components/LayerPanel.tsx`
- `src/components/NavigationControls.css`
- `src/components/NavigationControls.tsx`
- `src/components/VectorPopup.tsx`
- `src/hooks/useProjectLayers.ts`
- `src/projects/index.ts`
- `src/projects/types.ts`
- `src/styles.css`
- `src/vite-env.d.ts`

Os demais arquivos e recursos necessários foram copiados do template. package.json e package-lock.json permanecem iguais aos originais.

## 3. Template original

Nenhum arquivo de código, configuração, documentação ou asset do template original foi alterado. Comparação SHA-256 de todos os 113 arquivos regulares elegíveis à cópia não encontrou diferenças na origem. Nenhum outro projeto de referência foi editado.

## 4–5. Grupos e camadas

24 camadas, nesta ordem de grupos:

| Grupo | Camadas |
|---|---|
| Mapa base | Bing Aerial com rótulos via Cesium ion; World Terrain preservado no lifecycle do viewer |
| Modelo 3D | Modelo 3D — ion 5900038 |
| Rasters | Ortomosaico; Modelo Digital do Terreno; Modelo Digital da Superfície; Declividade; Orientação Solar; NDVI |
| Vetores | Curvas de nível 2 m; Rede de drenagem; Microbacias |
| Análise Macro — CONTEXTO TERRITORIAL | Contexto Municipal IBGE; Unidades de Conservação Federais; Clima IBGE |
| Análise Macro — MEIO FÍSICO | Geologia IBGE; Geomorfologia IBGE; Pedologia IBGE; Vegetação IBGE |
| Análise Macro — RELEVO E HIDROLOGIA | Modelo de Elevação ANADEM; Curvas de nível 10 m — ANADEM; Microbacias ANA; Microbacias simuladas ANADEM; Drenagem ANA; Simulação de drenagem ANADEM |

Os três subtítulos são apenas h4 visuais, sem checkbox, accordion, collapse ou estado próprio. Inicialmente somente Bing e Ortomosaico estão ativos. Os vetores, rasters desligados e modelo são carregados sob demanda, mantidos em cache e reutilizados. O lifecycle, limpeza, medições, atribuição nativa, drawer e backdrop existentes foram preservados. Não existe perímetro inventado.

## 6. URLs R2

Base única: https://pub-7b53e999b0434e53846f72151ecc1995.r2.dev

TMS: `<base>/<diretório>/{z}/{x}/{reverseY}.png`.

| Diretório | Camada | Zoom | Bounds W/S/E/N |
|---|---|---|---|
| orto | Ortomosaico | 12–21 | -44.384765625 / -21.861498734 / -44.296875 / -21.779905343 |
| mdt | Modelo Digital do Terreno | 11–20 | -44.47265625 / -21.943045533 / -44.296875 / -21.779905343 |
| mds | Modelo Digital da Superfície | 11–20 | iguais ao MDT |
| decli | Declividade | 11–20 | iguais ao MDT |
| aspect | Orientação Solar | 11–20 | iguais ao MDT |
| ndvi | NDVI | 11–20 | iguais ao MDT |
| dem_macro | Modelo de Elevação ANADEM | 6–15 | -45 / -27.05912579 / -39.375 / -16.63619188 |

PNG, 256×256, Web Mercator. Sliders, sobreposição e comportamento existente de tiles periféricos 404/410 foram preservados. Providers não são recriados ao alternar a visibilidade. GeoJSON: `<base>/geojson/<filename>.geojson`. Base, diretórios, filenames e URLs estão centralizados em src/projects/andrelandia.ts.

## 7. Situação dos GeoJSONs

Inspecionados em `C:\Users\Usuario\Desktop\TRABALHO ANDRELANDIA\tiles\geojson`. Não foram copiados para public nem alterados. A conexão ao R2 falhou; isso não comprova 404 nem existência remota. CORS e conteúdo remoto permanecem sem confirmação.

| Filename configurado | Evidência local |
|---|---|
| `info_municipio.geojson` | 1 feições; CRS84 local |
| `clima.geojson` | 1 feições; CRS84 local |
| `geologia.geojson` | 1 feições; CRS84 local |
| `geomorfologia.geojson` | 1 feições; CRS84 local |
| `pedologia.geojson` | 1 feições; CRS84 local |
| `vegetacao.geojson` | 1 feições; CRS84 local |
| `curvas_10m_anadem.geojson` | 698 feições; CRS84 local |
| `microbacia_ana.geojson` | 2 feições; CRS84 local |
| `simu_microbacias_anadem.geojson` | 93 feições; CRS84 local |
| `drenagem_ana.geojson` | 12 feições; CRS84 local |
| `simu_drenagem_anadem.geojson` | 454 feições; CRS84 local |
| `curvas_2m.geojson` | 159 feições; CRS84 local |
| `rede_drenagem.geojson` | 732 feições; CRS84 local |
| `microbacias_drone.geojson` | 22 feições; CRS84 local |
| `ucfed_andrelandia.geojson` | Regional ausente localmente; camada opcional |

Foi conferida a estrutura e os atributos locais. Não houve auditoria topológica ou validação altimétrica. Não são aplicadas transformações de CRS: o preparo GeoJSON rejeita declaração incompatível e coordenadas fora dos limites longitude/latitude.

## 8. Filenames pendentes

- Publicar/confirmar curvas_2m.geojson: o arquivo local ainda se chama curvas_3m.geojson, mas os dados são de 2 m.
- Publicar/confirmar rede_drenagem.geojson: o arquivo local ainda se chama rede_drenagem_geojson.geojson.
- Disponibilizar ucfed_andrelandia.geojson regional reduzido.
- Confirmar todos os demais filenames e CORS no R2; não foram verificáveis remotamente nesta sessão.

## 9–13. Modelo e tokens

Asset ID 5900038 configurado, inicialmente desligado. A implementação existente usa IonResource.fromAssetId(assetId, { accessToken }) seguido de Cesium3DTileset.fromUrl(resource), com VITE_CESIUM_3D_TOKEN. VITE_CESIUM_ION_TOKEN permanece independente, atribuído ao Ion.defaultAccessToken para os serviços principais do viewer. Não houve substituição global pelo token 3D.

Nenhum token foi hardcoded, copiado ou impresso. Nenhum token foi escrito em Git. .env.local permanece gitignored e não foi criado com credenciais. É necessário configurar localmente as duas variáveis; o token 3D ausente gera erro somente quando o modelo é solicitado, sem impedir TypeScript ou inicialização do viewer.

## 14–15. Legendas

- embedded: MDT, MDS, Declividade, Orientação Solar, NDVI e Modelo de Elevação ANADEM.
- external: suporte preservado para legendas PNG/gradiente futuras; nenhuma camada ativa desta configuração usa legenda externa.
- none: Ortomosaico, Bing, modelo e vetores.

O filtro genérico respeita legendMode; configurações antigas com legend e sem legendMode continuam externas. Não foram criadas nem carregadas imagens separadas para as legendas temáticas deste projeto.

## 16. Conservação

ucfed.geojson bruto nunca é solicitado pelo viewer. A configuração opcional consulta somente ucfed_andrelandia.geojson após ativação. Sem arquivo regional acessível, mostra pendência/indisponibilidade exclusivamente nessa camada, permitindo nova tentativa ao desativar e ativar. Nenhuma geometria foi inventada. Os atributos do futuro arquivo regional serão apresentados pelo fallback genérico até haver configuração baseada em dados reais.

## 17–19. Curvas e drenagem

Curvas do drone são identificadas como 2 m, pretas, finas; popup usa somente ELEVATION, sem duplicar m. Curvas ANADEM são de 10 m, com linha mais discreta.

Rede de drenagem e Simulação de drenagem ANADEM têm classes STRAHLER 1–5, cores azul/ciano e espessuras crescentes 1 / 1,5 / 2 / 2,8 / 3,6 px. Drenagem ANA é azul escuro, com classes nuordemcda 5/6/7. Os nomes de rios ausentes não foram inventados.

## 20. Popups e estilos

Campos específicos configurados a partir dos atributos locais. Números e strings numéricas com unidades são formatados em pt-BR; m, ha, km e km² não são duplicados. O percentual rural é calculado de Pop_Rur_Mu / Pop_Tot_Mu, sem constante demográfica. UF é apresentação do valor Minas Gerais como MG. Campos vazios, null, undefined, whitespace e duplicações equivalentes são omitidos.

Geologia não exibe litologias vazias. Pedologia inclui bloco Associação de solos com componentes/inclusões preenchidos. Identificadores ANA e os nomes IBGE vêm das propriedades. Nenhum valor demográfico, geológico ou geométrico foi inventado. Fallback genérico baseado em Entity.properties permanece disponível para camadas sem configuração específica.

Microbacias usam palette determinística baseada em STREAM_ID: mesma identificação recebe sempre a mesma cor. O preenchimento é semitransparente, e contornos usam os PolylineGraphics já existentes no template, incluindo anéis internos.

## 21–22. Clipping e câmera

Nenhum clipping permanente foi aplicado. A infraestrutura e ferramentas genéricas de recorte foram preservadas, com ferramentas de desenvolvimento desligadas. Nenhum polígono definitivo foi inventado.

Câmera inicial e Home compartilham project.bounds / ORTHO_BOUNDS, usando Rectangle. Não foi definido heading, pitch, roll ou height definitivo. initialCamera continua disponível para uma futura vista aprovada. Não foi criado botão permanente de debug.

## 23. TypeScript

npm.cmd run typecheck: APROVADO, incluindo tsc --noEmit e tsc --noEmit -p tsconfig.node.json. Uma incompatibilidade de tipagem opcional do estilo foi corrigida com NonNullable; nenhuma supressão as any, ts-ignore ou ts-expect-error foi adicionada.

Não foram executados production build, testes de navegador ou checks completos. Não houve commit, push ou upgrade/downgrade de dependências.

## 24. Compatibilidade Cesium e diferenças do template

package.json: ^1.145.0; lockfile e node_modules: Cesium 1.146.0, preservados. Skills locais usam baseline 1.144. As APIs efetivamente utilizadas foram conferidas nos exports, tipos TypeScript e fontes instaladas; IonResource.fromAssetId com accessToken e Cesium3DTileset.fromUrl(Resource) são compatíveis. Camera.flyTo aceita Rectangle. Não foi identificada incompatibilidade nas APIs públicas utilizadas nesta adaptação.

Referências oficiais consultadas:

- https://cesium.com/learn/cesiumjs/ref-doc/IonResource.html
- https://cesium.com/learn/cesiumjs/ref-doc/Camera.html

Exceções preexistentes do template: guardRasterTileIntersections altera o método privado _createTileImagerySkeletons; o helper de clipping possui acesso a internals e guardas específicos de 1.146; o tratamento de tiles observa requestImage por wrapper. Essas implementações foram preservadas, sem novo uso de internals. O clipping permanece inativo. A remoção/substituição dessas exceções exige discussão e validação visual compatível com as restrições do projeto; não foram reescritas nesta entrega.

O template fornecido não tinha GPS nem escala cartográfica. Foi reutilizado integralmente o hook useGeolocation de Fazenda Café, junto dos controles correspondentes, mantendo watchPosition, marker/círculo reutilizados, primeira recentralização, atualizações sem seguir a câmera e nova recentralização ao tocar GPS. Nenhuma localização é persistida. Foi acrescentada escala aproximada no centro do mapa com APIs públicas, atualização limitada e limpeza do listener. Nenhum framework ou biblioteca externa foi adicionado.

## 25. Validação visual pendente

Ainda precisam de validação do usuário: enquadramento inicial/Home; aparência real das legendas embutidas; contraste/espessuras das linhas; preenchimentos e contornos; popups com dados remotos; responsividade do painel e subtítulos; GPS em dispositivo real; escala no desktop/mobile; modelo 3D com token próprio; estabilidade dos tiles periféricos. Estes comportamentos não foram testados em navegador nesta sessão, conforme solicitado.
