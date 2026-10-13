// Run with node scripts/check-measurements.cjs. No browser or external assets required.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const cesium = require("cesium");

function load(relativePath, dependencies, globals = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => dependencies[name], ...globals });
  return exports;
}
const utils = load("src/cesium/measurementUtils.ts", { cesium });
let projected = new cesium.Cartesian2(100, 100);
const graphics = load("src/cesium/measurementGraphics.ts", {
  cesium: { ...cesium, SceneTransforms: { worldToWindowCoordinates: () => projected } },
  "./measurementUtils": utils,
});

assert.equal(utils.distance3D([new cesium.Cartesian3(0, 0, 0), new cesium.Cartesian3(3, 4, 0), new cesium.Cartesian3(3, 4, 12)]), 17);
assert.equal(utils.formatDistance(999), "999.00 m");
assert.equal(utils.formatDistance(1000), "1.000 km");
assert.match(utils.formatArea(10000), /^1.0000 ha \(10000.00 m²\)$/);
const at = (x, y, height = 0, longitude = 0) => cesium.Cartesian3.fromDegrees(longitude + x / 111319.490793, y / 110574.275822, height);
const square = [at(0, 0), at(100, 0), at(100, 100), at(0, 100)];
const area = utils.geographicArea(square);
assert.ok(Math.abs(area - 10000) < 1, `100 m square: ${area}`);
assert.ok(Math.abs(utils.geographicArea([...square].reverse()) - area) < 0.001);
assert.ok(Math.abs(utils.geographicArea([...square, square[0]]) - area) < 0.001);
assert.ok(Math.abs(utils.geographicArea(square.map((point) => {
  const c = cesium.Cartographic.fromCartesian(point);
  return cesium.Cartesian3.fromRadians(c.longitude, c.latitude, 900);
})) - area) < 0.001, "Area must ignore relief/altitudes");
const concave = [at(0, 0), at(100, 0), at(100, 50), at(50, 50), at(50, 100), at(0, 100)];
assert.ok(Math.abs(utils.geographicArea(concave) - 7500) < 1);
assert.ok(Math.abs(utils.geographicArea([at(0, 0, 0, 179.9995), at(100, 0, 0, 179.9995), at(100, 100, 0, 179.9995), at(0, 100, 0, 179.9995)]) - 10000) < 1);
assert.throws(() => utils.geographicArea([square[0], square[2], square[1], square[3]]), /cruzar/);
assert.throws(() => utils.geographicArea([at(0, 0), at(200000, 0), at(0, 100)]), /100 km/);
const heights = utils.elevationDifference([at(0, 0, 150), at(100, 0, 125)]);
assert.ok(Math.abs(heights.delta + 25) < 1e-6);
assert.match(utils.measurementText("coordinates", [cesium.Cartesian3.fromDegrees(-44.7952463, -21.8294233, 1555.15)]), /Latitude: -21.8294233°\nLongitude: -44.7952463°\nAltitude: 1555.15 m/);

const depth = at(10, 10, 500);
const ground = at(10, 10, 100);
const pickingViewer = {
  isDestroyed: () => false,
  camera: { getPickRay: () => ({}), pickEllipsoid: () => { throw new Error("Ellipsoid must not be used"); } },
  scene: { pickPositionSupported: true, pickPosition: () => depth, globe: { show: true, pick: () => ground } },
};
assert.ok(cesium.Cartesian3.equals(utils.pickMeasurementPosition(pickingViewer, new cesium.Cartesian2()), depth));
pickingViewer.scene.pickPosition = () => { throw new Error("Depth unavailable"); };
assert.ok(cesium.Cartesian3.equals(utils.pickMeasurementPosition(pickingViewer, new cesium.Cartesian2()), ground));
pickingViewer.scene.pickPosition = () => new cesium.Cartesian3(NaN, 0, 0);
assert.ok(cesium.Cartesian3.equals(utils.pickMeasurementPosition(pickingViewer, new cesium.Cartesian2()), ground));
pickingViewer.scene.globe.pick = () => undefined;
assert.equal(utils.pickMeasurementPosition(pickingViewer, new cesium.Cartesian2()), undefined);


