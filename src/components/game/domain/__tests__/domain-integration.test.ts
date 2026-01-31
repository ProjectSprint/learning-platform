/**
 * Integration tests for the domain layer.
 * Verifies that Space, Entity, and Behavior components work together correctly.
 */

import { describe, expect, it } from "vitest";
import { StubBehavior } from "../behavior";
import { Entity, Item } from "../entity";
import { GridSpace, PoolSpace } from "../space";

describe("Domain Layer Integration", () => {
	describe("Entity Creation", () => {
		it("should create a basic entity", () => {
			const entity = new Entity({
				id: "entity-1",
				type: "test-entity",
				name: "Test Entity",
			});

			expect(entity.id).toBe("entity-1");
			expect(entity.type).toBe("test-entity");
			expect(entity.name).toBe("Test Entity");
		});

		it("should create an item entity", () => {
			const item = new Item({
				id: "item-1",
				name: "Router",
				allowedPlaces: ["puzzle-1", "puzzle-2"],
				icon: { icon: "router" },
				draggable: true,
			});

			expect(item.id).toBe("item-1");
			expect(item.type).toBe("item");
			expect(item.canPlaceIn("puzzle-1")).toBe(true);
			expect(item.canPlaceIn("puzzle-3")).toBe(false);
		});
	});

	describe("PoolSpace", () => {
		it("should add and remove entities", () => {
			const pool = new PoolSpace({
				id: "pool-1",
				name: "Test Pool",
				maxCapacity: 5,
			});

			const entity = new Entity({
				id: "entity-1",
				type: "test",
			});

			expect(pool.add(entity)).toBe(true);
			expect(pool.contains(entity)).toBe(true);
			expect(pool.getCount()).toBe(1);

			expect(pool.remove(entity)).toBe(true);
			expect(pool.contains(entity)).toBe(false);
			expect(pool.isEmpty()).toBe(true);
		});

		it("should respect capacity limits", () => {
			const pool = new PoolSpace({
				id: "pool-1",
				maxCapacity: 2,
			});

			const entity1 = new Entity({ id: "e1", type: "test" });
			const entity2 = new Entity({ id: "e2", type: "test" });
			const entity3 = new Entity({ id: "e3", type: "test" });

			expect(pool.add(entity1)).toBe(true);
			expect(pool.add(entity2)).toBe(true);
			expect(pool.isFull()).toBe(true);
			expect(pool.add(entity3)).toBe(false);
		});
	});

	describe("GridSpace", () => {
		it("should add entities at specific positions", () => {
			const grid = new GridSpace({
				id: "grid-1",
				rows: 3,
				cols: 3,
				metrics: { cellWidth: 50, cellHeight: 50 },
			});

			const entity = new Entity({
				id: "entity-1",
				type: "test",
			});

			const position = { row: 1, col: 1 };
			expect(grid.add(entity, position)).toBe(true);
			expect(grid.contains(entity)).toBe(true);
			expect(grid.getPosition(entity)).toEqual(position);
		});

		it("should prevent overlapping entities", () => {
			const grid = new GridSpace({
				id: "grid-1",
				rows: 2,
				cols: 2,
				metrics: { cellWidth: 50, cellHeight: 50 },
				allowMultiplePerCell: false,
			});

			const entity1 = new Entity({ id: "e1", type: "test" });
			const entity2 = new Entity({ id: "e2", type: "test" });

			const position = { row: 0, col: 0 };
			expect(grid.add(entity1, position)).toBe(true);
			expect(grid.add(entity2, position)).toBe(false);
		});

		it("should allow multiple entities per cell when configured", () => {
			const grid = new GridSpace({
				id: "grid-1",
				rows: 2,
				cols: 2,
				metrics: { cellWidth: 50, cellHeight: 50 },
				allowMultiplePerCell: true,
			});

			const entity1 = new Entity({ id: "e1", type: "test" });
			const entity2 = new Entity({ id: "e2", type: "test" });

			const position = { row: 0, col: 0 };
			expect(grid.add(entity1, position)).toBe(true);
			expect(grid.add(entity2, position)).toBe(true);
			expect(grid.getEntitiesAt(position)).toHaveLength(2);
		});
	});

	describe("Behaviors", () => {
		it("should add behaviors to entities", () => {
			const entity = new Entity({
				id: "entity-1",
				type: "test",
			});

			const behavior = new StubBehavior("behavior-1", "move");

			entity.addBehavior(behavior);
			expect(entity.hasBehavior("behavior-1")).toBe(true);
			expect(entity.getBehaviors()).toHaveLength(1);
		});

		it("should execute behaviors", () => {
			const behavior = new StubBehavior("behavior-1", "test");
			const entity = new Entity({
				id: "entity-1",
				type: "test",
			});

			const result = behavior.execute({ entity });
			expect(result.success).toBe(true);
		});
	});

	describe("Entity State Management", () => {
		it("should manage entity state", () => {
			const entity = new Entity({
				id: "entity-1",
				type: "test",
				state: { health: 100, alive: true },
			});

			expect(entity.getStateValue("health")).toBe(100);
			expect(entity.getStateValue("alive")).toBe(true);

			entity.setStateValue("health", 50);
			expect(entity.getStateValue("health")).toBe(50);

			entity.updateState({ health: 25, mana: 100 });
			expect(entity.getStateValue("health")).toBe(25);
			expect(entity.getStateValue("mana")).toBe(100);
		});
	});

	describe("Space Helper Methods", () => {
		it("should filter entities", () => {
			const pool = new PoolSpace({ id: "pool-1" });

			const entity1 = new Entity({ id: "e1", type: "type-a" });
			const entity2 = new Entity({ id: "e2", type: "type-b" });
			const entity3 = new Entity({ id: "e3", type: "type-a" });

			pool.add(entity1);
			pool.add(entity2);
			pool.add(entity3);

			const filtered = pool.filterEntities((e) => e.type === "type-a");
			expect(filtered).toHaveLength(2);
		});

		it("should find entities by ID", () => {
			const pool = new PoolSpace({ id: "pool-1" });

			const entity = new Entity({ id: "find-me", type: "test" });
			pool.add(entity);

			const found = pool.getEntityById("find-me");
			expect(found).toBeDefined();
			expect(found?.id).toBe("find-me");
		});
	});
});
