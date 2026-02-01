/**
 * Pure functions for working with SpaceData.
 * These functions replace methods from Space, GridSpace, and PoolSpace classes.
 * Mutation functions (gridAdd, gridRemove, poolAdd, poolRemove) are designed to
 * work in-place for use with Immer produce().
 */

import { isInBounds } from "../../infrastructure/geometry/coordinates";
import type {
	GridPosition,
	GridSpaceConfig,
	GridSpaceData,
	PoolSpaceConfig,
	PoolSpaceData,
	SpaceData,
} from "./space-data";

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new GridSpaceData object.
 * @param config Grid space configuration
 * @returns A new grid space data object
 */
export const createGridSpaceData = (config: GridSpaceConfig): GridSpaceData => {
	return {
		id: config.id,
		name: config.name,
		maxCapacity: config.maxCapacity,
		metadata: config.metadata ?? {},
		kind: "grid",
		rows: config.rows,
		cols: config.cols,
		metrics: config.metrics,
		allowMultiplePerCell: config.allowMultiplePerCell ?? false,
		entityPositions: {},
	};
};

/**
 * Creates a new PoolSpaceData object.
 * @param config Pool space configuration
 * @returns A new pool space data object
 */
export const createPoolSpaceData = (config: PoolSpaceConfig): PoolSpaceData => {
	return {
		id: config.id,
		name: config.name,
		maxCapacity: config.maxCapacity,
		metadata: config.metadata ?? {},
		kind: "pool",
		layout: config.layout ?? "grid",
		columns: config.columns,
		allowReorder: config.allowReorder ?? true,
		entityIds: [],
	};
};

// ============================================================================
// Grid Space Functions
// ============================================================================

/**
 * Adds an entity to a grid space at the specified position.
 * Mutates the grid space in-place (for use with Immer produce()).
 * @param space The grid space data to mutate
 * @param entityId The ID of the entity to add
 * @param position The grid position to add at
 * @returns True if the entity was successfully added, false otherwise
 */
export const gridAdd = (
	space: GridSpaceData,
	entityId: string,
	position: GridPosition,
): boolean => {
	// Check if position is valid
	if (!isInBounds(position, space.rows, space.cols)) {
		return false;
	}

	// Check capacity
	if (space.maxCapacity !== undefined) {
		const currentCount = Object.keys(space.entityPositions).length;
		// If entity is already in space, don't count it in capacity check
		if (
			!(entityId in space.entityPositions) &&
			currentCount >= space.maxCapacity
		) {
			return false;
		}
	}

	// Check if cell already has an entity (unless multiple allowed)
	if (!space.allowMultiplePerCell) {
		for (const [_otherId, pos] of Object.entries(space.entityPositions)) {
			if (
				pos.row === position.row &&
				pos.col === position.col &&
				_otherId !== entityId
			) {
				return false;
			}
		}
	}

	// Remove entity if already in space (move case)
	delete space.entityPositions[entityId];

	// Add entity at position
	space.entityPositions[entityId] = { ...position };
	return true;
};

/**
 * Removes an entity from a grid space.
 * Mutates the grid space in-place (for use with Immer produce()).
 * @param space The grid space data to mutate
 * @param entityId The ID of the entity to remove
 * @returns True if the entity was successfully removed, false otherwise
 */
export const gridRemove = (space: GridSpaceData, entityId: string): boolean => {
	if (!(entityId in space.entityPositions)) {
		return false;
	}

	delete space.entityPositions[entityId];
	return true;
};

/**
 * Checks if a grid space contains an entity.
 * @param space The grid space data
 * @param entityId The ID of the entity to check for
 * @returns True if the entity is in the space
 */
export const gridContains = (
	space: GridSpaceData,
	entityId: string,
): boolean => {
	return entityId in space.entityPositions;
};

/**
 * Gets the position of an entity in a grid space.
 * @param space The grid space data
 * @param entityId The ID of the entity to locate
 * @returns The entity's position, or undefined if not in the space
 */
export const gridGetPosition = (
	space: GridSpaceData,
	entityId: string,
): GridPosition | undefined => {
	return space.entityPositions[entityId];
};

