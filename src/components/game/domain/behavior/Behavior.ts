/**
 * Behavior system for entities.
 * Behaviors define actions that entities can perform, such as:
 * - Movement (walk, jump, teleport)
 * - Combat (attack, defend, heal)
 * - Interaction (collect, use, activate)
 * - Animation (idle, run, die)
 *
 * This is a stub implementation - full functionality will be added in a future phase.
 *
 * TODO: Implement full Behavior system
 * - Behavior execution pipeline
 * - Behavior conditions and requirements
 * - Behavior cooldowns and costs
 * - Behavior interruption and cancellation
 * - Behavior composition and chaining
 * - Integration with animation system
 * - Integration with state management
 */

import type { Entity } from "../entity/Entity";

/**
 * Context passed to behavior methods.
 * Contains information about the current game state.
 */
export type BehaviorContext = {
	/** The entity performing the behavior */
	entity: Entity;
	/** Target entity (if applicable) */
	target?: Entity;
	/** Additional parameters for the behavior */
	params?: Record<string, unknown>;
	/** Current game time */
	timestamp?: number;
	/** Delta time since last update */
	deltaTime?: number;
};

/**
 * Result of a behavior execution.
 */
export type BehaviorResult = {
	/** Whether the behavior executed successfully */
	success: boolean;
	/** Optional message or error */
	message?: string;
	/** Updated state changes */
	stateChanges?: Record<string, unknown>;
	/** Side effects (e.g., spawn entities, play sounds) */
	effects?: Array<Record<string, unknown>>;
};

/**
 * Animation data for visualizing a behavior.
 */
export type BehaviorAnimation = {
	/** Animation type (e.g., "move", "attack", "fade") */
	type: string;
	/** Duration in milliseconds */
	duration: number;
	/** Easing function */
	easing?: string;
	/** Animation-specific properties */
	properties?: Record<string, unknown>;
};

/**
 * Base interface for all behaviors.
 * Behaviors are actions that entities can perform.
 */
export interface Behavior {
	/** Unique identifier for this behavior */
	id: string;

	/** Behavior type (e.g., "move", "attack", "collect") */
	type: string;

	/** Display name */
	name?: string;

	/** Description of what this behavior does */
	description?: string;

	/**
	 * Checks if this behavior can be executed in the current context.
	 * @param context The behavior context
	 * @returns True if the behavior can execute
	 */
	canExecute(context: BehaviorContext): boolean;

	/**
	 * Executes this behavior.
	 * @param context The behavior context
	 * @returns The result of the execution
	 */
	execute(context: BehaviorContext): BehaviorResult | Promise<BehaviorResult>;

	/**
	 * Gets animation data for visualizing this behavior.
	 * @param context The behavior context
	 * @returns Animation configuration, or null if no animation
	 */
	animate(context: BehaviorContext): BehaviorAnimation | null;
}

/**
 * Base implementation of the Behavior interface.
 * Provides default implementations and can be extended for specific behaviors.
 */
export abstract class BaseBehavior implements Behavior {
	public readonly id: string;
	public readonly type: string;
	public readonly name?: string;
	public readonly description?: string;

	constructor(config: {
		id: string;
		type: string;
		name?: string;
		description?: string;
	}) {
		this.id = config.id;
		this.type = config.type;
		this.name = config.name;
		this.description = config.description;
	}

	/**
	 * Default implementation - always returns true.
	 * Override in subclasses to add conditions.
	 */
	canExecute(_context: BehaviorContext): boolean {
		return true;
	}

	/**
	 * Abstract method - must be implemented by subclasses.
	 */
	abstract execute(
		context: BehaviorContext,
	): BehaviorResult | Promise<BehaviorResult>;

	/**
	 * Default implementation - no animation.
	 * Override in subclasses to add animations.
	 */
	animate(_context: BehaviorContext): BehaviorAnimation | null {
		return null;
	}
}

/**
 * Stub behavior implementation for testing.
 * TODO: Remove this once real behaviors are implemented.
 */
export class StubBehavior extends BaseBehavior {
	constructor(id: string, type: string) {
		super({
			id,
			type,
			name: `Stub ${type}`,
			description: "This is a stub behavior for testing purposes",
		});
	}

	execute(_context: BehaviorContext): BehaviorResult {
		return {
			success: true,
			message: "Stub behavior executed",
		};
	}
}

/**
 * TODO: Example behavior implementations to be added:
 *
 * - MoveBehavior: Moves entity from one position to another
 * - AttackBehavior: Deals damage to a target entity
 * - CollectBehavior: Picks up an item and adds it to inventory
 * - UseBehavior: Uses an item from inventory
 * - InteractBehavior: Interacts with an entity or environment object
 * - IdleBehavior: Default behavior when entity is doing nothing
 * - PatrolBehavior: Moves entity along a predefined path
 * - ChaseBehavior: Follows a target entity
 * - FleeBehavior: Moves away from a target entity
 * - HealBehavior: Restores health to self or target
 * - TransformBehavior: Changes entity appearance or type
 * - SpawnBehavior: Creates a new entity
 * - DestroyBehavior: Removes an entity from the game
 */
