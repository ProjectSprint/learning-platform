import { describe, expect, it } from "vitest";
import type { Action } from "../../application/state/actions";
import {
	applicationReducer,
	createDefaultState,
} from "../../application/state/reducers";
import {
	createGridSpaceData,
	createItemData,
	createPoolSpaceData,
} from "../../domain/adt";
import { isEntityInSpace } from "../../domain/read";
import { isGridSpace, isPoolSpace } from "../../domain/space/space-data";
import { createCommands } from "../commands/create-commands";

describe("createCommands", () => {
	it("supports moveEntityToGrid when destructured (no this binding dependency)", () => {
		let state = createDefaultState();

		const dispatch = (action: Action) => {
			state = applicationReducer(state, action);
		};

		const inventory = createPoolSpaceData({
			id: "inventory",
			name: "Inventory",
		});
		const board = createGridSpaceData({
			id: "board",
			name: "Board",
			rows: 1,
			cols: 1,
			metrics: { cellWidth: 1, cellHeight: 1, gapX: 0, gapY: 0 },
		});
		const entity = createItemData({
			id: "item-1",
			name: "Item 1",
			allowedPlaces: ["inventory", "board"],
			data: { type: "item" },
		});

		dispatch({ type: "SPACE_CREATED", payload: { space: inventory } });
		dispatch({ type: "SPACE_CREATED", payload: { space: board } });
		dispatch({ type: "ENTITY_CREATED", payload: { entity } });
		dispatch({
			type: "ENTITY_ADDED",
			payload: { entityId: entity.id, spaceId: inventory.id },
		});

		const commands = createCommands({ dispatch, getState: () => state });
		const { moveEntityToGrid } = commands;

		expect(moveEntityToGrid(entity.id, board.id)).toBe(true);

		const nextInventory = state.spaces[inventory.id];
		const nextBoard = state.spaces[board.id];
		expect(isPoolSpace(nextInventory)).toBe(true);
		expect(isGridSpace(nextBoard)).toBe(true);

		if (!isPoolSpace(nextInventory) || !isGridSpace(nextBoard)) {
			throw new Error("unexpected space kind");
		}

		expect(isEntityInSpace(state, entity.id, nextInventory.id)).toBe(false);
		expect(isEntityInSpace(state, entity.id, nextBoard.id)).toBe(true);
	});
});
