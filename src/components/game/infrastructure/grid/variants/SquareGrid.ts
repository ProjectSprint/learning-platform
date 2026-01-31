/**
 * Square/rectangular grid implementation.
 * The most common grid type with axis-aligned cells arranged in rows and columns.
 */

import type { GridCoordinate, Point2D } from "../../geometry/coordinates";
import { createGridCoord } from "../../geometry/coordinates";
import type { GridMetrics } from "../core/GridBase";
import { GridBase } from "../core/GridBase";
import { GridCell } from "../core/GridCell";

/**
 * Configuration for creating a square grid from data.
 */
export type SquareGridConfig<T> = {
	rows: number;
	cols: number;
	metrics: GridMetrics;
	initializer?: (row: number, col: number) => T | null;
};

/**
 * A square/rectangular grid implementation.
 * Cells are arranged in a traditional 2D array layout.
 *
 * @template T The type of data stored in grid cells
 */
export class SquareGrid<T = unknown> extends GridBase<T> {
	private cells: GridCell<T>[][];

	/**
	 * Creates a new square grid.
	 * @param config Configuration options
	 */
	constructor(config: SquareGridConfig<T>) {
		super(config.rows, config.cols, config.metrics);

		// Initialize the cell array
		this.cells = Array.from({ length: config.rows }, (_, row) =>
			Array.from({ length: config.cols }, (_, col) => {
				const coord = createGridCoord(row, col);
				const data = config.initializer?.(row, col) ?? null;
				return new GridCell(coord, data);
			}),
		);
	}

	/**
	 * Creates a square grid from a 2D array of data.
	 */
	static fromData<T>(data: T[][], metrics: GridMetrics): SquareGrid<T> {
		const rows = data.length;
		const cols = rows > 0 ? data[0].length : 0;

		return new SquareGrid({
			rows,
			cols,
			metrics,
			initializer: (row, col) => data[row]?.[col] ?? null,
		});
	}

	/**
	 * Creates an empty square grid with the specified dimensions.
	 */
	static empty<T>(
		rows: number,
		cols: number,
		metrics: GridMetrics,
	): SquareGrid<T> {
		return new SquareGrid({ rows, cols, metrics });
	}

	getCellAt(coord: GridCoordinate): GridCell<T> | null {
		if (!this.isValidCoord(coord)) {
			return null;
		}
		return this.cells[coord.row][coord.col];
	}

	getNeighbors(coord: GridCoordinate, includeDiagonals = false): GridCell<T>[] {
		if (!this.isValidCoord(coord)) {
			return [];
		}

		const neighbors: GridCell<T>[] = [];
		const { row, col } = coord;

		// Cardinal directions (N, S, E, W)
		const cardinalOffsets = [
			[-1, 0], // North
			[1, 0], // South
			[0, 1], // East
			[0, -1], // West
		];

		// Diagonal directions (NE, NW, SE, SW)
		const diagonalOffsets = [
			[-1, 1], // Northeast
			[-1, -1], // Northwest
			[1, 1], // Southeast
			[1, -1], // Southwest
		];

		const offsets = includeDiagonals
			? [...cardinalOffsets, ...diagonalOffsets]
			: cardinalOffsets;

		for (const [rowOffset, colOffset] of offsets) {
			const neighborCoord = createGridCoord(row + rowOffset, col + colOffset);
			const neighbor = this.getCellAt(neighborCoord);
			if (neighbor) {
				neighbors.push(neighbor);
			}
		}

		return neighbors;
	}

	coordToPixel(coord: GridCoordinate): Point2D | null {
		if (!this.isValidCoord(coord)) {
			return null;
		}

		const { cellWidth, cellHeight, gapX = 0, gapY = 0 } = this.metrics;

		return {
			x: coord.col * (cellWidth + gapX),
			y: coord.row * (cellHeight + gapY),
		};
	}

	pixelToCoord(point: Point2D): GridCoordinate | null {
		const { cellWidth, cellHeight, gapX = 0, gapY = 0 } = this.metrics;

		const col = Math.floor(point.x / (cellWidth + gapX));
		const row = Math.floor(point.y / (cellHeight + gapY));

		const coord = createGridCoord(row, col);
		return this.isValidCoord(coord) ? coord : null;
	}

	getAllCells(): GridCell<T>[] {
		const allCells: GridCell<T>[] = [];
		for (let row = 0; row < this.rows; row++) {
			for (let col = 0; col < this.cols; col++) {
				allCells.push(this.cells[row][col]);
			}
		}
		return allCells;
	}

	/**
	 * Updates a cell with new data, returning a new grid instance.
	 * This maintains immutability.
	 */
	updateCell(coord: GridCoordinate, data: T | null): SquareGrid<T> {
		if (!this.isValidCoord(coord)) {
			return this;
		}

		return new SquareGrid({
			rows: this.rows,
			cols: this.cols,
			metrics: this.metrics,
			initializer: (row, col) => {
				if (row === coord.row && col === coord.col) {
					return data;
				}
				return this.cells[row][col].data;
			},
		});
	}

	/**
	 * Updates multiple cells with new data, returning a new grid instance.
	 */
	updateCells(
		updates: Array<{ coord: GridCoordinate; data: T | null }>,
	): SquareGrid<T> {
		const updateMap = new Map(
			updates.map(({ coord, data }) => [`${coord.row},${coord.col}`, data]),
		);

		return new SquareGrid({
			rows: this.rows,
			cols: this.cols,
			metrics: this.metrics,
			initializer: (row, col) => {
				const key = `${row},${col}`;
				if (updateMap.has(key)) {
					const updated = updateMap.get(key);
					return updated === undefined ? null : updated;
				}
				return this.cells[row][col].data;
			},
		});
	}

	/**
	 * Converts the grid to a 2D array of data.
	 */
	toArray(): (T | null)[][] {
		return this.cells.map((row) => row.map((cell) => cell.data));
	}

	/**
	 * Gets a neighbor in a specific direction.
	 */
	getNeighborInDirection(
		coord: GridCoordinate,
		direction: "north" | "south" | "east" | "west",
	): GridCell<T> | null {
		const offsets = {
			north: [-1, 0],
			south: [1, 0],
			east: [0, 1],
			west: [0, -1],
		};

		const [rowOffset, colOffset] = offsets[direction];
		const neighborCoord = createGridCoord(
			coord.row + rowOffset,
			coord.col + colOffset,
		);

		return this.getCellAt(neighborCoord);
	}

	/**
	 * Checks if a cell is on the edge of the grid.
	 */
	isEdgeCell(coord: GridCoordinate): boolean {
		if (!this.isValidCoord(coord)) {
			return false;
		}

		return (
			coord.row === 0 ||
			coord.row === this.rows - 1 ||
			coord.col === 0 ||
			coord.col === this.cols - 1
		);
	}

	/**
	 * Checks if a cell is a corner of the grid.
	 */
	isCornerCell(coord: GridCoordinate): boolean {
		if (!this.isValidCoord(coord)) {
			return false;
		}

		return (
			(coord.row === 0 || coord.row === this.rows - 1) &&
			(coord.col === 0 || coord.col === this.cols - 1)
		);
	}
}
