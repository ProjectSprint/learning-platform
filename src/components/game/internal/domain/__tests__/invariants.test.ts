import { describe, expect, it } from "vitest";
import {
	createGridSpaceData,
	createItemData,
	createPoolSpaceData,
} from "../adt";
import {
	assertSingleSpaceOwnership,
	findOwnershipViolations,
} from "../invariants";

const metrics = { cellWidth: { base: 1 }, cellHeight: { base: 1 } };

describe("domain invariants", () => {
	it("passes when each entity belongs to at most one space", () => {
		const board = createGridSpaceData({
			id: "board",
			rows: 1,
			cols: 1,
			metrics,
		});
		const inventory = createPoolSpaceData({ id: "inventory" });
		const entity = createItemData({
			id: "router-1",
			name: "Router",
			allowedPlaces: ["board", "inventory"],
		});

		board.entityPositions[entity.id] = { row: 0, col: 0 };
		const state = {
			entities: { [entity.id]: entity },
			spaces: { board, inventory },
		};

		expect(() => assertSingleSpaceOwnership(state)).not.toThrow();
		expect(findOwnershipViolations(state)).toHaveLength(0);
	});

	it("reports duplicated ownership across spaces", () => {
		const board = createGridSpaceData({
			id: "board",
			rows: 1,
			cols: 1,
			metrics,
		});
		const inventory = createPoolSpaceData({ id: "inventory" });
		const entity = createItemData({
			id: "router-1",
			name: "Router",
			allowedPlaces: ["board", "inventory"],
		});

		board.entityPositions[entity.id] = { row: 0, col: 0 };
		inventory.entityIds.push(entity.id);
		const state = {
			entities: { [entity.id]: entity },
			spaces: { board, inventory },
		};

		expect(findOwnershipViolations(state)).toHaveLength(1);
		expect(() => assertSingleSpaceOwnership(state)).toThrow(
			"single-space ownership violated",
		);
	});
});