// Decomposition is an orthogonal local triangle, while ΔZ is the WGS84 height difference.
const pair = [cesium.Cartesian3.fromDegrees(-44.31, -21.84, 1100), cesium.Cartesian3.fromDegrees(-44.309, -21.84, 1125)];
const measure = utils.decomposedHeight(pair);
assert.ok(Math.abs(measure.delta - 25) < 1e-6);
assert.ok(Math.abs(measure.horizontal - new cesium.EllipsoidGeodesic(...pair.map(p => cesium.Cartographic.fromCartesian(p))).surfaceDistance) < 0.1);
assert.ok(Math.abs(Math.hypot(measure.horizontal, measure.verticalLocal) - measure.spatial) < 1e-6);
assert.ok(Math.abs(cesium.Cartesian3.distance(pair[0], measure.corner) - measure.horizontal) < 1e-6);
assert.ok(Math.abs(cesium.Cartesian3.distance(measure.corner, pair[1]) - Math.abs(measure.verticalLocal)) < 1e-6);
assert.ok(Math.abs(measure.slope - 100 * 25 / measure.horizontal) < 1e-6);
assert.ok(Math.abs(measure.angle - Math.atan2(measure.verticalLocal, measure.horizontal) * 180 / Math.PI) < 1e-9);
const reverse = utils.decomposedHeight([...pair].reverse());
assert.ok(Math.abs(reverse.angle + measure.angle) < 1e-7);
assert.ok(Math.abs(reverse.slope + measure.slope) < 1e-6);
const equal = utils.decomposedHeight([pair[0], cesium.Cartesian3.fromDegrees(-44.309, -21.84, 1100)]);
assert.ok(Math.abs(equal.delta) < 1e-6); assert.ok(Math.abs(equal.angle) < 1e-6);
const vertical = utils.decomposedHeight([pair[0], cesium.Cartesian3.fromDegrees(-44.31, -21.84, 1125)]);
assert.equal(vertical.slope, null); assert.ok(Math.abs(vertical.angle - 90) < 1e-6);
assert.equal(utils.decomposedHeight([pair[0], pair[0]]).angle, null);
const tiny = utils.decomposedHeight([at(0, 0, 100), at(0.0001, 0, 101)]);
assert.equal(tiny.slope, null); assert.ok(Number.isFinite(tiny.angle));
assert.throws(() => utils.decomposedHeight([at(0, 0), at(11000, 0)]), /10 km/);
assert.match(utils.measurementText("height", pair), /ΔZ \(B − A\): 25,00 m/);
assert.match(utils.measurementText("height", pair), /Distância horizontal:/);
assert.equal(utils.formatHeightNumber(1234.5), "1.234,50");
const heightSource = new cesium.CustomDataSource("height-test");
const drawn = graphics.drawMeasurement(heightSource, "height", pair, "");
const now = cesium.JulianDate.now();
const lines = drawn.filter(e => e.polyline);
assert.equal(lines.filter(e => e.polyline.material instanceof cesium.PolylineDashMaterialProperty).length, 2);
assert.equal(lines.length, 4, "Solid AB, two dashed components and inclination arc");
assert.ok(lines.every(e => e.polyline.arcType.getValue(now) === cesium.ArcType.NONE));
assert.equal(graphics.layoutHeightLabels(heightSource, {}), true);
const offsets = drawn.filter(e => e.label).map(e => e.label.pixelOffset.getValue(now).y);
assert.equal(new Set(offsets).size, offsets.length, "Labels stay separate even when all anchors project to one pixel");
assert.equal(graphics.layoutHeightLabels(heightSource, {}), false, "No requestRender loop");
projected = new cesium.Cartesian2(200, 300);
graphics.layoutHeightLabels(heightSource, {});
assert.ok(cesium.Cartesian3.equals(lines[0].polyline.positions.getValue(now)[0], pair[0]), "Camera layout never moves geometry");
drawn.forEach(e => heightSource.entities.remove(e)); assert.equal(heightSource.entities.values.length, 0);

