/**
 * Plain data types for entities (FP replacement for Entity/Item classes).
 * These are ordinary TypeScript types, not classes, making them compatible
 * with Immer's produce() and React's state management.
 */

import type { IconInfo } from "../../core/types/icon";

/**
 * Visual properties for rendering an entity.
 * Plain object type, compatible with Immer Draft<T>.
 */
export type EntityVisual = {
	/** Icon or sprite identifier */
	icon?: string;
	/** Color or theme */
	color?: string;
	/** Size variant */
	size?: "sm" | "md" | "lg";
	/** Custom CSS classes */
	className?: string;
	/** Additional style properties */
	style?: Record<string, unknown>;
};

/**
 * Tooltip configuration for an item.
 */
export type ItemTooltip = {
	/** Tooltip content */
	content: string;
	/** Optional link to more information */
	seeMoreHref?: string;
};

/**
 * Base configuration for creating an entity.
 */
export type EntityDataConfig = {
	/** Unique identifier */
	id: string;
	/** Entity type (e.g., "router", "packet", "player") */
	type: string;
	/** Optional display name */
	name?: string;
	/** Visual properties for rendering */
	visual?: EntityVisual;
	/** Custom data specific to entity type */
	data?: Record<string, unknown>;
	/** Initial state */
	state?: Record<string, unknown>;
	/** Behavior IDs attached to this entity */
	behaviorIds?: string[];
};

/**
 * Plain data type representing an entity.
 * FP replacement for Entity class.
 */
export type EntityData = {
	/** Unique identifier for this entity */
	id: string;
	/** Type identifier (e.g., "router", "packet", "player") */
	type: string;
	/** Optional display name */
	name?: string;
	/** Visual properties for rendering */
	visual: EntityVisual;
	/** Custom data specific to this entity type */
	data: Record<string, unknown>;
	/** Current state of the entity */
	state: Record<string, unknown>;
	/** Behavior IDs attached to this entity */
	behaviorIds: string[];
};

/**
 * Configuration for creating an Item entity.
 */
export type ItemDataConfig = Omit<EntityDataConfig, "type"> & {
	/** Spaces/puzzles where this item can be placed */
	allowedPlaces: string[];
	/** Icon configuration */
	icon?: IconInfo;
	/** Tooltip configuration */
	tooltip?: ItemTooltip;
	/** Whether this item can be dragged */
	draggable?: boolean;
	/** Category for grouping items */
	category?: string;
};

/**
 * Plain data type representing an Item.
 * Items are entities with additional item-specific properties.
 * FP replacement for Item class.
 */
export type ItemData = EntityData & {
	/** Spaces/puzzles where this item can be placed */
	allowedPlaces: string[];
	/** Icon configuration */
	icon?: IconInfo;
	/** Tooltip configuration */
	tooltip?: ItemTooltip;
	/** Whether this item can be dragged */
	draggable: boolean;
	/** Category for grouping items */
	category?: string;
};

/**
 * Type guard to check if an EntityData is an ItemData.
 * @param entity The entity data to check
 * @returns True if the entity has item-specific properties
 */
export const isItemData = (entity: EntityData): entity is ItemData => {
	return "allowedPlaces" in entity && "draggable" in entity;
};
