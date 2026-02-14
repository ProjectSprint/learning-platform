import type { EntityData } from "../entity/entity-data";
import type { GridPosition, SpaceData } from "../space/space-data";
import {
	isGridSpace,
	isPathSpace,
	isPoolSpace,
	isQueueSpace,
} from "../space/space-data";
import { isEntityInSpace } from "./guards";
import type { GameReadState } from "./types";

export const getEntity = (
	state: GameReadState,
	entityId: string,
): EntityData | undefined => {
	return state.entities[entityId];
};

export const getSpace = (
	state: GameReadState,
	spaceId: string,
): SpaceData | undefined => {
	return state.spaces[spaceId];
};

export const getSpaceEntityIds = (
	state: GameReadState,
	spaceId: string,
): string[] => {
	const space = state.spaces[spaceId];
	if (!space) {
		return [];
	}

	if (isGridSpace(space)) {
		return Object.keys(space.entityPositions);
	}
	if (isPoolSpace(space) || isPathSpace(space) || isQueueSpace(space)) {
		return [...space.entityIds];
	}
	return [];
};

export const getEntitySpaceId = (
	state: GameReadState,
	entityId: string,
): string | null => {
	for (const spaceId of Object.keys(state.spaces)) {
		if (isEntityInSpace(state, entityId, spaceId)) {
			return spaceId;
		}
	}
	return null;
};

export const getGridEntityPosition = (
	state: GameReadState,
	entityId: string,
	spaceId?: string,
): GridPosition | undefined => {
	if (spaceId) {
		const target = state.spaces[spaceId];
		if (target && isGridSpace(target)) {
			return target.entityPositions[entityId];
		}
		return undefined;
	}

	const ownerSpaceId = getEntitySpaceId(state, entityId);
	if (!ownerSpaceId) {
		return undefined;
	}
	const owner = state.spaces[ownerSpaceId];
	if (!owner || !isGridSpace(owner)) {
		return undefined;
	}
	return owner.entityPositions[entityId];
};
