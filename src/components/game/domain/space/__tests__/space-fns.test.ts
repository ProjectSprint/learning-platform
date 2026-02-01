/**
 * Tests for space-fns.ts
 * Tests pure functions for GridSpaceData and PoolSpaceData.
 */

import { describe, expect, it } from "vitest";
import type { SpaceData } from "../space-data";
import {
	createGridSpaceData,
	createPoolSpaceData,
	gridAdd,
	gridCanAccept,
	gridContains,
	gridGetEmptyPositions,
	gridGetEntitiesAt,
	gridGetEntityCount,
	gridGetOccupiedPositions,
	gridGetPosition,
	gridIsEmpty,
	gridIsFull,
	gridIsOccupied,
	gridRemove,
	poolAdd,
	poolContains,
	poolGetEntityCount,
	poolIsEmpty,
	poolIsFull,
	poolRemove,
	spaceContains,
	spaceGetEntityCount,
	spaceIsEmpty,
	spaceIsFull,
	spaceRemove,
} from "../space-fns";

describe("Factory Functions", () => {
	it("creates a grid space with minimal config", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 4,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		expect(space.id).toBe("grid-1");
		expect(space.kind).toBe("grid");
		expect(space.rows).toBe(3);
		expect(space.cols).toBe(4);
		expect(space.allowMultiplePerCell).toBe(false);
		expect(space.entityPositions).toEqual({});
		expect(space.maxCapacity).toBeUndefined();
	});

	it("creates a grid space with full config", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			name: "Main Grid",
			rows: 5,
			cols: 5,
			metrics: { cellWidth: 60, cellHeight: 60, gapX: 5, gapY: 5 },
			allowMultiplePerCell: true,
			maxCapacity: 20,
			metadata: { layer: 1 },
		});

		expect(space.id).toBe("grid-1");
		expect(space.name).toBe("Main Grid");
		expect(space.rows).toBe(5);
		expect(space.cols).toBe(5);
		expect(space.metrics).toEqual({
			cellWidth: 60,
			cellHeight: 60,
			gapX: 5,
			gapY: 5,
		});
		expect(space.allowMultiplePerCell).toBe(true);
		expect(space.maxCapacity).toBe(20);
		expect(space.metadata).toEqual({ layer: 1 });
	});

	it("creates a pool space with minimal config", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		expect(space.id).toBe("pool-1");
		expect(space.kind).toBe("pool");
		expect(space.layout).toBe("grid");
		expect(space.allowReorder).toBe(true);
		expect(space.entityIds).toEqual([]);
		expect(space.maxCapacity).toBeUndefined();
	});

	it("creates a pool space with full config", () => {
		const space = createPoolSpaceData({
			id: "pool-1",
			name: "Inventory",
			layout: "list",
			columns: 3,
			allowReorder: false,
			maxCapacity: 10,
			metadata: { category: "items" },
		});

		expect(space.id).toBe("pool-1");
		expect(space.name).toBe("Inventory");
		expect(space.layout).toBe("list");
		expect(space.columns).toBe(3);
		expect(space.allowReorder).toBe(false);
		expect(space.maxCapacity).toBe(10);
		expect(space.metadata).toEqual({ category: "items" });
	});

	it("createSpaceData returns grid space for grid config", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		expect(space.kind).toBe("grid");
	});

	it("createSpaceData returns pool space for pool config", () => {
		const space = createPoolSpaceData({
			id: "pool-1",
			layout: "list",
		}) as SpaceData;

		expect(space.kind).toBe("pool");
	});
});

