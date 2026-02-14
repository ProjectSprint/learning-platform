import { describe, expect, it } from "vitest";
import {
	cloneItemData,
	createGridSpaceData,
	createItemData,
	createPoolSpaceData,
} from "../index";

describe("domain/adt constructors", () => {
	it("builds item data with stable defaults", () => {
		const item = createItemData({
			id: "router-1",
			name: "Router",
			allowedPlaces: ["inventory", "board"],
		});

		expect(item.id).toBe("router-1");
		expect(item.type).toBe("item");
		expect(item.draggable).toBe(true);
		expect(item.allowedPlaces).toEqual(["inventory", "board"]);
		expect(item.state).toEqual({});
		expect(item.visual).toEqual({});
	});

	it("creates independent clones for mutable nested fields", () => {
		const source = createItemData({
			id: "router-1",
			name: "Router",
			allowedPlaces: ["inventory", "board"],
			visual: { color: "blue" },
			state: { active: true },
		});
		const cloned = cloneItemData(source, "router-2");

		cloned.visual.color = "green";
		cloned.state.active = false;

		expect(source.id).toBe("router-1");
		expect(cloned.id).toBe("router-2");
		expect(source.visual.color).toBe("blue");
		expect(source.state.active).toBe(true);
	});

	it("builds spaces with empty entity containers", () => {
		const grid = createGridSpaceData({
			id: "board",
			rows: 1,
			cols: 1,
			metrics: { cellWidth: 1, cellHeight: 1 },
		});
		const pool = createPoolSpaceData({ id: "inventory" });

		expect(grid.kind).toBe("grid");
		expect(grid.entityPositions).toEqual({});
		expect(pool.kind).toBe("pool");
		expect(pool.entityIds).toEqual([]);
	});
});
