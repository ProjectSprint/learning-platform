import { describe, expect, it, vi } from "vitest";
import { createItemData } from "../../domain/entity/entity-fns";
import type { Commands } from "../commands/types";
import {
	createInteractionSessionApi,
	createWorldApi,
	runtimeError,
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
});
