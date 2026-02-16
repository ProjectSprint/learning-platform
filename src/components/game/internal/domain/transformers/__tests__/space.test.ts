import { describe, expect, it } from "vitest";
import { createGridSpaceData, createItemData } from "../../adt";
import { tryAddEntityToSpace, tryMoveEntityAcrossSpaces } from "../space";

const metrics = { cellWidth: 1, cellHeight: 1 };

describe("domain/transformers/space", () => {
	it("adds entity and emits entered-space event", () => {
		const state = {
			entities: {
				"item-1": createItemData({
					id: "item-1",
					name: "Item",
					allowedPlaces: ["board"],
				}),
			},
			spaces: {
				board: createGridSpaceData({
					id: "board",
					rows: 1,
					cols: 1,
					metrics,
				}),
			},
		};

		const transition = tryAddEntityToSpace(state, {
			entityId: "item-1",
			spaceId: "board",
			position: { row: 0, col: 0 },
		});

		expect(transition.status).toBe("applied");
		if (transition.status === "applied") {
			expect(transition.value.events).toEqual([
				{
					type: "ENTITY_ENTERED_SPACE",
					entityId: "item-1",
					spaceId: "board",
					position: { row: 0, col: 0 },
				},
			]);
		}
	});

	it("rolls back rejected moves to preserve source ownership", () => {
		const from = createGridSpaceData({
			id: "from",
			rows: 1,
			cols: 1,
			metrics,
		});
		const to = createGridSpaceData({
			id: "to",
			rows: 1,
			cols: 1,
			metrics,
		});

		from.entityPositions["item-1"] = { row: 0, col: 0 };
		to.entityPositions["item-2"] = { row: 0, col: 0 };

		const state = {
			entities: {
				"item-1": createItemData({
					id: "item-1",
					name: "Item 1",
					allowedPlaces: ["from", "to"],
				}),
				"item-2": createItemData({
					id: "item-2",
					name: "Item 2",
					allowedPlaces: ["to"],
				}),
			},
			spaces: {
				from,
				to,
			},
		};

		const transition = tryMoveEntityAcrossSpaces(state, {
			entityId: "item-1",
			fromSpaceId: "from",
			toSpaceId: "to",
			toPosition: { row: 0, col: 0 },
		});

		expect(transition.status).toBe("noop");
		expect(state.spaces.from.kind).toBe("grid");
		expect(state.spaces.to.kind).toBe("grid");
		if (state.spaces.from.kind === "grid" && state.spaces.to.kind === "grid") {
			expect(state.spaces.from.entityPositions["item-1"]).toEqual({
				row: 0,
				col: 0,
			});
			expect(state.spaces.to.entityPositions["item-1"]).toBeUndefined();
		}
	});
});
