import type { _ItemDataConfig } from "@/components/game/types/entity";
import type { _Commands, _WorldApi } from "@/components/game/types/runtime";
import { runtimeError, runtimeOk, toRuntimeErrorMessage } from "./result";

type WorldApiDeps = {
	commands: _Commands;
};

export const createWorldApi = ({ commands }: WorldApiDeps): _WorldApi => ({
	createEntity(config: _ItemDataConfig) {
		try {
			commands.createEntity(config);
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`worldApi.createEntity: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	updateEntity(entityId, updates) {
		try {
			commands.updateEntity(entityId, updates);
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`worldApi.updateEntity: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	updateEntityState(entityId, state) {
		try {
			commands.updateEntityState(entityId, state);
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`worldApi.updateEntityState: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	deleteEntities(entityIds) {
		try {
			commands.deleteEntities(entityIds);
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`worldApi.deleteEntities: ${toRuntimeErrorMessage(error)}`,
			);
		}
	},

	addToSpace(entityId, spaceId, position) {
		try {
			commands.addToSpace(entityId, spaceId, position);
			return runtimeOk();
		} catch (error) {
			return runtimeError(
				`worldApi.addToSpace: ${toRuntimeErrorMessage(error)}`,
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
