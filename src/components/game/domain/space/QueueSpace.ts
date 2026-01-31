/**
 * Queue-based space implementation for ordered collections with FIFO/LIFO semantics.
 * This is a stub implementation - full functionality will be added in a future phase.
 *
 * TODO: Implement full QueueSpace functionality
 * - FIFO (First-In-First-Out) queue operations
 * - LIFO (Last-In-First-Out) stack operations
 * - Peek operations (view without removing)
 * - Priority queue variant
 * - Size limits and overflow handling
 */

import type { Entity } from "../entity/Entity";
import { Space, type SpaceConfig, type SpacePosition } from "./Space";

/**
 * Configuration for creating a QueueSpace.
 */
export type QueueSpaceConfig = SpaceConfig & {
	/** Queue mode: FIFO (queue) or LIFO (stack) */
	mode?: "fifo" | "lifo";
	/** Whether to allow peeking at entities without removing them */
	allowPeek?: boolean;
};

/**
 * Position within a QueueSpace.
 * In a queue, position is typically just the index in the queue.
 */
export type QueuePosition = {
	index: number;
};

/**
 * A space that stores entities in a queue with FIFO or LIFO semantics.
 * This is a stub implementation for future development.
 */
export class QueueSpace extends Space {
	private entities: Entity[];
	public readonly mode: "fifo" | "lifo";
	public readonly allowPeek: boolean;

	constructor(config: QueueSpaceConfig) {
		super(config);
		this.entities = [];
		this.mode = config.mode ?? "fifo";
		this.allowPeek = config.allowPeek ?? true;
	}

	// TODO: Implement these methods properly
	add(entity: Entity, _position?: SpacePosition): boolean {
		if (!this.canAccept(entity)) {
			return false;
		}
		this.entities.push(entity);
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

	getPosition(entity: Entity): QueuePosition | null {
		const index = this.entities.findIndex((e) => e.id === entity.id);
		return index !== -1 ? { index } : null;
	}

	setPosition(_entity: Entity, _position: SpacePosition): boolean {
		// Queues don't typically allow arbitrary position changes
		return false;
	}

	canAccept(entity: Entity, _position?: SpacePosition): boolean {
		if (this.isFull() && !this.contains(entity)) {
			return false;
		}
		return true;
	}

	capacity(): { current: number; max: number | undefined } {
		return {
			current: this.entities.length,
			max: this.maxCapacity,
		};
	}

	getEntities(): Entity[] {
		return [...this.entities];
	}

	/**
	 * TODO: Enqueues an entity (adds to the back of the queue).
	 * @param entity The entity to enqueue
	 * @returns True if successful
	 */
	enqueue(entity: Entity): boolean {
		// TODO: Implement proper FIFO enqueue
		return this.add(entity);
	}

	/**
	 * TODO: Dequeues an entity (removes from the front of the queue).
	 * @returns The dequeued entity, or undefined if empty
	 */
	dequeue(): Entity | undefined {
		// TODO: Implement proper FIFO dequeue
		if (this.mode === "fifo") {
			return this.entities.shift();
		}
		return this.entities.pop();
	}

	/**
	 * TODO: Peeks at the front entity without removing it.
	 * @returns The front entity, or undefined if empty
	 */
	peek(): Entity | undefined {
		// TODO: Implement proper peek based on mode
		if (!this.allowPeek || this.entities.length === 0) {
			return undefined;
		}
		return this.mode === "fifo"
			? this.entities[0]
			: this.entities[this.entities.length - 1];
	}
}
