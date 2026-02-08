import { describe, expect, it } from "vitest";
import { createItemData } from "../../../../domain/entity/entity-fns";
import { createGridSpaceData } from "../../../../domain/space/space-fns";
import { applicationReducer, createDefaultState } from "../index";

const metrics = { cellWidth: 1, cellHeight: 1 };

const resetEventQueue = <T extends { eventQueue: unknown }>(state: T) => {
	return {
		...state,
		eventQueue: { events: [], lastEventId: 0, lastActionId: 0 },
	};
};

describe("game events", () => {
	it("emits a single ENTITY_MOVED event on ENTITY_MOVED", () => {
		let state = createDefaultState();

		state = applicationReducer(state, {
			type: "SPACE_CREATED",
			payload: {
				space: createGridSpaceData({
					id: "from",
					rows: 1,
					cols: 1,
					metrics,
				}),
			},
		});
		state = applicationReducer(state, {
			type: "SPACE_CREATED",
			payload: {
				space: createGridSpaceData({
					id: "to",
					rows: 1,
					cols: 1,
					metrics,
				}),
			},
		});

		state = applicationReducer(state, {
			type: "ENTITY_CREATED",
			payload: {
				entity: createItemData({
					id: "item-1",
					name: "Item",
					allowedPlaces: ["from", "to"],
				}),
			},
		});

		state = applicationReducer(state, {
			type: "ENTITY_ADDED",
			payload: {
				entityId: "item-1",
				spaceId: "from",
				position: { row: 0, col: 0 },
			},
		});

		state = resetEventQueue(state);

		state = applicationReducer(state, {
			type: "ENTITY_MOVED",
			payload: {
				entityId: "item-1",
				fromSpaceId: "from",
				toSpaceId: "to",
				toPosition: { row: 0, col: 0 },
			},
		});

		expect(state.eventQueue.events).toHaveLength(1);
		const [event] = state.eventQueue.events;
		expect(event.type).toBe("ENTITY_MOVED");
		if (event.type === "ENTITY_MOVED") {
			expect(event.fromSpaceId).toBe("from");
			expect(event.toSpaceId).toBe("to");
			expect(event.fromPosition).toEqual({ row: 0, col: 0 });
			expect(event.toPosition).toEqual({ row: 0, col: 0 });
		}
		expect(state.eventQueue.lastActionId).toBe(1);
		expect(state.eventQueue.lastEventId).toBe(1);
		if (event) {
			expect(event.actionId).toBe(1);
			expect(event.eventId).toBe(1);
		}
	});

	it("emits MODAL_CLOSED events for all visible modals", () => {
		let state = createDefaultState();

		state = applicationReducer(state, {
			type: "OPEN_MODAL",
			payload: {
				id: "modal-1",
				content: [],
				actions: [],
			},
		});
		state = applicationReducer(state, {
			type: "OPEN_MODAL",
			payload: {
				id: "modal-2",
				content: [],
				actions: [],
			},
		});

		state = resetEventQueue(state);

		state = applicationReducer(state, {
			type: "CLOSE_MODAL",
		});

		expect(state.eventQueue.events).toHaveLength(2);
		const [first, second] = state.eventQueue.events;
		expect(first.type).toBe("MODAL_CLOSED");
		expect(second.type).toBe("MODAL_CLOSED");
		if (first.type === "MODAL_CLOSED") {
			expect(first.modalId).toBe("modal-1");
		}
		if (second.type === "MODAL_CLOSED") {
			expect(second.modalId).toBe("modal-2");
		}
		expect(state.eventQueue.lastActionId).toBe(1);
		expect(state.eventQueue.lastEventId).toBe(2);
	});
});
