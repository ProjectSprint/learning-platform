import { describe, expect, it } from "vitest";
import { SquareGrid } from "../variants/SquareGrid";

describe("SquareGrid", () => {
	const metrics = {
		cellWidth: 64,
		cellHeight: 64,
		gapX: 4,
		gapY: 4,
	};

	describe("constructor and factory methods", () => {
		it("creates empty grid with specified dimensions", () => {
			const grid = SquareGrid.empty(3, 2, metrics);

			expect(grid.rows).toBe(2);
			expect(grid.cols).toBe(3);
		});

		it("creates grid from 2D array data", () => {
			const data = [
				[{ value: 1 }, { value: 2 }],
				[{ value: 3 }, { value: 4 }],
			];
			const grid = SquareGrid.fromData(data, metrics);

			expect(grid.rows).toBe(2);
			expect(grid.cols).toBe(2);

			const cell = grid.getCellAt({ row: 0, col: 1 });
			expect(cell?.data).toEqual({ value: 2 });
		});

		it("uses initializer function", () => {
			const grid = new SquareGrid({
				rows: 2,
				cols: 2,
				metrics,
				initializer: (row, col) => ({ id: `${row}-${col}` }),
			});

			const cell = grid.getCellAt({ row: 1, col: 0 });
			expect(cell?.data).toEqual({ id: "1-0" });
		});
	});

	describe("getCellAt", () => {
		it("returns cell at valid coordinate", () => {
			const grid = SquareGrid.empty(3, 2, metrics);
			const cell = grid.getCellAt({ row: 0, col: 1 });

			expect(cell).toBeDefined();
			expect(cell?.coord).toEqual({ row: 0, col: 1 });
		});

		it("returns null for out of bounds coordinate", () => {
			const grid = SquareGrid.empty(3, 2, metrics);

			expect(grid.getCellAt({ row: 2, col: 0 })).toBeNull();
			expect(grid.getCellAt({ row: 0, col: 3 })).toBeNull();
			expect(grid.getCellAt({ row: -1, col: 0 })).toBeNull();
		});
	});

	describe("updateCell", () => {
		it("updates cell data immutably", () => {
			const grid = SquareGrid.empty<{ count: number }>(2, 2, metrics);
			const updated = grid.updateCell({ row: 0, col: 0 }, { count: 5 });

			const originalCell = grid.getCellAt({ row: 0, col: 0 });
			const updatedCell = updated.getCellAt({ row: 0, col: 0 });

			expect(originalCell?.data).toBeNull();
			expect(updatedCell?.data).toEqual({ count: 5 });
			expect(updated).not.toBe(grid);
		});

		it("returns same grid for out of bounds", () => {
			const grid = SquareGrid.empty(2, 2, metrics);
			const result = grid.updateCell({ row: 5, col: 5 }, { value: 1 });

			expect(result).toBe(grid);
		});
	});

	describe("isValidCoord", () => {
		const grid = SquareGrid.empty(3, 2, metrics);

		it("returns true for valid coordinates", () => {
			expect(grid.isValidCoord({ row: 0, col: 0 })).toBe(true);
			expect(grid.isValidCoord({ row: 1, col: 2 })).toBe(true);
		});

		it("returns false for out of bounds coordinates", () => {
			expect(grid.isValidCoord({ row: 2, col: 0 })).toBe(false);
			expect(grid.isValidCoord({ row: 0, col: 3 })).toBe(false);
			expect(grid.isValidCoord({ row: -1, col: 0 })).toBe(false);
		});
	});

	describe("getAllCells", () => {
		it("returns all cells in the grid", () => {
			const grid = SquareGrid.empty(2, 3, metrics);
			const cells = grid.getAllCells();

			expect(cells).toHaveLength(6); // 2 cols * 3 rows
		});

		it("returned cells have correct coordinates", () => {
			const grid = SquareGrid.empty(2, 2, metrics);
			const cells = grid.getAllCells();

			const coords = cells.map((c) => c.coord);
			expect(coords).toContainEqual({ row: 0, col: 0 });
			expect(coords).toContainEqual({ row: 0, col: 1 });
			expect(coords).toContainEqual({ row: 1, col: 0 });
			expect(coords).toContainEqual({ row: 1, col: 1 });
		});
	});

	describe("coordToPixel", () => {
		const grid = SquareGrid.empty(3, 3, metrics);

		it("calculates pixel position for grid coordinates", () => {
			const pos = grid.coordToPixel({ row: 0, col: 0 });
			expect(pos).toEqual({ x: 0, y: 0 });
		});

		it("includes gaps in calculation", () => {
			const pos = grid.coordToPixel({ row: 1, col: 1 });
			// (64 + 4) * 1 = 68 for both x and y
			expect(pos).toEqual({ x: 68, y: 68 });
		});

		it("calculates for last cell", () => {
			const pos = grid.coordToPixel({ row: 2, col: 2 });
			// (64 + 4) * 2 = 136 for both x and y
			expect(pos).toEqual({ x: 136, y: 136 });
		});
	});

	describe("pixelToCoord", () => {
		const grid = SquareGrid.empty(3, 3, metrics);

		it("converts pixel position to grid coordinate", () => {
			const coord = grid.pixelToCoord({ x: 0, y: 0 });
			expect(coord).toEqual({ row: 0, col: 0 });
		});

		it("handles positions within cells", () => {
			const coord = grid.pixelToCoord({ x: 70, y: 70 });
			expect(coord).toEqual({ row: 1, col: 1 });
		});

		it("returns null for out of bounds positions", () => {
			const coord = grid.pixelToCoord({ x: 1000, y: 1000 });
			expect(coord).toBeNull();
		});
	});

	describe("immutability", () => {
		it("updateCell does not mutate original grid", () => {
			const grid = SquareGrid.empty<{ value: number }>(2, 2, metrics);
			const cell00Before = grid.getCellAt({ row: 0, col: 0 });

			grid.updateCell({ row: 0, col: 0 }, { value: 10 });

			const cell00After = grid.getCellAt({ row: 0, col: 0 });
			expect(cell00After?.data).toEqual(cell00Before?.data);
		});
	});
});
