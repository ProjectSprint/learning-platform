/**
 * Entity domain exports.
 * Provides access to all entity types, data, and utility functions.
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

// Factory and utility functions
export {
	canPlaceIn,
	cloneEntityData,
	cloneItemData,
	createEntityData,
	createItemData,
	getEntityStateValue,
	getItemIcon,
	getItemTooltip,
	isDraggable,
	isInCategory,
} from "./entity-fns";
