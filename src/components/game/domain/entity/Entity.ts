/**
 * Base Entity class representing any game object that can exist in a space.
 * Entities can be items, characters, obstacles, or any other interactive element.
 * This provides the foundation for all concrete entity types.
 */

import type { Behavior } from "../behavior/Behavior";

/**
 * Visual properties for rendering an entity.
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
 * Base configuration for creating an entity.
 */
export type EntityConfig = {
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
	/** Behaviors attached to this entity */
	behaviors?: Behavior[];
};

/**
 * Base Entity class.
 * Entities are the fundamental game objects that can be placed in spaces,
 * rendered on screen, and participate in game mechanics.
 */
export class Entity {
	/** Unique identifier for this entity */
	public readonly id: string;

	/** Type identifier (e.g., "router", "packet", "player") */
	public readonly type: string;

	/** Optional display name */
	public readonly name?: string;

	/** Visual properties for rendering */
	public readonly visual: EntityVisual;

	/** Custom data specific to this entity type */
	public readonly data: Record<string, unknown>;

	/** Current state of the entity */
	private state: Record<string, unknown>;

	/** Behaviors attached to this entity */
	private behaviors: Behavior[];

	/**
	 * Creates a new Entity.
	 * @param config Entity configuration
	 */
	constructor(config: EntityConfig) {
		this.id = config.id;
		this.type = config.type;
		this.name = config.name;
		this.visual = config.visual ?? {};
		this.data = config.data ?? {};
		this.state = config.state ?? {};
		this.behaviors = config.behaviors ?? [];
	}

	/**
	 * Gets the current state of this entity.
	 * @returns A copy of the current state
	 */
	getState(): Record<string, unknown> {
		return { ...this.state };
	}

	/**
	 * Gets a specific state value.
	 * @param key The state key
	 * @returns The state value, or undefined if not found
	 */
	getStateValue<T = unknown>(key: string): T | undefined {
		return this.state[key] as T | undefined;
	}

	/**
	 * Sets a state value.
	 * @param key The state key
	 * @param value The new value
	 */
	setStateValue(key: string, value: unknown): void {
		this.state[key] = value;
	}

	/**
	 * Updates multiple state values at once.
	 * @param updates Object with state updates
	 */
	updateState(updates: Record<string, unknown>): void {
		this.state = { ...this.state, ...updates };
	}

	/**
	 * Resets the state to initial values.
	 * @param initialState The initial state to reset to
	 */
	resetState(initialState?: Record<string, unknown>): void {
		this.state = initialState ?? {};
	}

	/**
	 * Gets all behaviors attached to this entity.
	 * @returns Array of behaviors
	 */
	getBehaviors(): Behavior[] {
		return [...this.behaviors];
	}

	/**
	 * Adds a behavior to this entity.
	 * @param behavior The behavior to add
	 */
	addBehavior(behavior: Behavior): void {
		// Don't add duplicate behaviors
		if (!this.behaviors.some((b) => b.id === behavior.id)) {
			this.behaviors.push(behavior);
		}
	}

	/**
	 * Removes a behavior from this entity.
	 * @param behaviorId The ID of the behavior to remove
	 * @returns True if a behavior was removed
	 */
	removeBehavior(behaviorId: string): boolean {
		const initialLength = this.behaviors.length;
		this.behaviors = this.behaviors.filter((b) => b.id !== behaviorId);
		return this.behaviors.length < initialLength;
	}

	/**
	 * Gets a behavior by ID.
	 * @param behaviorId The behavior ID
	 * @returns The behavior, or undefined if not found
	 */
	getBehavior(behaviorId: string): Behavior | undefined {
		return this.behaviors.find((b) => b.id === behaviorId);
	}

	/**
	 * Checks if this entity has a specific behavior.
	 * @param behaviorId The behavior ID
	 * @returns True if the entity has this behavior
	 */
	hasBehavior(behaviorId: string): boolean {
		return this.behaviors.some((b) => b.id === behaviorId);
	}

	/**
	 * Creates a clone of this entity with a new ID.
	 * @param newId The ID for the cloned entity
	 * @returns A new Entity instance
	 */
	clone(newId: string): Entity {
		return new Entity({
			id: newId,
			type: this.type,
			name: this.name,
			visual: { ...this.visual },
			data: { ...this.data },
			state: { ...this.state },
			behaviors: [...this.behaviors],
		});
	}

	/**
	 * Serializes this entity to a plain object.
	 * Useful for saving/loading or network transmission.
	 */
	toJSON(): Record<string, unknown> {
		return {
			id: this.id,
			type: this.type,
			name: this.name,
			visual: this.visual,
			data: this.data,
			state: this.state,
			behaviors: this.behaviors.map((b) => b.id),
		};
	}

	/**
	 * Creates a string representation of this entity.
	 */
	toString(): string {
		return `Entity(${this.type}:${this.id})`;
	}
}
