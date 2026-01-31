/**
 * Path-based space implementation for movement along predefined routes.
 * This is a stub implementation - full functionality will be added in a future phase.
 *
 * TODO: Implement full PathSpace functionality
 * - Path definition with waypoints/nodes
 * - Movement along paths with speed/duration
 * - Bidirectional vs unidirectional paths
 * - Branching paths with decision points
 * - Path constraints (one entity per segment, etc.)
 * - Integration with animation system
 */

import type { Point2D } from "../../infrastructure/geometry/coordinates";
import type { Entity } from "../entity/Entity";
import { Space, type SpaceConfig, type SpacePosition } from "./Space";

/**
 * A waypoint along a path.
 */
export type PathWaypoint = {
	/** Unique identifier for this waypoint */
	id: string;
	/** Position in pixel space */
	position: Point2D;
	/** Optional connections to other waypoints */
	connections?: string[];
	/** Additional metadata */
	metadata?: Record<string, unknown>;
};

/**
 * Configuration for creating a PathSpace.
 */
export type PathSpaceConfig = SpaceConfig & {
	/** Waypoints that define the path */
	waypoints: PathWaypoint[];
	/** Whether entities can move in both directions */
	bidirectional?: boolean;
	/** Whether multiple entities can occupy the same waypoint */
	allowMultiplePerWaypoint?: boolean;
	/** Whether the path is closed (last waypoint connects to first) */
	closed?: boolean;
};

/**
 * Position within a PathSpace.
 * Represents a location along the path.
 */
export type PathPosition = {
	/** Index of the waypoint */
	waypointIndex: number;
	/** Progress between this waypoint and the next (0-1) */
	progress?: number;
};

/**
 * A space that organizes entities along a predefined path.
 * Useful for movement systems, conveyor belts, network packets, etc.
 * This is a stub implementation for future development.
 */
export class PathSpace extends Space {
	/** Waypoints that define the path */
	public readonly waypoints: PathWaypoint[];

	/** Whether entities can move in both directions */
	public readonly bidirectional: boolean;

	/** Whether multiple entities can occupy the same waypoint */
	public readonly allowMultiplePerWaypoint: boolean;

	/** Whether the path is closed (circular) */
	public readonly closed: boolean;

	/** Map of entity ID to position */
	private entityPositions: Map<string, PathPosition>;

	/** Map of entity ID to entity reference */
	private entities: Map<string, Entity>;

	constructor(config: PathSpaceConfig) {
		super(config);

		this.waypoints = config.waypoints;
		this.bidirectional = config.bidirectional ?? false;
		this.allowMultiplePerWaypoint = config.allowMultiplePerWaypoint ?? false;
		this.closed = config.closed ?? false;

		this.entityPositions = new Map();
		this.entities = new Map();
	}

	// TODO: Implement these methods properly
	add(entity: Entity, position?: SpacePosition): boolean {
		if (!position || !this.isPathPosition(position)) {
			// Default to first waypoint if no position specified
			position = { waypointIndex: 0, progress: 0 };
		}

		if (!this.canAccept(entity, position)) {
			return false;
		}

		this.entities.set(entity.id, entity);
		this.entityPositions.set(entity.id, position as PathPosition);
		return true;
	}

	remove(entity: Entity): boolean {
		const removed = this.entities.delete(entity.id);
		this.entityPositions.delete(entity.id);
		return removed;
	}

	contains(entity: Entity): boolean {
		return this.entities.has(entity.id);
	}

	getPosition(entity: Entity): PathPosition | null {
		return this.entityPositions.get(entity.id) ?? null;
	}

	setPosition(entity: Entity, position: SpacePosition): boolean {
		if (!this.isPathPosition(position)) {
			return false;
		}

		if (!this.contains(entity)) {
			return false;
		}

		const pathPos = position as PathPosition;

		// Validate waypoint index
		if (
			pathPos.waypointIndex < 0 ||
			pathPos.waypointIndex >= this.waypoints.length
		) {
			return false;
		}

		// TODO: Check if position is already occupied (if not allowing multiple)

		this.entityPositions.set(entity.id, pathPos);
		return true;
	}

	canAccept(entity: Entity, _position?: SpacePosition): boolean {
		if (this.isFull() && !this.contains(entity)) {
			return false;
		}

		// TODO: Check path-specific constraints
		// - Validate waypoint index
		// - Check if waypoint is occupied
		// - Check movement direction restrictions

		return true;
	}

	capacity(): { current: number; max: number | undefined } {
		return {
			current: this.entities.size,
			max: this.maxCapacity,
		};
	}

	getEntities(): Entity[] {
		return Array.from(this.entities.values());
	}

	/**
	 * TODO: Moves an entity forward along the path.
	 * @param entity The entity to move
	 * @param steps Number of waypoints to move forward
	 * @returns True if the move was successful
	 */
	moveForward(entity: Entity, steps = 1): boolean {
		// TODO: Implement path movement
		const currentPos = this.getPosition(entity);
		if (!currentPos) {
			return false;
		}

		const newIndex = currentPos.waypointIndex + steps;
		if (newIndex >= this.waypoints.length) {
			if (this.closed) {
				// Wrap around for closed paths
				return this.setPosition(entity, {
					waypointIndex: newIndex % this.waypoints.length,
					progress: 0,
				});
			}
			return false;
		}

		return this.setPosition(entity, { waypointIndex: newIndex, progress: 0 });
	}

	/**
	 * TODO: Moves an entity backward along the path.
	 * @param entity The entity to move
	 * @param steps Number of waypoints to move backward
	 * @returns True if the move was successful
	 */
	moveBackward(entity: Entity, steps = 1): boolean {
		// TODO: Implement backward movement
		if (!this.bidirectional) {
			return false;
		}

		const currentPos = this.getPosition(entity);
		if (!currentPos) {
			return false;
		}

		const newIndex = currentPos.waypointIndex - steps;
		if (newIndex < 0) {
			if (this.closed) {
				// Wrap around for closed paths
				return this.setPosition(entity, {
					waypointIndex:
						(newIndex + this.waypoints.length) % this.waypoints.length,
					progress: 0,
				});
			}
			return false;
		}

		return this.setPosition(entity, { waypointIndex: newIndex, progress: 0 });
	}

	/**
	 * TODO: Gets the pixel position of an entity on the path.
	 * @param entity The entity
	 * @returns The interpolated position in pixel space
	 */
	getPixelPosition(entity: Entity): Point2D | null {
		// TODO: Implement position interpolation based on waypoint and progress
		const position = this.getPosition(entity);
		if (!position) {
			return null;
		}

		const waypoint = this.waypoints[position.waypointIndex];
		if (!waypoint) {
			return null;
		}

		// TODO: Interpolate between waypoints based on progress
		return waypoint.position;
	}

	/**
	 * Type guard to check if a position is a valid PathPosition.
	 */
	private isPathPosition(position: SpacePosition): position is PathPosition {
		return (
			position !== undefined &&
			typeof position === "object" &&
			"waypointIndex" in position &&
			typeof position.waypointIndex === "number"
		);
	}
}
