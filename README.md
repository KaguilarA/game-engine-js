# 2D Engine

A browser-based 2D game engine written in TypeScript and built on Canvas 2D. The engine's public code is organized under `src/engine` and exported from `src/engine/index.ts`.

## Composition

- **Core (`core/`)**: `GameContext` manages the canvas and game-area dimensions. `BaseGame` centralizes lifecycle, updates, pause, restart, shared controls, and cleanup. This module also provides dimensions, physics, collision detection, health, and math utilities.
- **Scene (`scene/`)**: `WorldScene` coordinates the camera and layers; `Camera2D` transforms between world and screen coordinates, follows targets, and supports zoom; `SceneLayer` controls visibility, draw order, parallax, and stable rendering; `Tilemap` renders maps from a tileset; `Container` organizes UI elements.
- **Entities (`entities/`)**: `Entity` combines components with a transform; `Component` defines a functional unit's lifecycle; `SpriteRendererComponent` connects an entity to a drawable; `Prefab` and `PrefabRegistry` create and register reusable configurations. The module also includes entities for common use cases.
- **Assets (`assets/`)**: `GameLoader` loads and caches images, audio, and atlases; `AtlasParser`, `Atlas`, and `AtlasAnimationCatalog` handle regions and animations.
- **Animation (`animations/`)**: atlas-based animated sprites and the Spine runtime and renderer.
- **Rendering (`rendering/`)**: textures, canvas icons, and backgrounds.
- **Input (`input/`)**: keyboard and pointer events, shared controls, and touch controls.
- **UI (`ui/`)**: labels, numeric labels, and buttons.
- **Slots (`slots/`)**: reusable primitives for reels, symbols, icons, and reel animation.
- **Interfaces (`interfaces/`)**: contracts and types shared across engine modules.

## Design rules

1. **`reactive-values`**: observable, mutable engine state uses signals (`SignalValue`) and derived values instead of duplicating reactive state in plain fields.
2. **Abstraction always**: each module provides a clear responsibility and interface; higher-level modules depend on engine contracts instead of duplicating low-level details.
3. **SOLID SINGLETON**: follow SOLID principles and keep shared global engine services—such as `GameContext`, `GameLoader`, and `GameEvents`—as singletons. Objects whose state belongs to a scene or game remain scoped to that scene or game.

## Importing the engine

Engine modules can be imported from the public entry point:

```ts
import {
  BaseGame,
  GameContext,
  GameLoader,
  Camera2D,
  WorldScene,
  SceneLayer,
  Tilemap,
  Entity,
  Component,
  Prefab
} from './engine';
```

Specialized games extend `BaseGame` and implement their update, drawing, restart, and end-state behavior. They can compose their worlds from the engine's scenes, layers, entities, and components.
