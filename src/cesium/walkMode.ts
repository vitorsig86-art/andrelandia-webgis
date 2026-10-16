import {
  Cartesian2,
  Cartesian3,
  Cartographic,
  Color,
  ConstantPositionProperty,
  ConstantProperty,
  HeadingPitchRoll,
  Math as CesiumMath,
  Matrix4,
  Model,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Transforms,
  type Cesium3DTileset,
  type ScreenSpaceCameraController,
  type Viewer,
} from "cesium";

const HOMEM_MAPA_URL = "/models/homem-mapa.glb";

const WALK_MODE_CONFIG = {
  // The GLB origin is at the base of its 1.5 m Y-up mesh. This keeps the
  // character visibly floating above the photogrammetric surface.
  avatarHoverHeight: 0.4,
  avatarScale: 1,
  // Cesium converts glTF Y-up/+Z-forward content to Z-up/+X-forward. Its
  // heading starts at local east, while the camera heading starts at north.
  modelHeadingOffset: -CesiumMath.PI_OVER_TWO,
  fallbackAvatarCenterOffset: 0.25,
  cameraDistance: 5,
  cameraHeight: 2.5,
  cameraLookAtHeight: 1.15,
  // Keep the camera just above photogrammetric surfaces when its standard
  // trailing position would enter them. This is not retained between frames.
  cameraSurfaceClearance: 0.4,
  cameraRecoverySpeed: 8,
  idleBobAmplitude: 0.03,
  movingBobAmplitude: 0.05,
  idleBobFrequency: 0.65,
  movingBobFrequency: 1.35,
} as const;

const WALK_SPEED = 3.2;
const FAST_WALK_SPEED = 5;
const LOOK_SENSITIVITY = 0.005;
const HEIGHT_SAMPLE_INTERVAL_MS = 50;

interface CameraControlState {
  enableInputs: boolean;
  enableRotate: boolean;
  enableTranslate: boolean;
  enableZoom: boolean;
  enableTilt: boolean;
  enableLook: boolean;
  enableCollisionDetection: boolean;
}

export interface WalkModeSession {
  dispose(): void;
}

export interface WalkModeOptions {
  onExit(): void;
  onAvatarFallback?(): void;
}

interface SurfacePosition {
  cartographic: Cartographic;
  height: number;
}

function readCameraControls(controller: ScreenSpaceCameraController): CameraControlState {
  return {
    enableInputs: controller.enableInputs,
    enableRotate: controller.enableRotate,
    enableTranslate: controller.enableTranslate,
    enableZoom: controller.enableZoom,
    enableTilt: controller.enableTilt,
    enableLook: controller.enableLook,
    enableCollisionDetection: controller.enableCollisionDetection,
  };
}

function restoreCameraControls(controller: ScreenSpaceCameraController, state: CameraControlState): void {
  controller.enableInputs = state.enableInputs;
  controller.enableRotate = state.enableRotate;
  controller.enableTranslate = state.enableTranslate;
  controller.enableZoom = state.enableZoom;
  controller.enableTilt = state.enableTilt;
  controller.enableLook = state.enableLook;
  controller.enableCollisionDetection = state.enableCollisionDetection;
}

function getTilesetHeight(tileset: Cesium3DTileset, cartographic: Cartographic, viewer: Viewer): number | undefined {
  if (tileset.isDestroyed() || viewer.isDestroyed() || !tileset.show) return undefined;
  const height = tileset.getHeight(cartographic, viewer.scene);
  return Number.isFinite(height) ? height : undefined;
}

function findStartingSurface(viewer: Viewer, tileset: Cesium3DTileset): SurfacePosition | undefined {
  const { canvas, scene } = viewer;
  const ellipsoid = scene.globe.ellipsoid;
  const samples = [
    [0.5, 0.5],
    [0.35, 0.5],
    [0.65, 0.5],
    [0.5, 0.35],
    [0.5, 0.65],
  ];

  if (scene.pickPositionSupported) {
    for (const [x, y] of samples) {
      const position = scene.pickPosition(new Cartesian2(canvas.clientWidth * x, canvas.clientHeight * y));
      if (!position) continue;
      const cartographic = Cartographic.fromCartesian(position, ellipsoid);
      if (!cartographic) continue;
      const height = getTilesetHeight(tileset, cartographic, viewer);
      if (height !== undefined) return { cartographic, height };
    }
  }

  const cartographic = Cartographic.fromCartesian(tileset.boundingSphere.center, ellipsoid);
  if (!cartographic) return undefined;
  const height = getTilesetHeight(tileset, cartographic, viewer);
  return height === undefined ? undefined : { cartographic, height };
}