describe("Grid Space - Add Operations", () => {
	it("adds an entity to grid space", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		const result = gridAdd(space, "ent-1", { row: 0, col: 0 });

		expect(result).toBe(true);
		expect(space.entityPositions).toEqual({ "ent-1": { row: 0, col: 0 } });
	});

	it("returns false for invalid position", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		expect(gridAdd(space, "ent-1", { row: 5, col: 5 })).toBe(false);
		expect(gridAdd(space, "ent-1", { row: -1, col: 0 })).toBe(false);
	});

	it("respects disable multiple per cell", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
			allowMultiplePerCell: false,
		});

		expect(gridAdd(space, "ent-1", { row: 0, col: 0 })).toBe(true);
		expect(gridAdd(space, "ent-2", { row: 0, col: 0 })).toBe(false);
	});

	it("allows multiple per cell when enabled", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
			allowMultiplePerCell: true,
		});

		expect(gridAdd(space, "ent-1", { row: 0, col: 0 })).toBe(true);
		expect(gridAdd(space, "ent-2", { row: 0, col: 0 })).toBe(true);
		expect(space.entityPositions).toEqual({
			"ent-1": { row: 0, col: 0 },
			"ent-2": { row: 0, col: 0 },
		});
	});

	it("moves entity when adding to new position", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		gridAdd(space, "ent-1", { row: 0, col: 0 });
		gridAdd(space, "ent-1", { row: 1, col: 1 });

		expect(space.entityPositions).toEqual({ "ent-1": { row: 1, col: 1 } });
		expect(Object.keys(space.entityPositions)).toHaveLength(1);
	});

	it("respects max capacity", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
			maxCapacity: 2,
		});

		expect(gridAdd(space, "ent-1", { row: 0, col: 0 })).toBe(true);
		expect(gridAdd(space, "ent-2", { row: 0, col: 1 })).toBe(true);
		expect(gridAdd(space, "ent-3", { row: 0, col: 2 })).toBe(false);
	});

	it("allows repositioning within capacity", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
			maxCapacity: 2,
		});

		gridAdd(space, "ent-1", { row: 0, col: 0 });
		gridAdd(space, "ent-2", { row: 0, col: 1 });
		// Moving ent-1 should work (not adding a new entity)
		expect(gridAdd(space, "ent-1", { row: 1, col: 1 })).toBe(true);
	});
});

describe("Grid Space - Remove Operations", () => {
	it("removes an entity from grid space", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		gridAdd(space, "ent-1", { row: 0, col: 0 });

		const result = gridRemove(space, "ent-1");

		expect(result).toBe(true);
		expect("ent-1" in space.entityPositions).toBe(false);
	});

	it("returns false when removing non-existent entity", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		expect(gridRemove(space, "ent-1")).toBe(false);
	});
});

describe("Grid Space - Query Operations", () => {
	it("checks if grid contains entity", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		expect(gridContains(space, "ent-1")).toBe(false);

		gridAdd(space, "ent-1", { row: 0, col: 0 });

		expect(gridContains(space, "ent-1")).toBe(true);
	});

	it("gets entity position", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		gridAdd(space, "ent-1", { row: 2, col: 1 });

		expect(gridGetPosition(space, "ent-1")).toEqual({ row: 2, col: 1 });
		expect(gridGetPosition(space, "nonexistent")).toBeUndefined();
	});

	it("checks if position is occupied", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		gridAdd(space, "ent-1", { row: 0, col: 0 });

		expect(gridIsOccupied(space, { row: 0, col: 0 })).toBe(true);
		expect(gridIsOccupied(space, { row: 0, col: 1 })).toBe(false);
	});

	it("gets entities at position", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
			allowMultiplePerCell: true,
		});

		gridAdd(space, "ent-1", { row: 0, col: 0 });
		gridAdd(space, "ent-2", { row: 0, col: 0 });
		gridAdd(space, "ent-3", { row: 1, col: 0 });

		const entitiesAt = gridGetEntitiesAt(space, { row: 0, col: 0 });
		expect(entitiesAt).toEqual(["ent-1", "ent-2"]);
	});

	it("gets occupied positions", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		gridAdd(space, "ent-1", { row: 0, col: 0 });
		gridAdd(space, "ent-2", { row: 0, col: 2 });
		gridAdd(space, "ent-3", { row: 2, col: 1 });

		const occupied = gridGetOccupiedPositions(space);
		expect(occupied).toHaveLength(3);
		expect(occupied).toContainEqual({ row: 0, col: 0 });
		expect(occupied).toContainEqual({ row: 0, col: 2 });
		expect(occupied).toContainEqual({ row: 2, col: 1 });
	});

	it("gets empty positions", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 2,
			cols: 2,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		gridAdd(space, "ent-1", { row: 0, col: 0 });

		const empty = gridGetEmptyPositions(space);
		expect(empty).toHaveLength(3);
		expect(empty).toContainEqual({ row: 0, col: 1 });
		expect(empty).toContainEqual({ row: 1, col: 0 });
		expect(empty).toContainEqual({ row: 1, col: 1 });
		expect(empty).not.toContainEqual({ row: 0, col: 0 });
	});

	it("checks if grid is empty", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		expect(gridIsEmpty(space)).toBe(true);

		gridAdd(space, "ent-1", { row: 0, col: 0 });

		expect(gridIsEmpty(space)).toBe(false);
	});

	it("gets entity count", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		expect(gridGetEntityCount(space)).toBe(0);

		gridAdd(space, "ent-1", { row: 0, col: 0 });
		gridAdd(space, "ent-2", { row: 1, col: 1 });

		expect(gridGetEntityCount(space)).toBe(2);
	});

	it("checks if grid is full (with max capacity)", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
			maxCapacity: 2,
		});

		expect(gridIsFull(space)).toBe(false);

		gridAdd(space, "ent-1", { row: 0, col: 0 });
		gridAdd(space, "ent-2", { row: 0, col: 1 });

		expect(gridIsFull(space)).toBe(true);
	});

	it("grid is never full without capacity limit", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		gridAdd(space, "ent-1", { row: 0, col: 0 });
		gridAdd(space, "ent-2", { row: 1, col: 1 });
		gridAdd(space, "ent-3", { row: 2, col: 2 });

		expect(gridIsFull(space)).toBe(false);
	});

	it("gridCanAccept checks validity correctly", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
			allowMultiplePerCell: false,
		});

		expect(gridCanAccept(space, "ent-1", { row: 0, col: 0 })).toBe(true);
		expect(gridCanAccept(space, "ent-1", { row: 5, col: 0 })).toBe(false); // Out of bounds

		gridAdd(space, "ent-1", { row: 0, col: 0 });
		expect(gridCanAccept(space, "ent-2", { row: 0, col: 0 })).toBe(false); // Occupied
		expect(gridCanAccept(space, "ent-2", { row: 1, col: 1 })).toBe(true); // Free cell
	});
});

