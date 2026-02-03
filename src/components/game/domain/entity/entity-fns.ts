/**
 * Pure functions for working with EntityData and ItemData.
 * These functions replace methods from Entity and Item classes.
 * Mutation functions are designed to work with Immer Draft<T>.
 */

import type { IconInfo } from "../../core/types/icon";
import type {
	EntityData,
	EntityDataConfig,
	ItemData,
	ItemDataConfig,
	ItemTooltip,
} from "./entity-data";

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new EntityData object.
 * @param config Entity configuration
 * @returns A new entity data object
 */
export const createEntityData = (config: EntityDataConfig): EntityData => {
	return {
		id: config.id,
		type: config.type,
		name: config.name,
		visual: config.visual ?? {},
		data: config.data ?? {},
		state: config.state ?? {},
		behaviorIds: config.behaviorIds ?? [],
	};
};

/**
 * Creates a new ItemData object.
 * Items always have type "item" unless overridden in data.
 * @param config Item configuration
 * @returns A new item data object
 */
export const createItemData = (config: ItemDataConfig): ItemData => {
	return {
		id: config.id,
		type: (config.data?.type as string) ?? "item",
		name: config.name,
		visual: config.visual ?? {},
		data: config.data ?? {},
		state: config.state ?? {},
		behaviorIds: config.behaviorIds ?? [],
		allowedPlaces: config.allowedPlaces,
		icon: config.icon,
		tooltip: config.tooltip,
		draggable: config.draggable ?? true,
		category: config.category,
	};
};

// ============================================================================
// State Access Functions
// ============================================================================

/**
 * Gets a specific state value from an entity.
 * @param entity The entity data
 * @param key The state key
 * @returns The state value, or undefined if not found
 */
export const getEntityStateValue = <T = unknown>(
	entity: EntityData,
	key: string,
): T | undefined => {
	return entity.state[key] as T | undefined;
};

// ============================================================================
// State Mutation Functions (for Immer drafts)
// ============================================================================

/**
 * Sets a state value on an entity.
 * Mutates the entity in-place (for use with Immer produce()).
 * @param entity The entity data to mutate
 * @param key The state key
 * @param value The new value
 */
export const setEntityStateValue = (
	entity: EntityData,
	key: string,
	value: unknown,
): void => {
	entity.state[key] = value;
};

/**
 * Updates multiple state values at once.
 * Mutates the entity in-place (for use with Immer produce()).
 * @param entity The entity data to mutate
 * @param updates Object with state updates
 */
export const updateEntityState = (
	entity: EntityData,
	updates: Record<string, unknown>,
): void => {
	entity.state = { ...entity.state, ...updates };
};

/**
 * Resets the entity state to initial values.
 * Mutates the entity in-place (for use with Immer produce()).
 * @param entity The entity data to mutate
 * @param initialState The initial state to reset to (defaults to empty object)
 */
export const resetEntityState = (
	entity: EntityData,
	initialState?: Record<string, unknown>,
): void => {
	entity.state = initialState ?? {};
};

// ============================================================================
// Item Query Functions
// ============================================================================

/**
 * Checks if an item can be placed in a specific space.
 * @param item The item data
 * @param placeId The ID of the space
 * @returns True if the item can be placed there
 */
export const canPlaceIn = (item: ItemData, placeId: string): boolean => {
	return item.allowedPlaces.includes(placeId);
};

/**
 * Checks if an item can be dragged.
 * @param item The item data
 * @returns True if the item is draggable
 */
export const isDraggable = (item: ItemData): boolean => {
	return item.draggable;
};

/**
 * Gets the tooltip configuration for an item.
 * @param item The item data
 * @returns The tooltip configuration, or undefined
 */
export const getItemTooltip = (item: ItemData): ItemTooltip | undefined => {
	return item.tooltip;
};

/**
 * Gets the icon for an item.
 * @param item The item data
 * @returns The icon configuration, or undefined
 */
export const getItemIcon = (item: ItemData): IconInfo | undefined => {
	return item.icon;
};

/**
 * Checks if an item belongs to a specific category.
 * @param item The item data
 * @param category The category to check
 * @returns True if the item is in this category
 */
export const isInCategory = (item: ItemData, category: string): boolean => {
	return item.category === category;
};

/**
 * Clones an entity with a new ID.
 * Creates a deep copy of the entity data.
 * @param entity The entity data to clone
 * @param newId The ID for the cloned entity
 * @returns A new entity data object
 */
export const cloneEntityData = (
	entity: EntityData,
	newId: string,
): EntityData => {
	return {
		...entity,
		id: newId,
		visual: { ...entity.visual },
		data: { ...entity.data },
		state: { ...entity.state },
		behaviorIds: [...entity.behaviorIds],
	};
};

/**
 * Clones an item with a new ID.
 * Creates a deep copy of the item data.
 * @param item The item data to clone
 * @param newId The ID for the cloned item
 * @returns A new item data object
 */
export const cloneItemData = (item: ItemData, newId: string): ItemData => {
	return {
		...item,
		id: newId,
		visual: { ...item.visual },
		data: { ...item.data },
		state: { ...item.state },
		behaviorIds: [...item.behaviorIds],
		allowedPlaces: [...item.allowedPlaces],
		icon: item.icon ? { ...item.icon } : undefined,
		tooltip: item.tooltip ? { ...item.tooltip } : undefined,
	};
};