/**
 * Checks if a grid space can accept an entity at the specified position.
 * @param space The grid space data
 * @param entityId The ID of the entity to check
 * @param position The grid position to check
 * @returns True if the entity can be added at the position
 */
export const gridCanAccept = (
	space: GridSpaceData,
	entityId: string,
	position: GridPosition,
): boolean => {
	// Check if position is valid
	if (!isInBounds(position, space.rows, space.cols)) {
		return false;
	}

	// Check capacity
	if (space.maxCapacity !== undefined) {
		const currentCount = Object.keys(space.entityPositions).length;
		if (
			!(entityId in space.entityPositions) &&
			currentCount >= space.maxCapacity
		) {
			return false;
		}
	}

	// Check if cell already has an entity (unless multiple allowed)
	if (!space.allowMultiplePerCell) {
		for (const [_otherId, pos] of Object.entries(space.entityPositions)) {
			if (
				pos.row === position.row &&
				pos.col === position.col &&
				_otherId !== entityId
			) {
				return false;
			}
		}
	}

	return true;
};

/**
 * Gets all entity IDs at a specific grid position.
 * @param space The grid space data
 * @param position The grid position
 * @returns Array of entity IDs at that position
 */
export const gridGetEntitiesAt = (
	space: GridSpaceData,
	position: GridPosition,
): string[] => {
	const result: string[] = [];
	for (const [id, pos] of Object.entries(space.entityPositions)) {
		if (pos.row === position.row && pos.col === position.col) {
			result.push(id);
		}
	}
	return result;
};

/**
 * Checks if a position is occupied by any entity.
 * @param space The grid space data
 * @param position The grid position
 * @returns True if the position has at least one entity
 */
export const gridIsOccupied = (
	space: GridSpaceData,
	position: GridPosition,
): boolean => {
	return gridGetEntitiesAt(space, position).length > 0;
};

/**
 * Gets all empty positions in the grid.
 * @param space The grid space data
 * @returns Array of grid coordinates with no entities
 */
export const gridGetEmptyPositions = (space: GridSpaceData): GridPosition[] => {
	const emptyPositions: GridPosition[] = [];
	const occupiedPositions = gridGetOccupiedPositions(space);

	for (let row = 0; row < space.rows; row++) {
		for (let col = 0; col < space.cols; col++) {
			const isOccupied = occupiedPositions.some(
				(pos) => pos.row === row && pos.col === col,
			);
			if (!isOccupied) {
				emptyPositions.push({ row, col });
			}
		}
	}

	return emptyPositions;
};

/**
 * Gets all occupied positions in the grid.
 * @param space The grid space data
 * @returns Array of grid coordinates with at least one entity
 */
export const gridGetOccupiedPositions = (
	space: GridSpaceData,
): GridPosition[] => {
	return Object.values(space.entityPositions);
};

/**
 * Gets the number of entities in a grid space.
 * @param space The grid space data
 * @returns The entity count
 */
export const gridGetEntityCount = (space: GridSpaceData): number => {
	return Object.keys(space.entityPositions).length;
};

/**
 * Checks if a grid space is at maximum capacity.
 * @param space The grid space data
 * @returns True if the space is full
 */
export const gridIsFull = (space: GridSpaceData): boolean => {
	if (space.maxCapacity === undefined) {
		return false;
	}
	return gridGetEntityCount(space) >= space.maxCapacity;
};

/**
 * Checks if a grid space is empty.
 * @param space The grid space data
 * @returns True if the space contains no entities
 */
export const gridIsEmpty = (space: GridSpaceData): boolean => {
	return gridGetEntityCount(space) === 0;
};

// ============================================================================
// Pool Space Functions
// ============================================================================

/**
 * Adds an entity to a pool space at the specified index.
 * Mutates the pool space in-place (for use with Immer produce()).
 * @param space The pool space data to mutate
 * @param entityId The ID of the entity to add
 * @param index Optional index to insert at (defaults to end)
 * @returns True if the entity was successfully added, false otherwise
 */