describe("Pool Space - Add Operations", () => {
	it("adds an entity to pool space", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		const result = poolAdd(space, "ent-1");

		expect(result).toBe(true);
		expect(space.entityIds).toEqual(["ent-1"]);
	});

	it("adds entity at specific index", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		poolAdd(space, "ent-1");
		poolAdd(space, "ent-2");
		poolAdd(space, "ent-3", 1);

		expect(space.entityIds).toEqual(["ent-1", "ent-3", "ent-2"]);
	});

	it("moves entity when adding to new position", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		poolAdd(space, "ent-1");
		poolAdd(space, "ent-2");
		poolAdd(space, "ent-3");

		poolAdd(space, "ent-2", 0);

		expect(space.entityIds).toEqual(["ent-2", "ent-1", "ent-3"]);
	});

	it("handles out of bounds index gracefully", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		poolAdd(space, "ent-1");

		// Negative index should clamp to 0
		poolAdd(space, "ent-2", -1);
		// Index beyond length should clamp to end
		poolAdd(space, "ent-3", 100);

		expect(space.entityIds).toEqual(["ent-2", "ent-1", "ent-3"]);
	});

	it("respects max capacity", () => {
		const space = createPoolSpaceData({
			id: "pool-1",
			maxCapacity: 2,
		});

		expect(poolAdd(space, "ent-1")).toBe(true);
		expect(poolAdd(space, "ent-2")).toBe(true);
		expect(poolAdd(space, "ent-3")).toBe(false);
	});

	it("allows repositioning within capacity", () => {
		const space = createPoolSpaceData({
			id: "pool-1",
			maxCapacity: 2,
		});

		poolAdd(space, "ent-1");
		poolAdd(space, "ent-2");
		// Moving ent-1 should work (not adding a new entity)
		expect(poolAdd(space, "ent-1", 1)).toBe(true);
		expect(space.entityIds.length).toBe(2);
	});
});

describe("Pool Space - Remove Operations", () => {
	it("removes an entity from pool space", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		poolAdd(space, "ent-1");
		poolAdd(space, "ent-2");

		const result = poolRemove(space, "ent-1");

		expect(result).toBe(true);
		expect(space.entityIds).toEqual(["ent-2"]);
	});

	it("returns false when removing non-existent entity", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		expect(poolRemove(space, "ent-1")).toBe(false);
	});
});

