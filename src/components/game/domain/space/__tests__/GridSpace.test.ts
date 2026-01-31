import { describe, expect, it } from "vitest";
import { Entity } from "../../entity/Entity";
import { GridSpace } from "../GridSpace";

describe("GridSpace", () => {
	const config = {
		id: "test-grid",
		rows: 3,
		cols: 3,
		metrics: {
			cellWidth: 64,
			cellHeight: 64,
			gapX: 4,
			gapY: 4,
		},
	};

	const createTestEntity = (id: string) =>
		new Entity({ id, type: "test-item" });

	describe("constructor", () => {
		it("creates grid space with config", () => {
			const space = new GridSpace(config);

			expect(space.id).toBe("test-grid");
			expect(space.rows).toBe(3);
			expect(space.cols).toBe(3);
			expect(space.getEntities()).toHaveLength(0);
		});
	});

	describe("add", () => {
		it("adds entity at valid position", () => {
			const space = new GridSpace(config);
			const entity = createTestEntity("item-1");

			const success = space.add(entity, { row: 0, col: 0 });

			expect(success).toBe(true);
			expect(space.contains(entity)).toBe(true);
			expect(space.getPosition(entity)).toEqual({ row: 0, col: 0 });
		});

		it("returns false for invalid position", () => {
			const space = new GridSpace(config);
			const entity = createTestEntity("item-1");

			const success = space.add(entity, { row: 10, col: 10 });

			expect(success).toBe(false);
			expect(space.contains(entity)).toBe(false);
		});

		it("returns false for missing position", () => {
			const space = new GridSpace(config);
			const entity = createTestEntity("item-1");

			const success = space.add(entity);

			expect(success).toBe(false);
		});

		it("prevents duplicate entity additions", () => {
			const space = new GridSpace(config);
			const entity = createTestEntity("item-1");

			space.add(entity, { row: 0, col: 0 });
			const secondAdd = space.add(entity, { row: 1, col: 1 });

			// Should move the entity, not reject
			expect(secondAdd).toBe(true);
			expect(space.getPosition(entity)).toEqual({ row: 1, col: 1 });
		});

		it("enforces single entity per cell by default", () => {
			const space = new GridSpace(config);
			const entity1 = createTestEntity("item-1");
			const entity2 = createTestEntity("item-2");

			space.add(entity1, { row: 0, col: 0 });
			const success = space.add(entity2, { row: 0, col: 0 });

			expect(success).toBe(false);
			expect(space.contains(entity2)).toBe(false);
		});

		it("allows multiple entities per cell when configured", () => {
			const space = new GridSpace({ ...config, allowMultiplePerCell: true });
			const entity1 = createTestEntity("item-1");
			const entity2 = createTestEntity("item-2");

			space.add(entity1, { row: 0, col: 0 });
			const success = space.add(entity2, { row: 0, col: 0 });

			expect(success).toBe(true);
			expect(space.contains(entity1)).toBe(true);
			expect(space.contains(entity2)).toBe(true);
		});

		it("enforces max capacity", () => {
			const space = new GridSpace({ ...config, maxCapacity: 2 });
			const entity1 = createTestEntity("item-1");
			const entity2 = createTestEntity("item-2");
			const entity3 = createTestEntity("item-3");

			space.add(entity1, { row: 0, col: 0 });
			space.add(entity2, { row: 0, col: 1 });
			const success = space.add(entity3, { row: 0, col: 2 });

			expect(success).toBe(false);
			expect(space.contains(entity3)).toBe(false);
		});
	});

	describe("remove", () => {
		it("removes entity from space", () => {
			const space = new GridSpace(config);
			const entity = createTestEntity("item-1");

			space.add(entity, { row: 0, col: 0 });
			const success = space.remove(entity);

			expect(success).toBe(true);
			expect(space.contains(entity)).toBe(false);
			expect(space.getPosition(entity)).toBeNull();
		});

		it("returns false if entity not in space", () => {
			const space = new GridSpace(config);
			const entity = createTestEntity("item-1");

			const success = space.remove(entity);

			expect(success).toBe(false);
		});
	});

	describe("setPosition / move", () => {
		it("moves entity to new position", () => {
			const space = new GridSpace(config);
			const entity = createTestEntity("item-1");

			space.add(entity, { row: 0, col: 0 });
			const success = space.setPosition(entity, { row: 1, col: 1 });

			expect(success).toBe(true);
			expect(space.getPosition(entity)).toEqual({ row: 1, col: 1 });
		});

		it("returns false for invalid move", () => {
			const space = new GridSpace(config);
			const entity = createTestEntity("item-1");

			space.add(entity, { row: 0, col: 0 });
			const success = space.setPosition(entity, { row: 10, col: 10 });

			expect(success).toBe(false);
			expect(space.getPosition(entity)).toEqual({ row: 0, col: 0 });
		});

		it("returns false if entity not in space", () => {
			const space = new GridSpace(config);
			const entity = createTestEntity("item-1");

			const success = space.setPosition(entity, { row: 0, col: 0 });

			expect(success).toBe(false);
		});
	});

	describe("getEntitiesAt", () => {
		it("returns entity IDs at position", () => {
			const space = new GridSpace({ ...config, allowMultiplePerCell: true });
			const entity1 = createTestEntity("item-1");
			const entity2 = createTestEntity("item-2");

			space.add(entity1, { row: 0, col: 0 });
			space.add(entity2, { row: 0, col: 0 });

			const entityIds = space.getEntitiesAt({ row: 0, col: 0 });

			expect(entityIds).toHaveLength(2);
			expect(entityIds).toContain("item-1");
			expect(entityIds).toContain("item-2");
		});

		it("returns empty array for empty cell", () => {
			const space = new GridSpace(config);
			const entityIds = space.getEntitiesAt({ row: 0, col: 0 });

			expect(entityIds).toHaveLength(0);
		});
	});

	describe("capacity", () => {
		it("tracks current capacity", () => {
			const space = new GridSpace({ ...config, maxCapacity: 5 });
			const entity1 = createTestEntity("item-1");
			const entity2 = createTestEntity("item-2");

			expect(space.capacity()).toEqual({ current: 0, max: 5 });

			space.add(entity1, { row: 0, col: 0 });
			expect(space.capacity()).toEqual({ current: 1, max: 5 });

			space.add(entity2, { row: 0, col: 1 });
			expect(space.capacity()).toEqual({ current: 2, max: 5 });
		});

		it("reports unlimited capacity", () => {
			const space = new GridSpace(config);

			expect(space.capacity().max).toBeUndefined();
		});

		it("checks if full", () => {
			const space = new GridSpace({ ...config, maxCapacity: 1 });
			const entity = createTestEntity("item-1");

			expect(space.isFull()).toBe(false);

			space.add(entity, { row: 0, col: 0 });
			expect(space.isFull()).toBe(true);
		});

		it("checks if empty", () => {
			const space = new GridSpace(config);
			const entity = createTestEntity("item-1");

			expect(space.isEmpty()).toBe(true);

			space.add(entity, { row: 0, col: 0 });
			expect(space.isEmpty()).toBe(false);
		});
	});

	describe("canAccept", () => {
		it("returns true for valid placement", () => {
			const space = new GridSpace(config);
			const entity = createTestEntity("item-1");

			expect(space.canAccept(entity, { row: 0, col: 0 })).toBe(true);
		});

		it("returns false for invalid position", () => {
			const space = new GridSpace(config);
			const entity = createTestEntity("item-1");

			expect(space.canAccept(entity, { row: 10, col: 10 })).toBe(false);
		});

		it("returns false when cell occupied", () => {
			const space = new GridSpace(config);
			const entity1 = createTestEntity("item-1");
			const entity2 = createTestEntity("item-2");

			space.add(entity1, { row: 0, col: 0 });

			expect(space.canAccept(entity2, { row: 0, col: 0 })).toBe(false);
		});

		it("returns false when at max capacity", () => {
			const space = new GridSpace({ ...config, maxCapacity: 1 });
			const entity1 = createTestEntity("item-1");
			const entity2 = createTestEntity("item-2");

			space.add(entity1, { row: 0, col: 0 });

			expect(space.canAccept(entity2, { row: 0, col: 1 })).toBe(false);
		});
	});
});
