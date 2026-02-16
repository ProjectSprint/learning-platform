/**
 * Represents a single cell in a grid.
 * Provides a generic container for grid cell data with position information.
 */

import type { GridCoordinate } from "../../geometry/coordinates";

/**
 * A cell in a grid with position and optional data.
 * @template T The type of data stored in the cell
 */
export class GridCell<T = unknown> {
	/**
	 * The grid coordinate of this cell.
	 */
	public readonly coord: GridCoordinate;

	/**
	 * Optional data associated with this cell.
	 */
	public readonly data: T | null;

	/**
	 * Creates a new GridCell.
	 * @param coord The grid coordinate of this cell
	 * @param data Optional data to store in this cell
	 */
	constructor(coord: GridCoordinate, data: T | null = null) {
		this.coord = coord;
		this.data = data;
	}

	/**
	 * Gets the row index of this cell.
	 */
	get row(): number {
		return this.coord.row;
	}

	/**
	 * Gets the column index of this cell.
	 */
	get col(): number {
		return this.coord.col;
	}

	/**
	 * Creates a new GridCell with updated data.
	 * @param data The new data for the cell
	 * @returns A new GridCell instance with the updated data
	 */
	withData<U>(data: U | null): GridCell<U> {
		return new GridCell(this.coord, data);
	}

	/**
	 * Checks if this cell has data.
	 */
	hasData(): this is GridCell<T> & { data: T } {
		return this.data !== null;
	}

	/**
	 * Creates a string representation of this cell.
	 */
	toString(): string {
		return `GridCell(${this.row}, ${this.col})`;
	}

	/**
	 * Checks if this cell is at the same position as another cell.
	 */
	equals(other: GridCell<unknown>): boolean {
		return this.row === other.row && this.col === other.col;
	}
}