const excluded = new cesium.EntityCollection();
const model = Object.create(cesium.Cesium3DTileset.prototype);
let hits = [{ primitive: model }];
let terrainCalls = 0;
const heightViewer = {
  isDestroyed: () => false, camera: { getPickRay: () => ({}) },
  scene: { drillPick: () => hits, pickPositionSupported: true, pickPosition: () => depth,
    globe: { show: true, pick: () => { terrainCalls++; return ground; } } },
};
const pickedModel = utils.pickHeightPosition(heightViewer, new cesium.Cartesian2(), excluded);
assert.ok(cesium.Cartesian3.equals(pickedModel, depth));
heightViewer.scene.pickPosition = () => undefined;
assert.equal(utils.pickHeightPosition(heightViewer, new cesium.Cartesian2(), excluded), undefined);
assert.equal(terrainCalls, 0, "No terrain substitution under a picked model");
heightViewer.scene.pickPositionSupported = false;
assert.equal(utils.pickHeightPosition(heightViewer, new cesium.Cartesian2(), excluded), undefined);
hits = [];
const pickedTerrain = utils.pickHeightPosition(heightViewer, new cesium.Cartesian2(), excluded);
assert.ok(cesium.Cartesian3.equals(pickedTerrain, ground));
assert.equal(utils.sameHeightSurface(pickedModel, pickedTerrain), false);
assert.match(utils.measurementText("height", [pickedTerrain]), /fallback por raio/);
assert.match(utils.measurementText("height", [pickedModel]), /Modelo 3D Tiles/);
heightViewer.scene.globe.show = false;
assert.equal(utils.pickHeightPosition(heightViewer, new cesium.Cartesian2(), excluded), undefined);

class Element {}
class FakeHandler {
  static instances = [];
  constructor() { this.actions = new Map(); FakeHandler.instances.push(this); }
  setInputAction(action, type) { this.actions.set(type, action); }
  getInputAction(type) { return this.actions.get(type); }
  removeInputAction(type) { this.actions.delete(type); }
  destroy() { this.destroyed = true; this.actions.clear(); }
}
const listeners = new Map();
const timers = new Map();
let nextTimer = 0;
const flushTimers = () => { const queued = [...timers.values()]; timers.clear(); queued.forEach((callback) => callback()); };
let state, effect;
const react = {
  useState: (initial) => { state = initial; return [state, (value) => state = typeof value === "function" ? value(state) : value]; },
  useRef: (value) => ({ current: value }),
  useEffect: (callback) => effect = callback,
};
const { useMeasurements } = load("src/hooks/useMeasurements.ts", {
  react, cesium: { ...cesium, ScreenSpaceEventHandler: FakeHandler },
  "../cesium/measurementUtils": utils, "../cesium/measurementGraphics": graphics,
}, {
  document: { addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: (name) => listeners.delete(name) },
  HTMLElement: Element, HTMLInputElement: class {}, HTMLTextAreaElement: class {},
  performance: { now: () => 1000 },
  setTimeout: (callback) => { const id = ++nextTimer; timers.set(id, callback); return id; },
  clearTimeout: (id) => timers.delete(id),
});

