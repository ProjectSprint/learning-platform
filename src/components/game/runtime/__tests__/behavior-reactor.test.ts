import { describe, expect, it, vi } from "vitest";
import { createBehaviorConvenience } from "../behavior/reactor";
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
