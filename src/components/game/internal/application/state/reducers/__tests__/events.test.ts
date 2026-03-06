import { describe, expect, it } from "vitest";
import { createGridSpaceData, createItemData } from "../../../../domain/adt";
import { applicationReducer, createDefaultState } from "../index";

const metrics = { cellWidth: { base: 1 }, cellHeight: { base: 1 } };

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

	it("rolls back rejected ENTITY_MOVED without losing source placement", () => {
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
					id: "item-from",
					name: "Item From",
					allowedPlaces: ["from", "to"],
				}),
			},
		});
		state = applicationReducer(state, {
			type: "ENTITY_CREATED",
			payload: {
				entity: createItemData({
					id: "item-to",
					name: "Item To",
					allowedPlaces: ["to"],
				}),
			},
		});

		state = applicationReducer(state, {
			type: "ENTITY_ADDED",
			payload: {
				entityId: "item-from",
				spaceId: "from",
				position: { row: 0, col: 0 },
			},
		});
		state = applicationReducer(state, {
			type: "ENTITY_ADDED",
			payload: {
				entityId: "item-to",
				spaceId: "to",
				position: { row: 0, col: 0 },
			},
		});

		state = resetEventQueue(state);

		state = applicationReducer(state, {
			type: "ENTITY_MOVED",
			payload: {
				entityId: "item-from",
				fromSpaceId: "from",
				toSpaceId: "to",
				toPosition: { row: 0, col: 0 },
			},
		});

		const fromSpace = state.spaces.from;
		const toSpace = state.spaces.to;
		expect(fromSpace?.kind).toBe("grid");
		expect(toSpace?.kind).toBe("grid");
		if (fromSpace?.kind === "grid" && toSpace?.kind === "grid") {
			expect(fromSpace.entityPositions["item-from"]).toEqual({
				row: 0,
				col: 0,
			});
			expect(toSpace.entityPositions["item-from"]).toBeUndefined();
		}
		expect(state.eventQueue.events).toHaveLength(0);
	});

	it("SET_QUESTION updates question metadata in core reducer", () => {
		let state = createDefaultState();

		state = applicationReducer(state, {
			type: "SET_QUESTION",
			payload: {
				id: "udp-question",
			},
		});

		expect(state.question.id).toBe("udp-question");
		expect(state.question.status).toBe("in_progress");
	});

	it("ACK_EVENTS cursor is monotonic and clamped to lastEventId", () => {
		let state = createDefaultState();

		state = applicationReducer(state, {
			type: "EMIT_EVENTS",
			payload: {
				events: [
					{ type: "ENGINE_STARTED", engineId: "engine-1" },
					{ type: "ENGINE_FINISHED", engineId: "engine-1" },
				],
			},
		});

		state = applicationReducer(state, {
			type: "ACK_EVENTS",
			payload: { engineId: "engine-1", cursor: 999 },
		});
		expect(state.eventCursors["engine-1"]).toBe(2);

		state = applicationReducer(state, {
			type: "ACK_EVENTS",
			payload: { engineId: "engine-1", cursor: 1 },
		});
		expect(state.eventCursors["engine-1"]).toBe(2);
	});

	it("keeps modal intent channel functional", () => {
		let state = createDefaultState();

		state = applicationReducer(state, {
			type: "OPEN_MODAL",
			payload: {
				id: "modal-intent",
				content: [],
				actions: [{ id: "ok", label: "OK" }],
			},
		});

		state = applicationReducer(state, {
			type: "MODAL_SUBMITTED",
			payload: {
				modalId: "modal-intent",
				modalActionId: "ok",
				values: {},
			},
		});

		expect(state.overlay.modals["modal-intent"]?.visible).toBe(true);
		expect(
			state.eventQueue.events.some(
				(event) =>
					event.type === "MODAL_SUBMITTED" &&
					event.modalId === "modal-intent" &&
					event.modalActionId === "ok",
			),
		).toBe(true);
	});
});