function positionAboveSurface(surface: SurfacePosition): Cartesian3 {
  return Cartesian3.fromRadians(
    surface.cartographic.longitude,
    surface.cartographic.latitude,
    surface.height + WALK_MODE_CONFIG.avatarHoverHeight,
  );
}

function offsetAbovePosition(position: Cartesian3, height: number): Cartesian3 {
  const enu = Transforms.eastNorthUpToFixedFrame(position);
  return Matrix4.multiplyByPoint(enu, new Cartesian3(0, 0, height), new Cartesian3());
}

function setAvatarPose(positionProperty: ConstantPositionProperty, orientationProperty: ConstantProperty, position: Cartesian3, heading: number): void {
  positionProperty.setValue(position);
  orientationProperty.setValue(Transforms.headingPitchRollQuaternion(position, new HeadingPitchRoll(heading, 0, 0)));
}

/**
 * Creates a disposable desktop-only third-person controller. The surface query
 * is scoped to the supplied tileset so walking never falls back to the MDT or
 * globe when photogrammetric mesh data is unavailable.
 */
export function createWalkMode(viewer: Viewer, tileset: Cesium3DTileset, options: WalkModeOptions): WalkModeSession {
  if (viewer.isDestroyed() || tileset.isDestroyed() || !tileset.show) {
    throw new Error("O Modelo 3D precisa estar ativo para iniciar a caminhada.");
  }

  const startingSurface = findStartingSurface(viewer, tileset);
  if (!startingSurface) {
    throw new Error("Posicione a câmera sobre uma parte já renderizada do Modelo 3D para iniciar a caminhada.");
  }

  const controller = viewer.scene.screenSpaceCameraController;
  const savedControls = readCameraControls(controller);
  const pressedKeys = new Set<string>();
  let heading = Number.isFinite(viewer.camera.heading) ? viewer.camera.heading : 0;
  let pitch = Math.atan2(
    WALK_MODE_CONFIG.cameraLookAtHeight - WALK_MODE_CONFIG.cameraHeight,
    WALK_MODE_CONFIG.cameraDistance,
  );
  let currentPosition = positionAboveSurface(startingSurface);
  let renderedAvatarPosition = currentPosition;
  let lastHeightSampleAt = performance.now();
  let lastSuccessfulMoveAt = -Infinity;
  let cameraSurfaceLift = 0;
  let targetCameraSurfaceLift = 0;
  let lastCameraUpdateAt = performance.now();
  let lastCameraSurfaceSampleAt = -Infinity;
  let looking = false;
  let frameId: number | undefined;
  let disposed = false;
  let homemMapa: Model | undefined;
  let fallbackActive = true;

  const fallbackPosition = new ConstantPositionProperty(
    offsetAbovePosition(currentPosition, WALK_MODE_CONFIG.fallbackAvatarCenterOffset),
  );
  const fallbackOrientation = new ConstantProperty(
    Transforms.headingPitchRollQuaternion(currentPosition, new HeadingPitchRoll(heading, 0, 0)),
  );
  const fallbackAvatar = viewer.entities.add({
    name: "Avatar provisório do Caminhar",
    position: fallbackPosition,
    orientation: fallbackOrientation,
    box: {
      // Visible while the GLB loads and retained only if it cannot be loaded.
      dimensions: new Cartesian3(0.45, 0.75, 0.5),
      material: Color.CYAN.withAlpha(0.95),
      outline: true,
      outlineColor: Color.WHITE,
    },
  });

  const handler = new ScreenSpaceEventHandler(viewer.canvas);

  function clearInputState(): void {
    looking = false;
    pressedKeys.clear();
  }

  function eventTargetsEditableElement(event: KeyboardEvent): boolean {
    const { target } = event;
    return target instanceof HTMLElement && (
      target.isContentEditable ||
      target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']") !== null
    );
  }

  function hasMovementInput(): boolean {
    return ["KeyW", "KeyA", "KeyS", "KeyD"].some((key) => pressedKeys.has(key));
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (eventTargetsEditableElement(event)) return;
    if (event.code === "Escape") {
      event.preventDefault();
      options.onExit();
      return;
    }
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(event.code)) {
      pressedKeys.add(event.code);
      event.preventDefault();
    }
  }

  function onKeyUp(event: KeyboardEvent): void {
    if (eventTargetsEditableElement(event)) return;
    if (["KeyW", "KeyA", "KeyS", "KeyD", "ShiftLeft", "ShiftRight"].includes(event.code)) {
      pressedKeys.delete(event.code);
      event.preventDefault();
    }
  }

  function updateAvatarPose(timestamp: number): void {
    const moving = hasMovementInput() && timestamp - lastSuccessfulMoveAt <= HEIGHT_SAMPLE_INTERVAL_MS * 2;
    const amplitude = moving ? WALK_MODE_CONFIG.movingBobAmplitude : WALK_MODE_CONFIG.idleBobAmplitude;
    const frequency = moving ? WALK_MODE_CONFIG.movingBobFrequency : WALK_MODE_CONFIG.idleBobFrequency;
    const bobOffset = Math.sin(timestamp / 1000 * CesiumMath.TWO_PI * frequency) * amplitude;
    renderedAvatarPosition = offsetAbovePosition(currentPosition, bobOffset);

    if (fallbackActive) {
      setAvatarPose(
        fallbackPosition,
        fallbackOrientation,
        offsetAbovePosition(renderedAvatarPosition, WALK_MODE_CONFIG.fallbackAvatarCenterOffset),
        heading,
      );
    }

    if (!homemMapa) return;
    homemMapa.modelMatrix = Transforms.headingPitchRollToFixedFrame(
      renderedAvatarPosition,
      new HeadingPitchRoll(heading + WALK_MODE_CONFIG.modelHeadingOffset, 0, 0),
    );
  }

  function getCameraSurfaceLift(destination: Cartesian3): number {
    const cartographic = Cartographic.fromCartesian(destination, viewer.scene.globe.ellipsoid);
    if (!cartographic) return 0;
    const surfaceHeight = getTilesetHeight(tileset, cartographic, viewer);
    if (surfaceHeight === undefined) return 0;
    return Math.max(0, surfaceHeight + WALK_MODE_CONFIG.cameraSurfaceClearance - cartographic.height);
  }

  function updateCamera(timestamp: number): void {
    if (viewer.isDestroyed()) return;
    const forwardEast = Math.sin(heading);
    const forwardNorth = Math.cos(heading);
    const enu = Transforms.eastNorthUpToFixedFrame(renderedAvatarPosition);
    const standardDestination = Matrix4.multiplyByPoint(
      enu,
      new Cartesian3(
        -forwardEast * WALK_MODE_CONFIG.cameraDistance,
        -forwardNorth * WALK_MODE_CONFIG.cameraDistance,
        WALK_MODE_CONFIG.cameraHeight,
      ),
      new Cartesian3(),
    );
    // getHeight performs a mesh ray query. Sampling at the same 20 Hz cadence
    // as avatar surface tracking keeps the render loop responsive.
    if (timestamp - lastCameraSurfaceSampleAt >= HEIGHT_SAMPLE_INTERVAL_MS) {
      targetCameraSurfaceLift = getCameraSurfaceLift(standardDestination);
      lastCameraSurfaceSampleAt = timestamp;
    }
    const elapsedSeconds = Math.min(Math.max(0, timestamp - lastCameraUpdateAt) / 1000, 0.1);
    lastCameraUpdateAt = timestamp;
    // Raise immediately to avoid entering the mesh; only recovery is eased.
    cameraSurfaceLift = targetCameraSurfaceLift >= cameraSurfaceLift
      ? targetCameraSurfaceLift
      : Math.max(targetCameraSurfaceLift, cameraSurfaceLift - WALK_MODE_CONFIG.cameraRecoverySpeed * elapsedSeconds);
    const destination = Matrix4.multiplyByPoint(
      enu,
      new Cartesian3(
        -forwardEast * WALK_MODE_CONFIG.cameraDistance,
        -forwardNorth * WALK_MODE_CONFIG.cameraDistance,
        WALK_MODE_CONFIG.cameraHeight + cameraSurfaceLift,
      ),
      new Cartesian3(),
    );
    viewer.camera.setView({
      destination,
      orientation: { heading, pitch, roll: 0 },
    });
  }

  function attemptMove(timestamp: number): void {
    if (timestamp - lastHeightSampleAt < HEIGHT_SAMPLE_INTERVAL_MS) return;
    const elapsedSeconds = Math.min((timestamp - lastHeightSampleAt) / 1000, 0.1);
    let forward = 0;
    let strafe = 0;
    if (pressedKeys.has("KeyW")) forward += 1;
    if (pressedKeys.has("KeyS")) forward -= 1;
    if (pressedKeys.has("KeyD")) strafe += 1;
    if (pressedKeys.has("KeyA")) strafe -= 1;
    if (forward === 0 && strafe === 0) return;

    lastHeightSampleAt = timestamp;
    const magnitude = Math.hypot(forward, strafe);
    const speed = pressedKeys.has("ShiftLeft") || pressedKeys.has("ShiftRight") ? FAST_WALK_SPEED : WALK_SPEED;
    const distance = speed * elapsedSeconds;
    const forwardEast = Math.sin(heading);
    const forwardNorth = Math.cos(heading);
    const rightEast = Math.cos(heading);
    const rightNorth = -Math.sin(heading);
    const localOffset = new Cartesian3(
      (forwardEast * forward + rightEast * strafe) / magnitude * distance,
      (forwardNorth * forward + rightNorth * strafe) / magnitude * distance,
      0,
    );
    const enu = Transforms.eastNorthUpToFixedFrame(currentPosition);
    const candidate = Matrix4.multiplyByPoint(enu, localOffset, new Cartesian3());
    const cartographic = Cartographic.fromCartesian(candidate, viewer.scene.globe.ellipsoid);
    if (!cartographic) return;
    const height = getTilesetHeight(tileset, cartographic, viewer);
    // Do not estimate a fallback height: leaving the loaded photogrammetric mesh stops movement.
    if (height === undefined) return;

    currentPosition = positionAboveSurface({ cartographic, height });
    lastSuccessfulMoveAt = timestamp;
  }

  function animate(timestamp: number): void {
    if (disposed || viewer.isDestroyed() || tileset.isDestroyed() || !tileset.show) {
      if (!disposed) {
        dispose();
        options.onExit();
      }
      return;
    }
    attemptMove(timestamp);
    updateAvatarPose(timestamp);
    updateCamera(timestamp);
    viewer.scene.requestRender();
    frameId = window.requestAnimationFrame(animate);
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    if (frameId !== undefined) window.cancelAnimationFrame(frameId);
    handler.destroy();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", clearInputState);
    if (!viewer.isDestroyed()) {
      if (fallbackActive) viewer.entities.remove(fallbackAvatar);
      if (homemMapa) {
        const removed = viewer.scene.primitives.remove(homemMapa);
        if (!removed && !homemMapa.isDestroyed()) homemMapa.destroy();
        homemMapa = undefined;
      }
      restoreCameraControls(controller, savedControls);
      viewer.scene.requestRender();
    }
  }

  handler.setInputAction(() => {
    looking = true;
  }, ScreenSpaceEventType.LEFT_DOWN);
  handler.setInputAction((movement: ScreenSpaceEventHandler.MotionEvent) => {
    if (!looking) return;
    const deltaX = movement.endPosition.x - movement.startPosition.x;
    const deltaY = movement.endPosition.y - movement.startPosition.y;
    heading = CesiumMath.zeroToTwoPi(heading + deltaX * LOOK_SENSITIVITY);
    pitch = CesiumMath.clamp(pitch - deltaY * LOOK_SENSITIVITY, -1.15, -0.18);
    updateAvatarPose(performance.now());
  }, ScreenSpaceEventType.MOUSE_MOVE);
  handler.setInputAction(() => {
    looking = false;
  }, ScreenSpaceEventType.LEFT_UP);

  viewer.camera.cancelFlight();
  controller.enableInputs = false;
  // We set an absolute camera destination each frame. Do not let the default
  // controller overwrite it with an unrelated terrain/tileset collision.
  controller.enableCollisionDetection = false;
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", clearInputState);
  updateAvatarPose(performance.now());
  updateCamera(performance.now());
  viewer.scene.requestRender();
  frameId = window.requestAnimationFrame(animate);

  void Model.fromGltfAsync({
    url: HOMEM_MAPA_URL,
    modelMatrix: Transforms.headingPitchRollToFixedFrame(
      renderedAvatarPosition,
      new HeadingPitchRoll(heading + WALK_MODE_CONFIG.modelHeadingOffset, 0, 0),
    ),
    scale: WALK_MODE_CONFIG.avatarScale,
    allowPicking: false,
    incrementallyLoadTextures: false,
  }).then((model) => {
    if (disposed || viewer.isDestroyed()) {
      model.destroy();
      return;
    }
    homemMapa = model;
    viewer.scene.primitives.add(model);
    viewer.entities.remove(fallbackAvatar);
    fallbackActive = false;
    updateAvatarPose(performance.now());
    viewer.scene.requestRender();
  }).catch(() => {
    if (!disposed) options.onAvatarFallback?.();
  });

  return { dispose };
}
