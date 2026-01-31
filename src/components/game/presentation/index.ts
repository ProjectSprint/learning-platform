/**
 * Presentation layer components.
 * UI components for rendering game elements (spaces, entities, interactions).
 *
 * This layer is responsible for:
 * - Rendering spaces (grid, pool, queue, path)
 * - Rendering entities (cards, placed entities)
 * - Managing user interactions (drag & drop)
 *
 * Components in this layer are presentational - they receive data via props
 * and communicate via callbacks. They should not contain business logic.
 */

// Entity components
export * from "./entity";
// Interaction components
export * from "./interaction/drag";
// Space components
export * from "./space";
