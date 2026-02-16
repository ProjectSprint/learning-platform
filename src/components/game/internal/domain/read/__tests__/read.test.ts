import { describe, expect, it } from "vitest";
import {
	createGridSpaceData,
	createItemData,
	createPoolSpaceData,
} from "../../adt";
import {
	getEntitySpaceId,
	getGridEntityPosition,
	isEntityPlacementAllowed,
	selectEntitiesByType,
	selectGridEmptyPositions,
} from "../index";

const metrics = { cellWidth: 1, cellHeight: 1 };

describe("domain/read", () => {
	it("finds entity ownership and grid position", () => {
		const board = createGridSpaceData({
			id: "board",
			rows: 2,
			cols: 2,
			metrics,
		});
		const pool = createPoolSpaceData({ id: "inventory" });

		const item = createItemData({
			id: "router-1",
			name: "Router",
			allowedPlaces: ["board", "inventory"],
		});

		board.entityPositions[item.id] = { row: 1, col: 0 };
		pool.entityIds.push("other");

		const state = {
			entities: {
				[item.id]: item,
			},
			spaces: {
				board,
				inventory: pool,
			},
		};

		expect(getEntitySpaceId(state, item.id)).toBe("board");
		expect(getGridEntityPosition(state, item.id)).toEqual({ row: 1, col: 0 });
	});

	it("validates placement through guarded read rules", () => {
		const board = createGridSpaceData({
			id: "board",
			rows: 1,
			cols: 1,
			metrics,
		});
		const item = createItemData({
			id: "router-1",
			name: "Router",
			allowedPlaces: ["inventory"],
		});

		const state = {
			entities: { [item.id]: item },
			spaces: { board },
		};

		expect(
			isEntityPlacementAllowed(state, item.id, board.id, { row: 0, col: 0 }),
		).toBe(false);
	});

	it("selects entities and empty positions", () => {
		const board = createGridSpaceData({
			id: "board",
			rows: 2,
			cols: 2,
			metrics,
		});
		const router = createItemData({
			id: "router-1",
			name: "Router",
			allowedPlaces: ["board"],
			data: { type: "router" },
		});
		const pc = createItemData({
			id: "pc-1",
			name: "PC",
			allowedPlaces: ["board"],
			data: { type: "pc" },
		});

		board.entityPositions[router.id] = { row: 0, col: 0 };

		const state = {
			entities: {
				[router.id]: { ...router, type: "router" },
				[pc.id]: { ...pc, type: "pc" },
			},
			spaces: { board },
		};

		expect(selectEntitiesByType(state, "router")).toHaveLength(1);
		expect(selectGridEmptyPositions(state, "board")).toEqual(
			expect.arrayContaining([
				{ row: 0, col: 1 },
				{ row: 1, col: 0 },
				{ row: 1, col: 1 },
			]),
		);
	});
});
