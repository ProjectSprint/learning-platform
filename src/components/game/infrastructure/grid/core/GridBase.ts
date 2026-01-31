/**
 * Abstract base class for all grid implementations.
 * Provides the foundation for different grid types (square, hex, radial, etc.)
 */

import type { GridCoordinate, Point2D } from "../../geometry/coordinates";
import { isInBounds, manhattanDistance } from "../../geometry/coordinates";
import type { GridCell } from "./GridCell";

/**
 * Configuration options for grid metrics.
 */
export type GridMetrics = {
	/** Width of a single cell in pixels */
	cellWidth: number;
	/** Height of a single cell in pixels */
	cellHeight: number;
	/** Horizontal gap between cells in pixels */
	gapX?: number;
	/** Vertical gap between cells in pixels */
	gapY?: number;
};

/**
 * Direction for grid neighbor traversal.
 */
export type GridDirection =
	| "north"
	| "south"
	| "east"
	| "west"
	| "northeast"
	| "northwest"
	| "southeast"
	| "southwest";

/**
 * Abstract base class for grid implementations.
 * Defines the contract that all concrete grid types must implement.
 *
 * @template T The type of data stored in grid cells
 */
export abstract class GridBase<T = unknown> {
	/**
	 * Number of rows in the grid.
	 */
	public readonly rows: number;

	/**
	 * Number of columns in the grid.
	 */
	public readonly cols: number;

	/**
	 * Metrics defining cell sizes and spacing.
	 */
	public readonly metrics: GridMetrics;

	/**
	 * Creates a new grid.
	 * @param rows Number of rows
	 * @param cols Number of columns
	 * @param metrics Grid cell sizing and spacing
	 */
	constructor(rows: number, cols: number, metrics: GridMetrics) {
		if (rows <= 0 || cols <= 0) {
			throw new Error("Grid dimensions must be positive");
		}

		this.rows = rows;
		this.cols = cols;
		this.metrics = metrics;
	}

	// Abstract methods that must be implemented by concrete grid types

	/**
	 * Gets the cell at the specified grid coordinate.
	 * @param coord The grid coordinate
	 * @returns The cell at the coordinate, or null if out of bounds
	 */
	abstract getCellAt(coord: GridCoordinate): GridCell<T> | null;

	/**
	 * Gets all neighboring cells of the specified cell.
	 * @param coord The grid coordinate
	 * @param includeDiagonals Whether to include diagonal neighbors
	 * @returns Array of neighboring cells
	 */
	abstract getNeighbors(
		coord: GridCoordinate,
		includeDiagonals?: boolean,
	): GridCell<T>[];

	/**
	 * Converts a grid coordinate to pixel position.
	 * Returns the top-left corner of the cell in pixel space.
	 * @param coord The grid coordinate
	 * @returns The pixel position, or null if out of bounds
	 */
	abstract coordToPixel(coord: GridCoordinate): Point2D | null;

	/**
	 * Converts a pixel position to grid coordinate.
	 * @param point The pixel position
	 * @returns The grid coordinate, or null if out of bounds
	 */
	abstract pixelToCoord(point: Point2D): GridCoordinate | null;

	/**
	 * Gets all cells in the grid.
	 * @returns Array of all cells in row-major order
	 */
	abstract getAllCells(): GridCell<T>[];

	// Concrete helper methods available to all grid types

	/**
	 * Checks if a coordinate is within grid bounds.
	 */
	isValidCoord(coord: GridCoordinate): boolean {
		return isInBounds(coord, this.rows, this.cols);
	}

	/**
	 * Gets the Manhattan distance between two grid coordinates.
	 * Useful for pathfinding and proximity calculations.
	 */
	getDistance(a: GridCoordinate, b: GridCoordinate): number {
		return manhattanDistance(a, b);
	}

	/**
	 * Gets the total width of the grid in pixels.
	 */
	getTotalWidth(): number {
		const { cellWidth, gapX = 0 } = this.metrics;
		return this.cols * cellWidth + (this.cols - 1) * gapX;
	}

	/**
	 * Gets the total height of the grid in pixels.
	 */
	getTotalHeight(): number {
		const { cellHeight, gapY = 0 } = this.metrics;
		return this.rows * cellHeight + (this.rows - 1) * gapY;
	}

	/**
	 * Gets the center point of a cell in pixel space.
	 */
	getCellCenter(coord: GridCoordinate): Point2D | null {
		const topLeft = this.coordToPixel(coord);
		if (!topLeft) {
			return null;
		}

		return {
			x: topLeft.x + this.metrics.cellWidth / 2,
			y: topLeft.y + this.metrics.cellHeight / 2,
		};
	}

	/**
	 * Gets all cells in a specific row.
	 */
	getRow(row: number): GridCell<T>[] {
		if (row < 0 || row >= this.rows) {
			return [];
		}

		const cells: GridCell<T>[] = [];
		for (let col = 0; col < this.cols; col++) {
			const cell = this.getCellAt({ row, col });
			if (cell) {
				cells.push(cell);
			}
		}
		return cells;
	}

	/**
	 * Gets all cells in a specific column.
	 */
	getColumn(col: number): GridCell<T>[] {
		if (col < 0 || col >= this.cols) {
			return [];
		}

		const cells: GridCell<T>[] = [];
		for (let row = 0; row < this.rows; row++) {
			const cell = this.getCellAt({ row, col });
			if (cell) {
				cells.push(cell);
			}
		}
		return cells;
	}

	/**
	 * Iterates over all cells in the grid.
	 * @param callback Function to call for each cell
	 */
	forEach(callback: (cell: GridCell<T>, index: number) => void): void {
		this.getAllCells().forEach(callback);
	}

	/**
	 * Maps over all cells in the grid.
	 * @param callback Function to transform each cell
	 * @returns Array of transformed values
	 */
	map<U>(callback: (cell: GridCell<T>, index: number) => U): U[] {
		return this.getAllCells().map(callback);
	}

	/**
	 * Filters cells in the grid.
	 * @param predicate Function to test each cell
	 * @returns Array of cells that pass the test
	 */
	filter(
		predicate: (cell: GridCell<T>, index: number) => boolean,
	): GridCell<T>[] {
		return this.getAllCells().filter(predicate);
	}

	/**
	 * Finds the first cell that matches a predicate.
	 * @param predicate Function to test each cell
	 * @returns The first matching cell, or undefined
	 */
	find(
		predicate: (cell: GridCell<T>, index: number) => boolean,
	): GridCell<T> | undefined {
		return this.getAllCells().find(predicate);
	}

	/**
	 * Checks if any cell matches a predicate.
	 * @param predicate Function to test each cell
	 * @returns True if any cell matches
	 */
	some(predicate: (cell: GridCell<T>, index: number) => boolean): boolean {
		return this.getAllCells().some(predicate);
	}

	/**
	 * Checks if all cells match a predicate.
	 * @param predicate Function to test each cell
	 * @returns True if all cells match
	 */
	every(predicate: (cell: GridCell<T>, index: number) => boolean): boolean {
		return this.getAllCells().every(predicate);
	}
}