async function main() {
  const canvas = new Element();
  const attributes = new Map();
  canvas.getAttribute = (key) => attributes.get(key) ?? null;
  canvas.setAttribute = (key, value) => attributes.set(key, value);
  canvas.removeAttribute = (key) => attributes.delete(key);
  canvas.focus = () => {};
  const defaults = new FakeHandler();
  const originalDoubleClick = () => {};
  defaults.setInputAction(originalDoubleClick, cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
  const dataSources = new cesium.DataSourceCollection();
  const project = new cesium.CustomDataSource("project-vector-layer");
  project.entities.add({ position: at(0, 0) });
  await dataSources.add(project);
  const viewer = {
    isDestroyed: () => false, canvas, dataSources, screenSpaceEventHandler: defaults,
    camera: { getPickRay: () => ({}) },
    scene: { postRender: new cesium.Event(), drillPick: () => [], requestRender() {}, pickPositionSupported: true, pickPosition: (screen) => at(screen.x, screen.y, 100 + screen.x), globe: { show: true, pick: () => undefined } },
  };
  const api = useMeasurements(viewer);
  const cleanup = effect();
  await new Promise(setImmediate);
  assert.equal(state.ready, true);
  const source = dataSources.get(1);
  const handler = FakeHandler.instances.at(-1);
  function click(x, y = 0) { handler.getInputAction(cesium.ScreenSpaceEventType.LEFT_CLICK)({ position: new cesium.Cartesian2(x, y) }); }
  function enter() { listeners.get("keydown")({ key: "Enter", target: canvas, preventDefault() {} }); }

  api.select("coordinates"); click(10);
  assert.equal(state.completed, 1);
  assert.match(state.result, /Altitude: 110.00 m/);
  const retainedCount = source.entities.values.length;
  api.select("distance"); click(0); flushTimers(); click(10); click(10);
  handler.getInputAction(cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK)({ position: new cesium.Cartesian2(10, 0) });
  assert.equal(state.completed, 2);
  assert.equal(source.entities.values.length - retainedCount, 4, "Two markers, one line, one label; no duplicate double-click vertex");
  assert.equal(timers.size, 0);
  click(20); click(30); enter(); assert.equal(state.completed, 3, "Enter commits pending clicks");
  api.select("height"); click(10); click(30);
  assert.equal(state.completed, 4); assert.match(state.result, /ΔZ \(B − A\): 20,00 m/);
  const heightCount = source.entities.values.length;
  api.select("area");
  assert.ok(source.entities.values.length < heightCount, "Starting another tool removes the complete height diagram");
  click(0, 0); click(100, 0); click(100, 100); click(0, 100); enter();
  assert.equal(state.completed, 4); assert.match(state.result, /Área horizontal:/);
  const finalizedCount = source.entities.values.length;
  api.select("distance"); click(40); flushTimers(); click(50);
  listeners.get("keydown")({ key: "Escape", target: canvas, preventDefault() {} });
  flushTimers(); assert.equal(state.active, null); assert.equal(state.completed, 4);
  assert.equal(source.entities.values.length, finalizedCount, "ESC removes only incomplete graphics");
  assert.equal(defaults.getInputAction(cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK), originalDoubleClick);
  api.clear(); assert.equal(source.entities.values.length, 0); assert.equal(state.completed, 0);
  assert.equal(project.entities.values.length, 1); assert.equal(dataSources.length, 2);
  assert.equal(viewer.scene.postRender.numberOfListeners, 1);
  api.select("height"); click(0); click(20);
  api.cancel(); assert.equal(source.entities.values.length, 0, "Cancel removes completed height components and labels");
  cleanup(); assert.equal(viewer.scene.postRender.numberOfListeners, 0); assert.equal(dataSources.length, 1); assert.equal(handler.destroyed, true);
  assert.equal(listeners.size, 0); assert.equal(timers.size, 0); assert.equal(attributes.has("tabindex"), false);
  useMeasurements(viewer); const disposeBeforeReady = effect(); disposeBeforeReady();
  await new Promise(setImmediate); assert.equal(dataSources.length, 1, "No late data source leak after early disposal");
  console.log("Measurements passed: 3D distances, geographic area/units/invalid polygons, coordinates, signed elevation difference, depth/fallback picking, double-click/Enter/ESC, isolated graphics, clear, and cleanup.");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
