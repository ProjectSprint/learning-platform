import type { ItemDataConfig } from "@/components/game/types/entity";
import type { Commands, WorldApi } from "@/components/game/types/runtime";
import { runtimeError, runtimeOk, toRuntimeErrorMessage } from "./result";

type WorldApiDeps = {
	commands: Commands;
};

export const createWorldApi = ({ commands }: WorldApiDeps): WorldApi => ({
	spawnEntity(config: ItemDataConfig) {
		try {
			commands.createEntity(config);
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`worldApi.spawnEntity: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	patchEntity(entityId, updates) {
		try {
			commands.updateEntity(entityId, updates);
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`worldApi.patchEntity: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	patchEntityState(entityId, state) {
		try {
			commands.updateEntityState(entityId, state);
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`worldApi.patchEntityState: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	destroyEntities(entityIds) {
		try {
			commands.deleteEntities(entityIds);
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`worldApi.destroyEntities: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	placeInSpace(entityId, spaceId, position) {
		try {
			commands.addToSpace(entityId, spaceId, position);
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`worldApi.placeInSpace: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	removeFromSpace(entityId, spaceId) {
		try {
			commands.removeFromSpace(entityId, spaceId);
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`worldApi.removeFromSpace: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	moveEntity(entityId, toSpaceId, position) {
		try {
			commands.moveEntity(entityId, toSpaceId, position);
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`worldApi.moveEntity: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	moveEntityToGrid(entityId, spaceId) {
		try {
			const moved = commands.moveEntityToGrid(entityId, spaceId);
			if (!moved) {
				return runtimeError(
					`worldApi.moveEntityToGrid: unable to move "${entityId}" to "${spaceId}"`,
				);
			}
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`worldApi.moveEntityToGrid: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},
});
