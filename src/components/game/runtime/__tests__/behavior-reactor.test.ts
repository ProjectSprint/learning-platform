import { describe, expect, it, vi } from "vitest";
import type { GameEvent, GameState } from "../../application/state/types";
import {
	buildEventProvenance,
	createBehaviorConvenience,
	matchesEventTrigger,
} from "../behavior/reactor";
import type {
	InteractionSessionApi,
	RuntimeApiResult,
	WorldApi,
} from "../wrappers";

const ok = (): RuntimeApiResult => ({ ok: true });

const createWorldStub = () => {
	const createEntity = vi.fn(() => ok());
	const updateEntity = vi.fn(() => ok());
	const updateEntityState = vi.fn(() => ok());
	const deleteEntities = vi.fn(() => ok());
	const addToSpace = vi.fn(() => ok());
	const removeFromSpace = vi.fn(() => ok());
	const moveEntity = vi.fn(() => ok());
	const moveEntityToGrid = vi.fn(() => ok());

	const world: WorldApi = {
		createEntity,
		updateEntity,
		updateEntityState,
		deleteEntities,
		addToSpace,
		removeFromSpace,
		moveEntity,
		moveEntityToGrid,
	};

	return {
		world,
		spies: {
			removeFromSpace,
			moveEntity,
			moveEntityToGrid,
		},
	};
};

const createInteractionStub = () => {
	const openModal = vi.fn(() => ok());
	const closeModal = vi.fn(() => ok());
	const requestPhaseTransition = vi.fn(() => ok());
	const setTerminalVisible = vi.fn(() => ok());
	const setModalGateOpen = vi.fn(() => ok());

	const interaction: InteractionSessionApi = {
		openModal,
		closeModal,
		requestPhaseTransition,
		setTerminalVisible,
		setModalGateOpen,
	};

	return { interaction, spies: { requestPhaseTransition } };
};

describe("behavior reactor convenience helpers", () => {
	it("moveToInventory delegates to world.moveEntity(..., 'inventory')", () => {
		const { world, spies } = createWorldStub();
		const { interaction } = createInteractionStub();
		const helpers = createBehaviorConvenience({ world, interaction });

		helpers.moveToInventory("entity-1");

		expect(spies.moveEntity).toHaveBeenCalledWith("entity-1", "inventory");
		expect(spies.removeFromSpace).not.toHaveBeenCalled();
	});

	it("setPhase defaults source to 'behavior' and moveToGrid mirrors runtime result", () => {
		const { world, spies: worldSpies } = createWorldStub();
		const { interaction, spies: interactionSpies } = createInteractionStub();
		const helpers = createBehaviorConvenience({ world, interaction });

		helpers.setPhase("terminal");
		expect(interactionSpies.requestPhaseTransition).toHaveBeenCalledWith(
			"terminal",
			"behavior",
		);

		worldSpies.moveEntityToGrid.mockReturnValueOnce({
			ok: false,
			error: { message: "grid full" },
		});
		expect(helpers.moveToGrid("entity-1", "board")).toBe(false);
	});
});

const createStateForTriggerTest = (): GameState => ({
	phase: "idle",
	spaces: {},
	entities: {
		"entity-1": {
			id: "entity-1",
			type: "app",
			visual: {},
			data: {},
			state: {},
			behaviorIds: [],
		},
	},
	overlay: { modals: {} },
	question: { id: "q", status: "in_progress" },
	eventQueue: { events: [], lastEventId: 0, lastActionId: 0 },
	eventCursors: {},
});

describe("matchesEventTrigger", () => {
	it("matches ENTITY_ARRIVED_AT_SPACE for ENTITY_ENTERED_SPACE and ENTITY_MOVED", () => {
		const state = createStateForTriggerTest();
		const entered: GameEvent = {
			type: "ENTITY_ENTERED_SPACE",
			eventId: 1,
			actionId: 1,
			entityId: "entity-1",
			spaceId: "open",
		};
		const moved: GameEvent = {
			type: "ENTITY_MOVED",
			eventId: 2,
			actionId: 2,
			entityId: "entity-1",
			fromSpaceId: "pool",
			toSpaceId: "open",
		};
		const trigger = {
			event: "ENTITY_ARRIVED_AT_SPACE",
			space: "open",
			entityType: "app",
		} as const;

		expect(matchesEventTrigger(entered, trigger, state)).toBe(true);
		expect(matchesEventTrigger(moved, trigger, state)).toBe(true);
	});

	it("does not match ENTITY_ARRIVED_AT_SPACE when space or type do not match", () => {
		const state = createStateForTriggerTest();
		const moved: GameEvent = {
			type: "ENTITY_MOVED",
			eventId: 3,
			actionId: 3,
			entityId: "entity-1",
			fromSpaceId: "pool",
			toSpaceId: "core-1",
		};

		expect(
			matchesEventTrigger(
				moved,
				{ event: "ENTITY_ARRIVED_AT_SPACE", space: "open", entityType: "app" },
				state,
			),
		).toBe(false);
		expect(
			matchesEventTrigger(
				moved,
				{ event: "ENTITY_ARRIVED_AT_SPACE", entityType: "subtask" },
				state,
			),
		).toBe(false);
	});

	it("builds provenance with event and routing context", () => {
		const moved: GameEvent = {
			type: "ENTITY_MOVED",
			eventId: 9,
			actionId: 5,
			entityId: "entity-1",
			fromSpaceId: "pool",
			toSpaceId: "open",
		};
		expect(buildEventProvenance(moved, "rule.open")).toEqual({
			eventId: 9,
			actionId: 5,
			eventType: "ENTITY_MOVED",
			entityId: "entity-1",
			fromSpaceId: "pool",
			toSpaceId: "open",
			spaceId: "open",
			ruleId: "rule.open",
		});
	});
});
