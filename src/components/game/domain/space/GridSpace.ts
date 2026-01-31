/**
 * Grid-based space implementation using SquareGrid from infrastructure.
 * Organizes entities in a 2D grid with positional constraints.
 * Uses composition (has-a relationship) with SquareGrid for grid operations.
 */

import type { GridCoordinate } from "../../infrastructure/geometry/coordinates";
import type { GridMetrics } from "../../infrastructure/grid/core/GridBase";
import { SquareGrid } from "../../infrastructure/grid/variants/SquareGrid";
import type { Entity } from "../entity/Entity";
import { Space, type SpaceConfig, type SpacePosition } from "./Space";

/**
 * Configuration for creating a GridSpace.
 */
export type GridSpaceConfig = SpaceConfig & {
	/** Number of rows in the grid */
	rows: number;
	/** Number of columns in the grid */
	cols: number;
	/** Grid metrics (cell sizes and spacing) */
	metrics: GridMetrics;
	/** Whether to allow multiple entities per cell */
	allowMultiplePerCell?: boolean;
};

/**
 * Position within a GridSpace.
 * Maps to a grid coordinate (row, col).
 */
export type GridPosition = GridCoordinate;

/**
 * Data stored in each grid cell.
 */
type GridCellData = {
	/** Entity IDs in this cell (supports multiple entities per cell) */
	entityIds: string[];
};

/**
 * A space that organizes entities in a 2D grid.
 * Composes SquareGrid for grid operations and adds entity management.
 */
export class GridSpace extends Space {
	/** The underlying grid structure */
	private grid: SquareGrid<GridCellData>;

	/** Map of entity ID to position for fast lookup */
	private entityPositions: Map<string, GridPosition>;

	/** Whether to allow multiple entities per cell */
	private readonly allowMultiplePerCell: boolean;

	/**
	 * Creates a new GridSpace.
	 * @param config Grid space configuration
	 */
	constructor(config: GridSpaceConfig) {
		super(config);

		this.allowMultiplePerCell = config.allowMultiplePerCell ?? false;
		this.entityPositions = new Map();

		// Initialize grid with empty cells
		this.grid = new SquareGrid({
			rows: config.rows,
			cols: config.cols,
			metrics: config.metrics,
			initializer: () => ({ entityIds: [] }),
		});
	}

	/**
	 * Gets the number of rows in the grid.
	 */
	get rows(): number {
		return this.grid.rows;
	}

	/**
	 * Gets the number of columns in the grid.
	 */
	get cols(): number {
		return this.grid.cols;
	}

	/**
	 * Gets the grid metrics.
	 */
	get metrics(): GridMetrics {
		return this.grid.metrics;
	}

	add(entity: Entity, position?: SpacePosition): boolean {
		// Position is required for grid spaces
		if (!position || !this.isGridPosition(position)) {
			return false;
		}

		const gridPos = position as GridPosition;

		// Check if we can accept this entity at this position
		if (!this.canAccept(entity, gridPos)) {
			return false;
		}

		// If entity is already in the space, remove it first
		if (this.contains(entity)) {
			this.remove(entity);
		}

		// Get the cell at the position
		const cell = this.grid.getCellAt(gridPos);
		if (!cell || !cell.data) {
			return false;
		}

		// Add entity to the cell
		const updatedData: GridCellData = {
			entityIds: [...cell.data.entityIds, entity.id],
		};

		this.grid = this.grid.updateCell(gridPos, updatedData);
		this.entityPositions.set(entity.id, gridPos);

		return true;
	}

	remove(entity: Entity): boolean {
		const position = this.entityPositions.get(entity.id);
		if (!position) {
			return false;
		}

		const cell = this.grid.getCellAt(position);
		if (!cell || !cell.data) {
			return false;
		}

		// Remove entity from the cell
		const updatedData: GridCellData = {
			entityIds: cell.data.entityIds.filter((id) => id !== entity.id),
		};

		this.grid = this.grid.updateCell(position, updatedData);
		this.entityPositions.delete(entity.id);

		return true;
	}

	contains(entity: Entity): boolean {
		return this.entityPositions.has(entity.id);
	}

	getPosition(entity: Entity): GridPosition | null {
		return this.entityPositions.get(entity.id) ?? null;
	}

