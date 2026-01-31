/**
 * Pool-based space implementation for unordered collections.
 * Represents the current inventory system - entities without positional constraints.
 * Simple array-based storage where position is optional and primarily for ordering.
 */

import type { Entity } from "../entity/Entity";
import { Space, type SpaceConfig, type SpacePosition } from "./Space";

/**
 * Configuration for creating a PoolSpace.
 */
export type PoolSpaceConfig = SpaceConfig & {
	/** Layout hint for UI rendering (e.g., "grid", "list", "carousel") */
	layout?: "grid" | "list" | "carousel";
	/** Number of columns for grid layout */
	columns?: number;
	/** Whether entities can be reordered */
	allowReorder?: boolean;
};

/**
 * Position within a PoolSpace.
 * Simply an index in the array (optional).
 */
export type PoolPosition = {
	index: number;
};

/**
 * A space that stores entities in an unordered collection.
 * Similar to the current inventory system - no positional constraints.
 * Entities are stored in an array and can optionally be ordered by index.
 */
export class PoolSpace extends Space {
	/** Array of entities in this pool */
	private entities: Entity[];

	/** Layout hint for UI rendering */
	public readonly layout: "grid" | "list" | "carousel";

	/** Number of columns for grid layout */
	public readonly columns?: number;

	/** Whether entities can be reordered */
	public readonly allowReorder: boolean;

	/**
	 * Creates a new PoolSpace.
	 * @param config Pool space configuration
	 */
	constructor(config: PoolSpaceConfig) {
		super(config);

		this.entities = [];
		this.layout = config.layout ?? "grid";
		this.columns = config.columns;
		this.allowReorder = config.allowReorder ?? true;
	}

	add(entity: Entity, position?: SpacePosition): boolean {
		// Check if we can accept this entity
		if (!this.canAccept(entity, position)) {
			return false;
		}

		// If entity is already in the pool, remove it first
		if (this.contains(entity)) {
			this.remove(entity);
		}

		// Add entity at the specified index, or at the end if no position given
		if (position && this.isPoolPosition(position)) {
			const poolPos = position as PoolPosition;
			const index = Math.max(0, Math.min(poolPos.index, this.entities.length));
			this.entities.splice(index, 0, entity);
		} else {
			this.entities.push(entity);
		}

		return true;
	}

	remove(entity: Entity): boolean {
		const index = this.entities.findIndex((e) => e.id === entity.id);
		if (index === -1) {
			return false;
		}

		this.entities.splice(index, 1);
		return true;
	}

	contains(entity: Entity): boolean {
		return this.entities.some((e) => e.id === entity.id);
	}

	getPosition(entity: Entity): PoolPosition | null {
		const index = this.entities.findIndex((e) => e.id === entity.id);
		return index !== -1 ? { index } : null;
	}

	setPosition(entity: Entity, position: SpacePosition): boolean {
		if (!this.allowReorder) {
			return false;
		}

		if (!this.isPoolPosition(position)) {
			return false;
		}

		// Entity must already be in the pool
		if (!this.contains(entity)) {
			return false;
		}

		const poolPos = position as PoolPosition;

		// Remove from current position
		const currentIndex = this.entities.findIndex((e) => e.id === entity.id);
		if (currentIndex === -1) {
			return false;
		}

		// Remove and re-insert at new position
		this.entities.splice(currentIndex, 1);
		const newIndex = Math.max(0, Math.min(poolPos.index, this.entities.length));
		this.entities.splice(newIndex, 0, entity);

		return true;
	}

	canAccept(entity: Entity, _position?: SpacePosition): boolean {
		// Check capacity
		if (this.isFull() && !this.contains(entity)) {
			return false;
		}

		// Pool spaces don't have other restrictions
		return true;
	}

	capacity(): { current: number; max: number | undefined } {
		return {
			current: this.entities.length,
			max: this.maxCapacity,
		};
	}

	getEntities(): Entity[] {
		// Return a copy to prevent external modification
		return [...this.entities];
	}

	/**
	 * Gets an entity at a specific index.
	 * @param index The array index
	 * @returns The entity at that index, or undefined
	 */
	getEntityAt(index: number): Entity | undefined {
		return this.entities[index];
	}

	/**
	 * Swaps the positions of two entities.
	 * @param entityA First entity
	 * @param entityB Second entity
	 * @returns True if the swap was successful
	 */
	swap(entityA: Entity, entityB: Entity): boolean {
		if (!this.allowReorder) {
			return false;
		}

		const indexA = this.entities.findIndex((e) => e.id === entityA.id);
		const indexB = this.entities.findIndex((e) => e.id === entityB.id);

		if (indexA === -1 || indexB === -1) {
			return false;
		}

		// Swap entities
		[this.entities[indexA], this.entities[indexB]] = [
			this.entities[indexB],
			this.entities[indexA],
		];

		return true;
	}

	/**
	 * Moves an entity to the front of the pool.
	 * @param entity The entity to move
	 * @returns True if the move was successful
	 */
	moveToFront(entity: Entity): boolean {
		return this.setPosition(entity, { index: 0 });
	}

	/**
	 * Moves an entity to the back of the pool.
	 * @param entity The entity to move
	 * @returns True if the move was successful
	 */
	moveToBack(entity: Entity): boolean {
		return this.setPosition(entity, { index: this.entities.length - 1 });
	}

	/**
	 * Sorts entities using a comparison function.
	 * @param compareFn Comparison function for sorting
	 */
	sort(compareFn: (a: Entity, b: Entity) => number): void {
		if (!this.allowReorder) {
			return;
		}

		this.entities.sort(compareFn);
	}

	/**
	 * Reverses the order of entities in the pool.
	 */
	reverse(): void {
		if (!this.allowReorder) {
			return;
		}

		this.entities.reverse();
	}

	/**
	 * Type guard to check if a position is a valid PoolPosition.
	 */
	private isPoolPosition(position: SpacePosition): position is PoolPosition {
		return (
			position !== undefined &&
			typeof position === "object" &&
			"index" in position &&
			typeof position.index === "number"
		);
	}
}