describe("Pool Space - Query Operations", () => {
	it("checks if pool contains entity", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		expect(poolContains(space, "ent-1")).toBe(false);

		poolAdd(space, "ent-1");

		expect(poolContains(space, "ent-1")).toBe(true);
	});

	it("gets entity count", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		expect(poolGetEntityCount(space)).toBe(0);

		poolAdd(space, "ent-1");
		poolAdd(space, "ent-2");
		poolAdd(space, "ent-3");

		expect(poolGetEntityCount(space)).toBe(3);
	});

	it("checks if pool is empty", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		expect(poolIsEmpty(space)).toBe(true);

		poolAdd(space, "ent-1");

		expect(poolIsEmpty(space)).toBe(false);
	});

	it("checks if pool is full with capacity", () => {
		const space = createPoolSpaceData({
			id: "pool-1",
			maxCapacity: 2,
		});

		expect(poolIsFull(space)).toBe(false);

		poolAdd(space, "ent-1");
		poolAdd(space, "ent-2");

		expect(poolIsFull(space)).toBe(true);
	});

	it("pool is never full without capacity", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		poolAdd(space, "ent-1");
		poolAdd(space, "ent-2");
		poolAdd(space, "ent-3");

		expect(poolIsFull(space)).toBe(false);
	});
});

describe("Polymorphic Space Functions", () => {
	it("spaceContains works for grid space", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		expect(spaceContains(space, "ent-1")).toBe(false);

		gridAdd(space, "ent-1", { row: 0, col: 0 });

		expect(spaceContains(space, "ent-1")).toBe(true);
	});

	it("spaceContains works for pool space", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		expect(spaceContains(space, "ent-1")).toBe(false);

		poolAdd(space, "ent-1");

		expect(spaceContains(space, "ent-1")).toBe(true);
	});

	it("spaceRemove works for grid space", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		gridAdd(space, "ent-1", { row: 0, col: 0 });

		expect(spaceRemove(space, "ent-1")).toBe(true);
		expect("ent-1" in space.entityPositions).toBe(false);
	});

	it("spaceRemove works for pool space", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		poolAdd(space, "ent-1");

		expect(spaceRemove(space, "ent-1")).toBe(true);
		expect(space.entityIds).toEqual([]);
	});

	it("spaceGetEntityCount works for grid space", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		gridAdd(space, "ent-1", { row: 0, col: 0 });
		gridAdd(space, "ent-2", { row: 1, col: 1 });

		expect(spaceGetEntityCount(space)).toBe(2);
	});

	it("spaceGetEntityCount works for pool space", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		poolAdd(space, "ent-1");
		poolAdd(space, "ent-2");

		expect(spaceGetEntityCount(space)).toBe(2);
	});

	it("spaceIsFull works for grid space", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
			maxCapacity: 1,
		});

		expect(spaceIsFull(space)).toBe(false);

		gridAdd(space, "ent-1", { row: 0, col: 0 });

		expect(spaceIsFull(space)).toBe(true);
	});

	it("spaceIsFull works for pool space", () => {
		const space = createPoolSpaceData({
			id: "pool-1",
			maxCapacity: 1,
		});

		expect(spaceIsFull(space)).toBe(false);

		poolAdd(space, "ent-1");

		expect(spaceIsFull(space)).toBe(true);
	});

	it("spaceIsEmpty works for grid space", () => {
		const space = createGridSpaceData({
			id: "grid-1",
			rows: 3,
			cols: 3,
			metrics: { cellWidth: 50, cellHeight: 50 },
		});

		expect(spaceIsEmpty(space)).toBe(true);

		gridAdd(space, "ent-1", { row: 0, col: 0 });

		expect(spaceIsEmpty(space)).toBe(false);
	});

	it("spaceIsEmpty works for pool space", () => {
		const space = createPoolSpaceData({ id: "pool-1" });

		expect(spaceIsEmpty(space)).toBe(true);

		poolAdd(space, "ent-1");

		expect(spaceIsEmpty(space)).toBe(false);
	});
});
