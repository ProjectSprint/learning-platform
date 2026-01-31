/**
 * Abstract base class for all Space implementations.
 * A Space represents a container that can hold and organize entities (e.g., items, characters).
 * Different space types provide different organization strategies:
 * - GridSpace: Organized in a 2D grid with positional constraints
 * - PoolSpace: Unordered collection without positional constraints
 * - QueueSpace: FIFO/LIFO ordered collection
 * - PathSpace: Sequential positions along a path
 */

import type { Entity } from "../entity/Entity";

/**
 * Base configuration for all spaces.
 */
export type SpaceConfig = {
	/** Unique identifier for this space */
	id: string;
	/** Optional display name */
	name?: string;
	/** Maximum number of entities this space can hold (undefined = unlimited) */
	maxCapacity?: number;
	/** Additional metadata */
	metadata?: Record<string, unknown>;
};

/**
 * Represents a position within a space.
 * The exact structure depends on the space type:
 * - GridSpace: { row: number, col: number }
 * - PoolSpace: undefined or { index: number }
 * - QueueSpace: { index: number }
 * - PathSpace: { index: number }
 */
export type SpacePosition = Record<string, unknown> | undefined;

/**
 * Abstract base class for all Space implementations.
 * Provides the foundation for different space types that can hold entities.
 */
export abstract class Space {
	/** Unique identifier for this space */
	public readonly id: string;

	/** Optional display name */
	public readonly name?: string;

	/** Maximum capacity (undefined = unlimited) */
	public readonly maxCapacity?: number;

	/** Additional metadata */
	public readonly metadata: Record<string, unknown>;

	/**
	 * Creates a new Space.
	 * @param config Space configuration
	 */
	constructor(config: SpaceConfig) {
		this.id = config.id;
		this.name = config.name;
		this.maxCapacity = config.maxCapacity;
		this.metadata = config.metadata ?? {};
	}

	// Abstract methods that must be implemented by concrete space types

	/**
	 * Adds an entity to this space at the specified position.
	 * @param entity The entity to add
	 * @param position Optional position within the space (interpretation depends on space type)
	 * @returns True if the entity was successfully added, false otherwise
	 */
	abstract add(entity: Entity, position?: SpacePosition): boolean;

	/**
	 * Removes an entity from this space.
	 * @param entity The entity to remove
	 * @returns True if the entity was successfully removed, false if it wasn't in the space
	 */
	abstract remove(entity: Entity): boolean;

	/**
	 * Checks if this space contains the specified entity.
	 * @param entity The entity to check for
	 * @returns True if the entity is in this space
	 */
	abstract contains(entity: Entity): boolean;

	/**
	 * Gets the position of an entity within this space.
	 * @param entity The entity to locate
	 * @returns The entity's position, or null if not in this space
	 */
	abstract getPosition(entity: Entity): SpacePosition | null;

	/**
	 * Sets the position of an entity within this space.
	 * The entity must already be in the space.
	 * @param entity The entity to move
	 * @param position The new position
	 * @returns True if the position was successfully updated
	 */
	abstract setPosition(entity: Entity, position: SpacePosition): boolean;

	/**
	 * Checks if this space can accept a new entity at the specified position.
	 * @param entity The entity to check
	 * @param position Optional position within the space
	 * @returns True if the entity can be added
	 */
	abstract canAccept(entity: Entity, position?: SpacePosition): boolean;

	/**
	 * Gets the current capacity information for this space.
	 * @returns Object with current count and maximum capacity
	 */
	abstract capacity(): { current: number; max: number | undefined };

	/**
	 * Gets all entities currently in this space.
	 * @returns Array of entities
	 */
	abstract getEntities(): Entity[];

	// Concrete helper methods available to all space types

	/**
	 * Checks if this space is at maximum capacity.
	 * @returns True if the space is full
	 */
	isFull(): boolean {
		const { current, max } = this.capacity();
		return max !== undefined && current >= max;
	}

	/**
	 * Checks if this space is empty.
	 * @returns True if the space contains no entities
	 */
	isEmpty(): boolean {
		return this.capacity().current === 0;
	}

	/**
	 * Gets an entity by its ID.
	 * @param entityId The ID of the entity to find
	 * @returns The entity, or undefined if not found
	 */
	getEntityById(entityId: string): Entity | undefined {
		return this.getEntities().find((entity) => entity.id === entityId);
	}

	/**
	 * Gets the number of entities currently in this space.
	 * @returns The entity count
	 */
	getCount(): number {
		return this.capacity().current;
	}

	/**
	 * Gets the remaining capacity of this space.
	 * @returns Number of entities that can still be added, or Infinity if unlimited
	 */
	getRemainingCapacity(): number {
		const { current, max } = this.capacity();
		return max === undefined ? Infinity : max - current;
	}

	/**
	 * Filters entities in this space.
	 * @param predicate Function to test each entity
	 * @returns Array of entities that pass the test
	 */
	filterEntities(predicate: (entity: Entity) => boolean): Entity[] {
		return this.getEntities().filter(predicate);
	}

	/**
	 * Finds the first entity that matches a predicate.
	 * @param predicate Function to test each entity
	 * @returns The first matching entity, or undefined
	 */
	findEntity(predicate: (entity: Entity) => boolean): Entity | undefined {
		return this.getEntities().find(predicate);
	}

	/**
	 * Checks if any entity matches a predicate.
	 * @param predicate Function to test each entity
	 * @returns True if any entity matches
	 */
	hasEntity(predicate: (entity: Entity) => boolean): boolean {
		return this.getEntities().some(predicate);
	}

	/**
	 * Clears all entities from this space.
	 * @returns Array of removed entities
	 */
	clear(): Entity[] {
		const entities = [...this.getEntities()];
		for (const entity of entities) {
			this.remove(entity);
		}
		return entities;
	}
}
