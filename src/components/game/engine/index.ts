/**
 * Game engine layer exports.
 * Provides declarative components, hooks, and types for building game questions.
 */

/**
 * Presentation facade.
 * Keep route-level UI imports on the engine root entrypoint.
 */
export * from "../internal/presentation/drawer";
export {
	PlacedEntity,
	type PlacedEntityProps,
} from "../internal/presentation/entity/PlacedEntity";
export * from "../internal/presentation/hint";
export { DragOverlay } from "../internal/presentation/interaction/drag/DragOverlay";
export * from "../internal/presentation/modal";
export * from "../internal/presentation/space/arrow";
export * from "../internal/presentation/terminal";
export * from "./components";
export * from "./hooks";
