/**
 * Item entity class representing game items from the inventory system.
 * Maps the current Item type from inventory.ts to the new entity model.
 * Items can be placed in spaces, dragged around, and have tooltips.
 */

import type { IconInfo } from "../../core/types/icon";
import { Entity, type EntityConfig } from "./Entity";

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
 * Configuration for creating an Item entity.
 */
export type ItemConfig = Omit<EntityConfig, "type"> & {
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
 * Item entity class.
 * Represents an item from the inventory that can be placed in spaces.
 * Extends the base Entity with item-specific properties.
 */
export class Item extends Entity {
	/** Spaces/puzzles where this item can be placed */
	public readonly allowedPlaces: string[];

	/** Icon configuration */
	public readonly icon?: IconInfo;

	/** Tooltip configuration */
	public readonly tooltip?: ItemTooltip;

	/** Whether this item can be dragged */
	public readonly draggable: boolean;

	/** Category for grouping items */
	public readonly category?: string;

	/**
	 * Creates a new Item entity.
	 * @param config Item configuration
	 */
	constructor(config: ItemConfig) {
		// Items always have type "item" unless overridden in data
		super({
			...config,
			type: (config.data?.type as string) ?? "item",
		});

		this.allowedPlaces = config.allowedPlaces;
		this.icon = config.icon;
		this.tooltip = config.tooltip;
		this.draggable = config.draggable ?? true;
		this.category = config.category;
	}

	/**
	 * Checks if this item can be placed in a specific space/puzzle.
	 * @param placeId The ID of the space or puzzle
	 * @returns True if the item can be placed there
	 */
	canPlaceIn(placeId: string): boolean {
		return this.allowedPlaces.includes(placeId);
	}

	/**
	 * Checks if this item can be dragged.
	 * @returns True if the item is draggable
	 */
	isDraggable(): boolean {
		return this.draggable;
	}

	/**
	 * Gets the tooltip content for this item.
	 * @returns The tooltip configuration, or undefined
	 */
	getTooltip(): ItemTooltip | undefined {
		return this.tooltip;
	}

	/**
	 * Gets the icon for this item.
	 * @returns The icon configuration, or undefined
	 */
	getIcon(): IconInfo | undefined {
		return this.icon;
	}

	/**
	 * Checks if this item belongs to a specific category.
	 * @param category The category to check
	 * @returns True if the item is in this category
	 */
	isInCategory(category: string): boolean {
		return this.category === category;
	}

	/**
	 * Creates a clone of this item with a new ID.
	 * @param newId The ID for the cloned item
	 * @returns A new Item instance
	 */
	clone(newId: string): Item {
		return new Item({
			id: newId,
			name: this.name,
			allowedPlaces: [...this.allowedPlaces],
			icon: this.icon ? { ...this.icon } : undefined,
			tooltip: this.tooltip ? { ...this.tooltip } : undefined,
			visual: { ...this.visual },
			data: { ...this.data },
			state: { ...this.getState() },
			behaviors: [...this.getBehaviors()],
			draggable: this.draggable,
			category: this.category,
		});
	}

	/**
	 * Serializes this item to a plain object.
	 * Includes item-specific properties.
	 */
	toJSON(): Record<string, unknown> {
		return {
			...super.toJSON(),
			allowedPlaces: this.allowedPlaces,
			icon: this.icon,
			tooltip: this.tooltip,
			draggable: this.draggable,
			category: this.category,
		};
	}

	/**
	 * Creates an Item from the legacy Item type.
	 * Provides migration path from old to new system.
	 */
	static fromLegacyItem(legacyItem: {
		id: string;
		type: string;
		name?: string;
		allowedPlaces: string[];
		icon?: IconInfo;
		tooltip?: ItemTooltip;
		data?: Record<string, unknown>;
		draggable?: boolean;
		category?: string;
	}): Item {
		return new Item({
			id: legacyItem.id,
			name: legacyItem.name,
			allowedPlaces: legacyItem.allowedPlaces,
			icon: legacyItem.icon,
			tooltip: legacyItem.tooltip,
			data: { ...legacyItem.data, type: legacyItem.type },
			draggable: legacyItem.draggable,
			category: legacyItem.category,
		});
	}

	/**
	 * Converts this Item to the legacy Item type.
	 * Provides compatibility with existing code.
	 */
	toLegacyItem(): {
		id: string;
		type: string;
		name?: string;
		allowedPlaces: string[];
		icon?: IconInfo;
		tooltip?: ItemTooltip;
		data?: Record<string, unknown>;
		draggable?: boolean;
		category?: string;
	} {
		return {
			id: this.id,
			type: this.type,
			name: this.name,
			allowedPlaces: this.allowedPlaces,
			icon: this.icon,
			tooltip: this.tooltip,
			data: this.data,
			draggable: this.draggable,
			category: this.category,
		};
	}
}
