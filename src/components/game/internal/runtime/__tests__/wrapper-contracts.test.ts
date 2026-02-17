import { describe, expect, it, vi } from "vitest";
import type {
	Commands,
	InteractionSessionApi,
	ProgressApi,
	WorldApi,
} from "@/components/game/types/runtime";
import type { Action } from "@/components/game/types/state";
import { createItemData } from "../../domain/adt";
import {
	createInteractionSessionApi,
	createProgressApi,
	createWorldApi,
	runtimeError,
	runtimeOk,
} from "../wrappers";

const createCommandsStub = (): Commands => ({
	createEntity: vi.fn(() =>
		createItemData({
			id: "stub-entity",
			name: "Stub Entity",
			allowedPlaces: ["inventory"],
			data: { type: "stub-entity" },
		}),
	),
	updateEntity: vi.fn(),
	updateEntityState: vi.fn(),
	deleteEntities: vi.fn(),
	addToSpace: vi.fn(),
	removeFromSpace: vi.fn(),
	moveEntity: vi.fn(),
	moveEntityToGrid: vi.fn(() => true),
	completeQuestion: vi.fn(),
	openModal: vi.fn(),
	closeModal: vi.fn(),
});

describe("wrapper API surface matches type contracts", () => {
	it("WorldApi factory produces all declared methods", () => {
		const commands = createCommandsStub();
		const world = createWorldApi({ commands });
		const expectedKeys: (keyof WorldApi)[] = [
			"createEntity",
			"updateEntity",
			"updateEntityState",
			"deleteEntities",
			"addToSpace",
			"removeFromSpace",
			"moveEntity",
			"moveEntityToGrid",
		];
		expect(Object.keys(world).sort()).toEqual(expectedKeys.sort());
	});

	it("InteractionSessionApi factory produces all declared methods", () => {
		const commands = createCommandsStub();
		const interaction = createInteractionSessionApi({
			commands,
			executionFlowApi: {
				requestPhaseTransition: () => runtimeOk(),
				dispatchIntent: () => runtimeOk(),
			},
			setInteractionState: vi.fn(),
		});
		const expectedKeys: (keyof InteractionSessionApi)[] = [
			"openModal",
			"closeModal",
			"requestPhaseTransition",
			"setTerminalVisible",
			"setModalGateOpen",
		];
		expect(Object.keys(interaction).sort()).toEqual(expectedKeys.sort());
	});

	it("ProgressApi factory produces all declared methods", () => {
		const commands = createCommandsStub();
		const progress = createProgressApi({
			commands,
			dispatch: vi.fn(),
		});
		const expectedKeys: (keyof ProgressApi)[] = [
			"completeQuestion",
			"setQuestion",
		];
		expect(Object.keys(progress).sort()).toEqual(expectedKeys.sort());
	});
});

describe("runtime wrapper contracts", () => {
	it("returns wrapped downstream errors for cross-wrapper calls", () => {
		const commands = createCommandsStub();
		const interactionSession = createInteractionSessionApi({
			commands,
			executionFlowApi: {
				requestPhaseTransition: () =>
					runtimeError('executionFlow: phase "setup" already active'),
				dispatchIntent: () => runtimeError("executionFlow: invalid intent"),
			},
			setInteractionState: vi.fn(),
		});

		const result = interactionSession.requestPhaseTransition("setup", "test");

		expect(result).toEqual({
			ok: false,
			error: {
				message:
					'interactionSessionApi.requestPhaseTransition: executionFlow: phase "setup" already active',
			},
		});
	});

	it("uses fixed success/failure shape for world wrappers", () => {
		const commands = createCommandsStub();
		commands.moveEntityToGrid = vi.fn(() => false);
		const world = createWorldApi({ commands });

		const result = world.moveEntityToGrid("entity-1", "grid-1");

		expect(result.ok).toBe(false);
		if (result.ok) {
			throw new Error("expected failure");
		}
		expect(result.error.message).toContain("worldApi.moveEntityToGrid");
	});

	it("world wrapper catches thrown errors and returns RuntimeApiFailure", () => {
		const commands = createCommandsStub();
		commands.addToSpace = vi.fn(() => {
			throw new Error("space not found");
		});
		const world = createWorldApi({ commands });

		const result = world.addToSpace("entity-1", "unknown-space");
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.error.message).toContain("worldApi.addToSpace");
			expect(result.error.message).toContain("space not found");
		}
	});

	it("progress wrapper returns ok for successful operations", () => {
		const commands = createCommandsStub();
		const dispatched: Action[] = [];
		const progress = createProgressApi({
			commands,
			dispatch: (action) => dispatched.push(action),
		});

		expect(progress.completeQuestion().ok).toBe(true);
		expect(progress.setQuestion({ id: "q1", status: "completed" }).ok).toBe(
			true,
		);
		expect(dispatched).toHaveLength(1);
		expect(dispatched[0].type).toBe("SET_QUESTION");
	});

	it("interaction session wrapper returns ok for terminal/modal gate operations", () => {
		const commands = createCommandsStub();
		const stateUpdates: unknown[] = [];
		const interaction = createInteractionSessionApi({
			commands,
			executionFlowApi: {
				requestPhaseTransition: () => runtimeOk(),
				dispatchIntent: () => runtimeOk(),
			},
			setInteractionState: (next) => stateUpdates.push(next),
		});

		expect(interaction.setTerminalVisible(true).ok).toBe(true);
		expect(interaction.setModalGateOpen(false).ok).toBe(true);
		expect(stateUpdates).toHaveLength(2);
	});
});