export const poolAdd = (
	space: PoolSpaceData,
	entityId: string,
	index?: number,
): boolean => {
	// Check capacity
	if (space.maxCapacity !== undefined) {
		const currentCount = space.entityIds.length;
		// If entity is already in space, don't count it in capacity check
		if (
			!space.entityIds.includes(entityId) &&
			currentCount >= space.maxCapacity
		) {
			return false;
		}
	}

	// Remove entity if already in space (move case)
	const existingIndex = space.entityIds.indexOf(entityId);
	if (existingIndex !== -1) {
		space.entityIds.splice(existingIndex, 1);
	}

	// Add entity at specified index, or at the end
	const insertIndex =
		index !== undefined
			? Math.max(0, Math.min(index, space.entityIds.length))
			: space.entityIds.length;
	space.entityIds.splice(insertIndex, 0, entityId);

	return true;
};

/**
 * Removes an entity from a pool space.
 * Mutates the pool space in-place (for use with Immer produce()).
 * @param space The pool space data to mutate
 * @param entityId The ID of the entity to remove
 * @returns True if the entity was successfully removed, false otherwise
 */
export const poolRemove = (space: PoolSpaceData, entityId: string): boolean => {
	const index = space.entityIds.indexOf(entityId);
	if (index === -1) {
		return false;
	}

	space.entityIds.splice(index, 1);
	return true;
};

/**
 * Checks if a pool space contains an entity.
 * @param space The pool space data
 * @param entityId The ID of the entity to check for
 * @returns True if the entity is in the space
 */
export const poolContains = (
	space: PoolSpaceData,
	entityId: string,
): boolean => {
	return space.entityIds.includes(entityId);
};

/**
 * Gets the number of entities in a pool space.
 * @param space The pool space data
 * @returns The entity count
 */
export const poolGetEntityCount = (space: PoolSpaceData): number => {
	return space.entityIds.length;
};

/**
 * Checks if a pool space is at maximum capacity.
 * @param space The pool space data
 * @returns True if the space is full
 */
export const poolIsFull = (space: PoolSpaceData): boolean => {
	if (space.maxCapacity === undefined) {
		return false;
	}
	return poolGetEntityCount(space) >= space.maxCapacity;
};

/**
 * Checks if a pool space is empty.
 * @param space The pool space data
 * @returns True if the space contains no entities
 */
export const poolIsEmpty = (space: PoolSpaceData): boolean => {
	return poolGetEntityCount(space) === 0;
};

// ============================================================================
// Polymorphic Space Functions
// ============================================================================

/**
 * Checks if a space contains an entity (polymorphic).
 * @param space The space data
 * @param entityId The ID of the entity to check for
 * @returns True if the entity is in the space
 */
export const spaceContains = (space: SpaceData, entityId: string): boolean => {
	if (space.kind === "grid") {
		return gridContains(space, entityId);
	}
	return poolContains(space, entityId);
};

/**
 * Removes an entity from a space (polymorphic).
 * Mutates the space in-place (for use with Immer produce()).
 * @param space The space data to mutate
 * @param entityId The ID of the entity to remove
 * @returns True if the entity was successfully removed, false otherwise
 */
export const spaceRemove = (space: SpaceData, entityId: string): boolean => {
	if (space.kind === "grid") {
		return gridRemove(space, entityId);
	}
	return poolRemove(space, entityId);
};

/**
 * Gets the number of entities in a space (polymorphic).
 * @param space The space data
 * @returns The entity count
 */
export const spaceGetEntityCount = (space: SpaceData): number => {
	if (space.kind === "grid") {
		return gridGetEntityCount(space);
	}
	return poolGetEntityCount(space);
};

/**
 * Checks if a space is at maximum capacity (polymorphic).
 * @param space The space data
 * @returns True if the space is full
 */
export const spaceIsFull = (space: SpaceData): boolean => {
	if (space.kind === "grid") {
		return gridIsFull(space);
	}
	return poolIsFull(space);
};

/**
 * Checks if a space is empty (polymorphic).
 * @param space The space data
 * @returns True if the space contains no entities
 */
export const spaceIsEmpty = (space: SpaceData): boolean => {
	if (space.kind === "grid") {
		return gridIsEmpty(space);
	}
	return poolIsEmpty(space);
};
