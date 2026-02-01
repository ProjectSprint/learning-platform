/**
 * Tests for validation.ts
 * Tests domain validation functions for entity placement in spaces.
 */

import { describe, expect, it } from "vitest";
import type { GameState } from "@/components/game/game-provider";
import type { EntityData } from "../../entity/entity-data";
import { createEntityData, createItemData } from "../../entity/entity-fns";
import type { SpaceData } from "../space-data";
import {
	createGridSpaceData,
	createPoolSpaceData,
	gridAdd,
} from "../space-fns";
import { canEntityBePlaced, findEntitySpace } from "../validation";

/**
 * Helper to create a minimal valid GameState for testing.
 */
function createTestGameState(
	spaces: Record<string, SpaceData>,
	entities: Record<string, EntityData>,
): GameState {
	return {
		phase: "setup",
		spaces,
		entities,
		arrows: [],
		terminal: { visible: false, prompt: "", history: [] },
		hint: { visible: false, content: null },
		overlay: { activeModal: null },
		question: { id: "test", status: "in_progress" },
	};
}

describe("validation", () => {
	describe("canEntityBePlaced", () => {
		it("should allow placement in GridSpace when entity allowedPlaces includes space", () => {
			const entity = createItemData({
				id: "router-1",
				name: "Router",
				icon: { icon: "router" },
				allowedPlaces: ["router-board"],
			});

			const space = createGridSpaceData({
				id: "router-board",
				name: "Router Board",
				rows: 1,
				cols: 1,
				metrics: { cellWidth: 64, cellHeight: 64 },
				maxCapacity: 1,
			});

			const gameState = createTestGameState(
				{ "router-board": space },
				{ "router-1": entity },
			);

			expect(
				canEntityBePlaced(gameState, "router-1", "router-board", {
					row: 0,
					col: 0,
				}),
			).toBe(true);
		});

		it("should reject placement in GridSpace when allowedPlaces excludes space", () => {
			const entity = createItemData({
				id: "router-1",
				name: "Router",
				icon: { icon: "router" },
				allowedPlaces: ["server-board"], // different space
			});

			const space = createGridSpaceData({
				id: "router-board",
				name: "Router Board",
				rows: 1,
				cols: 1,
				metrics: { cellWidth: 64, cellHeight: 64 },
				maxCapacity: 1,
			});

			const gameState = createTestGameState(
				{ "router-board": space },
				{ "router-1": entity },
			);

			expect(
				canEntityBePlaced(gameState, "router-1", "router-board", {
					row: 0,
					col: 0,
				}),
			).toBe(false);
		});

		it("should allow placement when allowedPlaces includes 'inventory'", () => {
			const entity = createItemData({
				id: "router-1",
				name: "Router",
				icon: { icon: "router" },
				allowedPlaces: ["inventory"],
			});

			const space = createGridSpaceData({
				id: "router-board",
				name: "Router Board",
				rows: 1,
				cols: 1,
				metrics: { cellWidth: 64, cellHeight: 64 },
				maxCapacity: 1,
			});

			const gameState = createTestGameState(
				{ "router-board": space },
				{ "router-1": entity },
			);

			expect(
				canEntityBePlaced(gameState, "router-1", "router-board", {
					row: 0,
					col: 0,
				}),
			).toBe(true);
		});

		it("should respect GridSpace capacity", () => {
			const entity1 = createItemData({
				id: "router-1",
				name: "Router 1",
				icon: { icon: "router" },
				allowedPlaces: ["router-board"],
			});

			const entity2 = createItemData({
				id: "router-2",
				name: "Router 2",
				icon: { icon: "router" },
				allowedPlaces: ["router-board"],
			});

			const space = createGridSpaceData({
				id: "router-board",
				name: "Router Board",
				rows: 1,
				cols: 1,
				metrics: { cellWidth: 64, cellHeight: 64 },
				maxCapacity: 1, // max 1 entity
			});

			// Add entity1 to fill the capacity
			gridAdd(space, "router-1", { row: 0, col: 0 });

			const gameState = createTestGameState(
				{ "router-board": space },
				{ "router-1": entity1, "router-2": entity2 },
			);

			// Should reject entity2 because space is at capacity
			expect(
				canEntityBePlaced(gameState, "router-2", "router-board", {
					row: 0,
					col: 0,
				}),
			).toBe(false);

			// Should allow entity1 to move within the same space
			expect(
				canEntityBePlaced(gameState, "router-1", "router-board", {
					row: 0,
					col: 0,
				}),
			).toBe(true);
		});

		it("should reject non-Item entity (no allowedPlaces property)", () => {
			const entity = createEntityData({
				id: "non-item-1",
				type: "non-item",
				name: "Non Item",
			});

			const space = createGridSpaceData({
				id: "grid-board",
				name: "Grid Board",
				rows: 1,
				cols: 1,
				metrics: { cellWidth: 64, cellHeight: 64 },
			});

			const gameState = createTestGameState(
				{ "grid-board": space },
				{ "non-item-1": entity },
			);

			// Non-items don't pass allowedPlaces check
			expect(
				canEntityBePlaced(gameState, "non-item-1", "grid-board", {
					row: 0,
					col: 0,
				}),
			).toBe(false);
		});

		it("should handle GridSpace bounds checking", () => {
			const entity = createItemData({
				id: "router-1",
				name: "Router",
				icon: { icon: "router" },
				allowedPlaces: ["router-board"],
			});

			const space = createGridSpaceData({
				id: "router-board",
				name: "Router Board",
				rows: 2,
				cols: 2,
				metrics: { cellWidth: 64, cellHeight: 64 },
			});

			const gameState = createTestGameState(
				{ "router-board": space },
				{ "router-1": entity },
			);

			// Valid position
			expect(
				canEntityBePlaced(gameState, "router-1", "router-board", {
					row: 0,
					col: 0,
				}),
			).toBe(true);

			// Invalid position (out of bounds)
			expect(
				canEntityBePlaced(gameState, "router-1", "router-board", {
					row: 5,
					col: 5,
				}),
			).toBe(false);
		});

		it("should reject when entity does not exist", () => {
			const space = createGridSpaceData({
				id: "router-board",
				name: "Router Board",
				rows: 1,
				cols: 1,
				metrics: { cellWidth: 64, cellHeight: 64 },
			});

			const gameState = createTestGameState(
				{ "router-board": space },
				{} as Record<string, EntityData>,
			);

			expect(
				canEntityBePlaced(gameState, "non-existent-1", "router-board", {
					row: 0,
					col: 0,
				}),
			).toBe(false);
		});

		it("should reject when space does not exist", () => {
			const entity = createItemData({
				id: "router-1",
				name: "Router",
				icon: { icon: "router" },
				allowedPlaces: ["non-existent-space"],
			});

			const gameState = createTestGameState({} as Record<string, SpaceData>, {
				"router-1": entity,
			});

			expect(
				canEntityBePlaced(gameState, "router-1", "non-existent-space", {
					row: 0,
					col: 0,
				}),
			).toBe(false);
		});
	});

	describe("canEntityBePlaced with PoolSpace", () => {
		it("should allow PoolSpace placement if allowed", () => {
			const entity = createItemData({
				id: "router-1",
				name: "Router",
				icon: { icon: "router" },
				allowedPlaces: ["inventory"],
			});

			const space = createPoolSpaceData({
				id: "inventory",
				name: "Inventory",
				metadata: { visible: true },
			});

			const gameState = createTestGameState(
				{ inventory: space },
				{ "router-1": entity },
			);

			// PoolSpace doesn't need position
			expect(canEntityBePlaced(gameState, "router-1", "inventory")).toBe(true);
		});

		it("should reject PoolSpace placement if not allowed", () => {
			const entity = createItemData({
				id: "router-1",
				name: "Router",
				icon: { icon: "router" },
				allowedPlaces: ["specific-board"], // specific, not inventory
			});

			const space = createPoolSpaceData({
				id: "inventory",
				name: "Inventory",
				metadata: { visible: true },
			});

			const gameState = createTestGameState(
				{ inventory: space },
				{ "router-1": entity },
			);

			expect(canEntityBePlaced(gameState, "router-1", "inventory")).toBe(false);
		});

		it("should respect PoolSpace capacity", () => {
			const entity1 = createItemData({
				id: "router-1",
				name: "Router 1",
				icon: { icon: "router" },
				allowedPlaces: ["inventory"],
			});

			const entity2 = createItemData({
				id: "router-2",
				name: "Router 2",
				icon: { icon: "router" },
				allowedPlaces: ["inventory"],
			});

			const space = createPoolSpaceData({
				id: "inventory",
				name: "Inventory",
				maxCapacity: 1, // max 1 entity
			});

			// Manually add entity1 to the pool to fill capacity
			space.entityIds.push("router-1");

			const gameState = createTestGameState(
				{ inventory: space },
				{ "router-1": entity1, "router-2": entity2 },
			);

			// Should reject entity2 because pool is at capacity
			expect(canEntityBePlaced(gameState, "router-2", "inventory")).toBe(false);

			// Should allow entity1 (already in pool)
			expect(canEntityBePlaced(gameState, "router-1", "inventory")).toBe(true);
		});
	});

	describe("findEntitySpace", () => {
		it("should return space ID when entity found in GridSpace", () => {
			const space = createGridSpaceData({
				id: "router-board",
				name: "Router Board",
				rows: 1,
				cols: 1,
				metrics: { cellWidth: 64, cellHeight: 64 },
			});

			// Add entity to grid space
			gridAdd(space, "router-1", { row: 0, col: 0 });

			const gameState = createTestGameState(
				{ "router-board": space },
				{
					"router-1": createItemData({
						id: "router-1",
						name: "Router",
						icon: { icon: "router" },
						allowedPlaces: ["router-board"],
					}),
				},
			);

			expect(findEntitySpace(gameState, "router-1")).toBe("router-board");
		});

		it("should return space ID when entity found in PoolSpace", () => {
			const space = createPoolSpaceData({
				id: "inventory",
				name: "Inventory",
			});

			// Add entity to pool space
			space.entityIds.push("router-1");

			const gameState = createTestGameState(
				{ inventory: space },
				{
					"router-1": createItemData({
						id: "router-1",
						name: "Router",
						icon: { icon: "router" },
						allowedPlaces: ["inventory"],
					}),
				},
			);

			expect(findEntitySpace(gameState, "router-1")).toBe("inventory");
		});

		it("should return null when entity not found", () => {
			const space = createGridSpaceData({
				id: "router-board",
				name: "Router Board",
				rows: 1,
				cols: 1,
				metrics: { cellWidth: 64, cellHeight: 64 },
			});

			const gameState = createTestGameState(
				{ "router-board": space },
				{
					"router-2": createItemData({
						id: "router-2",
						name: "Router 2",
						icon: { icon: "router" },
						allowedPlaces: ["router-board"],
					}),
				},
			);

			// router-1 doesn't exist in any space
			expect(findEntitySpace(gameState, "router-1")).toBeNull();
		});

		it("should search across multiple spaces", () => {
			const space1 = createGridSpaceData({
				id: "router-board",
				name: "Router Board",
				rows: 1,
				cols: 1,
				metrics: { cellWidth: 64, cellHeight: 64 },
			});

			const space2 = createPoolSpaceData({
				id: "inventory",
				name: "Inventory",
			});

			gridAdd(space1, "router-1", { row: 0, col: 0 });
			space2.entityIds.push("router-2");

			const gameState = createTestGameState(
				{
					"router-board": space1,
					inventory: space2,
				},
				{
					"router-1": createItemData({
						id: "router-1",
						name: "Router 1",
						icon: { icon: "router" },
						allowedPlaces: ["router-board"],
					}),
					"router-2": createItemData({
						id: "router-2",
						name: "Router 2",
						icon: { icon: "router" },
						allowedPlaces: ["inventory"],
					}),
				},
			);

			expect(findEntitySpace(gameState, "router-1")).toBe("router-board");
			expect(findEntitySpace(gameState, "router-2")).toBe("inventory");
		});
	});
});