	setPosition(entity: Entity, position: SpacePosition): boolean {
		if (!this.isGridPosition(position)) {
			return false;
		}

		const gridPos = position as GridPosition;

		// Entity must already be in the space
		if (!this.contains(entity)) {
			return false;
		}

		// Check if we can move to the new position
		const tempEntity = entity;
		this.remove(entity);
		const canMove = this.canAccept(tempEntity, gridPos);

		if (!canMove) {
			// Re-add the entity at its original position
			const originalPos = this.entityPositions.get(entity.id);
			if (originalPos) {
				this.add(entity, originalPos);
			}
			return false;
		}

		// Move the entity
		return this.add(entity, gridPos);
	}

	canAccept(entity: Entity, position?: SpacePosition): boolean {
		// Position is required for grid spaces
		if (!position || !this.isGridPosition(position)) {
			return false;
		}

		const gridPos = position as GridPosition;

		// Check if position is valid
		if (!this.grid.isValidCoord(gridPos)) {
			return false;
		}

		// Check capacity
		if (this.isFull() && !this.contains(entity)) {
			return false;
		}

		// Check if cell already has an entity (unless multiple allowed)
		if (!this.allowMultiplePerCell) {
			const cell = this.grid.getCellAt(gridPos);
			if (cell?.data) {
				const hasOtherEntity = cell.data.entityIds.some(
					(id) => id !== entity.id,
				);
				if (hasOtherEntity) {
					return false;
				}
			}
		}

		return true;
	}

	capacity(): { current: number; max: number | undefined } {
		return {
			current: this.entityPositions.size,
			max: this.maxCapacity,
		};
	}

	getEntities(): Entity[] {
		// This is a simplified implementation
		// In a real system, we'd maintain a reference to entities
		// For now, we return entity IDs wrapped as minimal Entity objects
		const entities: Entity[] = [];
		this.grid.forEach((cell) => {
			if (cell.data) {
				for (const entityId of cell.data.entityIds) {
					// This is a placeholder - in real use, we'd lookup actual entities
					// For now, we'll return a minimal entity representation
					entities.push({ id: entityId } as Entity);
				}
			}
		});
		return entities;
	}

	/**
	 * Gets all entities at a specific grid position.
	 * @param position The grid position
	 * @returns Array of entity IDs at that position
	 */
	getEntitiesAt(position: GridPosition): string[] {
		const cell = this.grid.getCellAt(position);
		return cell?.data?.entityIds ?? [];
	}

	/**
	 * Checks if a position is occupied by any entity.
	 * @param position The grid position
	 * @returns True if the position has at least one entity
	 */
	isOccupied(position: GridPosition): boolean {
		const entityIds = this.getEntitiesAt(position);
		return entityIds.length > 0;
	}

	/**
	 * Gets all empty positions in the grid.
	 * @returns Array of grid coordinates with no entities
	 */
	getEmptyPositions(): GridPosition[] {
		const emptyPositions: GridPosition[] = [];
		this.grid.forEach((cell) => {
			if (cell.data && cell.data.entityIds.length === 0) {
				emptyPositions.push(cell.coord);
			}
		});
		return emptyPositions;
	}

	/**
	 * Gets all occupied positions in the grid.
	 * @returns Array of grid coordinates with at least one entity
	 */
	getOccupiedPositions(): GridPosition[] {
		const occupiedPositions: GridPosition[] = [];
		this.grid.forEach((cell) => {
			if (cell.data && cell.data.entityIds.length > 0) {
				occupiedPositions.push(cell.coord);
			}
		});
		return occupiedPositions;
	}

	/**
	 * Gets the underlying grid instance.
	 * Useful for direct grid operations.
	 * @returns The SquareGrid instance
	 */
	getGrid(): SquareGrid<GridCellData> {
		return this.grid;
	}

	/**
	 * Type guard to check if a position is a valid GridPosition.
	 */
	private isGridPosition(position: SpacePosition): position is GridPosition {
		return (
			position !== undefined &&
			typeof position === "object" &&
			"row" in position &&
			"col" in position &&
			typeof position.row === "number" &&
			typeof position.col === "number"
		);
	}
}
