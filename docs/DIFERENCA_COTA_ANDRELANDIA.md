# Diferença de cota — Andrelândia

Alteração exclusivamente neste checkout; ferramenta, botão, painel, câmera e camadas existentes preservados. Sem mudanças de dependências, configurações de propriedades, template original ou Fazenda Mel. Sem commit ou deploy.

## Arquivos e APIs

- src/cesium/measurementUtils.ts: cálculos, captura com origem e formatação.
- src/cesium/measurementGraphics.ts: componentes geométricas, arco e etiquetas.
- src/hooks/useMeasurements.ts: captura A/B, consistência e limpeza.
- src/components/MeasurementToolbar.tsx: metodologia no painel existente.
- scripts/check-measurements.cjs: regressões sintéticas.

Cesium declarado ^1.145.0; lockfile e instalação: 1.146.0. Compatibilidade verificada nos tipos instalados para pickPositionSupported, pickPosition, drillPick, Cesium3DTileFeature.tileset, Cesium3DTileset, Transforms, Matrix4, ArcType.NONE, PolylineDashMaterialProperty, SceneTransforms.worldToWindowCoordinates e Scene.postRender. Referências oficiais: [Scene](https://cesium.com/learn/cesiumjs/ref-doc/Scene.html#pickPosition), [Transforms](https://cesium.com/learn/cesiumjs/ref-doc/Transforms.html#eastNorthUpToFixedFrame). Sem APIs experimentais ou internals.

## Cálculos

A/B são Cartesian3 ECEF em metros. As cotas usam Cartographic.fromCartesian(A/B).height em WGS84. ΔZ = hB − hA.

Construímos os eixos ENU (leste/norte/cima) na projeção geodética WGS84 do ponto médio espacial M = (A+B)/2; transladamos a origem do referencial para M. O vetor B−A nesse referencial tem componentes E, N, U.

- Horizontal H = hypot(E,N), aproximação local no plano ENU na elevação média.
- Espacial D = Cartesian3.distance(A,B), distância euclidiana ECEF. D² = H² + U².
- Inclinação local α = atan2(U,H), em graus.
- Declividade média = 100 × ΔZ/H, com sinal de B−A.

Limite: 10 km de distância espacial, para delimitar o uso da aproximação local. Isso não constitui garantia de precisão topográfica. H não é a distância geodésica sobre o elipsoide: inclui a escala da elevação média relativamente ao elipsoide. D não acompanha o relevo.

U e ΔZ podem diferir por geometria do elipsoide: a inclinação usa a componente geométrica U, enquanto a declividade usa a diferença de cotas solicitada. Se |U−ΔZ| ≥ 0,005 m, a etiqueta vertical mostra também V local.

Para H < 1 mm, declividade indefinida; em segmento vertical, α aproxima ±90°; em pontos coincidentes, α indefinida. A proteção existente contra vértices a menos de 1 mm permanece. Novos resultados usam pt-BR e duas casas decimais, em metros, graus e porcentagem.

## Gráficos e ciclo de vida

Canto C local = (B.E, B.N, A.U). A−C é horizontal e C−B vertical no mesmo referencial; ambas tracejadas. A−B é sólida; linhas usam ArcType.NONE sem clamping. O arco está no plano local do segmento.

As etiquetas ficam ancoradas no mundo. Após renderização, apenas deslocamentos em pixels são ajustados para evitar colisões; a geometria/câmera permanece fixa. O listener postRender é removido no cleanup e só solicita render adicional quando um deslocamento muda.

Cancelar, limpar, trocar de ferramenta ou começar outra medição de cota remove o diagrama completo da última medição de cota e seus rascunhos, incluindo etiquetas/arco. Medições concluídas das outras ferramentas mantêm o comportamento anterior.

## Origem e referência vertical

O modelo atual usa IonResource.fromAssetId(5900038) e Cesium3DTileset.fromUrl, com recorte configurado no projeto. O carregamento não foi alterado.

A captura usa drillPick no pixel exato, excluindo entidades de medição. Em tileset com profundidade suportada, preserva scene.pickPosition. Se há objeto selecionado sem posição de profundidade válida, rejeita a captura: não substitui pelo terreno sob o objeto. O fallback por raio/globe.pick ocorre apenas sem objeto selecionado, com globo visível.

A origem A/B fica vinculada à posição capturada e aparece no painel: modelo 3D Tiles, superfície da cena, terreno ou globo elipsoidal; profundidade ou fallback por raio. A/B devem compartilhar a mesma superfície identificada (mesmo tileset, primitiva ou globo). Troca entre modelo e terreno exige reinício.

createViewer.ts não instala terreno altimétrico: usa o provedor padrão EllipsoidTerrainProvider. Nesse caso o painel identifica globo elipsoidal, sem terreno. Rasters MDT/MDS são imagens, sem fornecer elevação à geometria.

As cotas são alturas calculadas relativamente ao WGS84 da cena, sem conversão de geóide. Datum vertical original e aquisição do modelo não estão documentados na configuração inspecionada. Não se afirma altitude ortométrica ou precisão de levantamento. Transformações visuais do modelo afetam a superfície medida e não corrigem datum.

## Validação — 13/10/2026

- npm.cmd ci: aprovado, 0 vulnerabilidades; lockfile preservado.
- npm.cmd run build: aprovado; inclui typecheck da aplicação e configuração Vite.
- check-measurements.cjs: aprovado. Desníveis positivos/negativos, cotas iguais, trechos verticais/horizontais muito pequenos, triângulo ortogonal, distância ECEF, comparação horizontal com geodésica em trecho local, formatação, profundidade/fallback, rejeição de fallback sob modelo, colisões de etiquetas, geometria fixa após reposicionamento, cancelamento/limpeza/listeners e regressões das outras ferramentas. Matemática/gráficos usam Cesium real; cena/eventos são simulados.
- check-raster-lifecycle.cjs e check-template-v2.cjs: aprovados.
- npm.cmd run check: falha em check-projects.cjs, que exige template genérico como projeto ativo; o checkout usa Andrelândia. check-workspace.cjs também falha por expectativas antigas de ordem/grupos do painel. Esses scripts e configurações correspondentes não foram modificados.
- Validação visual desktop/mobile e captura no asset real: deixadas para o usuário a seu pedido. Não foi concluída validação real de profundidade/CORS nesta sessão. CSS responsiva existente preservada.

Validação visual sugerida: ativar Modelo 3D e aguardar carregamento; medir A/B, conferir origens, girar/zoomar câmera, cancelar/limpar e iniciar outra medição. Repetir em mobile e com outras ferramentas. Sem modelo ou terreno altimétrico, conferir indicação de globo elipsoidal. Terreno altimétrico verdadeiro depende de provedor configurado e não foi adicionado nesta tarefa.
