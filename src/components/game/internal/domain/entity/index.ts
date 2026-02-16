/**
 * Entity domain exports.
 * Provides access to entity data contracts and type guards.
 */

// Types
export type {
	EntityData,
	EntityDataConfig,
	EntityVisual,
	ItemData,
	ItemDataConfig,
	ItemTooltip,
} from "./entity-data";

// Type guards
export { isItemData } from "./entity-data";
