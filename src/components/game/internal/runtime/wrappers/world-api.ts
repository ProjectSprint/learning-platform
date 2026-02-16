import type { ItemDataConfig } from "../../domain/entity/entity-data";
import type { GridPosition } from "../../domain/space/space-data";
import type { Commands } from "../commands/types";
import {
	type RuntimeApiResult,
	runtimeError,
	runtimeOk,
	toRuntimeErrorMessage,
} from "./result";

export type WorldApi = {
	createEntity: (config: ItemDataConfig) => RuntimeApiResult;
	updateEntity: (
		entityId: string,
		updates: {
			name?: string;
			data?: Record<string, unknown>;
			visual?: Record<string, unknown>;
		},
	) => RuntimeApiResult;
	updateEntityState: (
		entityId: string,
		state: Record<string, unknown>,
	) => RuntimeApiResult;
	deleteEntities: (entityIds: string[]) => RuntimeApiResult;
	addToSpace: (
		entityId: string,
		spaceId: string,
		position?: GridPosition,
	) => RuntimeApiResult;
	removeFromSpace: (entityId: string, spaceId: string) => RuntimeApiResult;
	moveEntity: (
		entityId: string,
		toSpaceId: string,
		position?: GridPosition,
	) => RuntimeApiResult;
	moveEntityToGrid: (entityId: string, spaceId: string) => RuntimeApiResult;
};

type WorldApiDeps = {
	commands: Commands;
};

export const createWorldApi = ({ commands }: WorldApiDeps): WorldApi => ({
	createEntity(config) {
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
