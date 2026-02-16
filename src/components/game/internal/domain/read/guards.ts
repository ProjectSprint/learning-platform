import type { GameReadState } from "@/components/game/types/read";
import type { GridPosition } from "@/components/game/types/space";
import {
	isGridSpace,
	isPathSpace,
	isPoolSpace,
	isQueueSpace,
	isValidGridPosition,
} from "@/components/game/types/space";
import { isItemData } from "../entity/entity-data";

const isCellOccupiedByAnotherEntity = (
	space: {
		entityPositions: Record<string, GridPosition>;
		allowMultiplePerCell: boolean;
	},
	entityId: string,
	position: GridPosition,
): boolean => {
	if (space.allowMultiplePerCell) {
		return false;
	}

	for (const [otherEntityId, otherPosition] of Object.entries(
		space.entityPositions,
	)) {
		if (otherEntityId === entityId) {
			continue;
		}
		if (
			otherPosition.row === position.row &&
			otherPosition.col === position.col
		) {
			return true;
		}
	}

	return false;
};

const isGridCapacityAvailable = (
	space: {
		entityPositions: Record<string, GridPosition>;
		maxCapacity?: number;
	},
	entityId: string,
): boolean => {
	if (space.maxCapacity === undefined) {
		return true;
	}
	const entityAlreadyPresent = entityId in space.entityPositions;
	if (entityAlreadyPresent) {
		return true;
	}
	return Object.keys(space.entityPositions).length < space.maxCapacity;
};

const isListCapacityAvailable = (
	space: { entityIds: string[]; maxCapacity?: number; maxDepth?: number },
	entityId: string,
): boolean => {
	const limit = space.maxDepth ?? space.maxCapacity;
	if (limit === undefined) {
		return true;
	}
	const entityAlreadyPresent = space.entityIds.includes(entityId);
	if (entityAlreadyPresent) {
		return true;
	}
	return space.entityIds.length < limit;
};

export const isEntityKnown = (
	state: GameReadState,
	entityId: string,
): boolean => {
	return state.entities[entityId] !== undefined;
};

export const isSpaceKnown = (
	state: GameReadState,
	spaceId: string,
): boolean => {
	return state.spaces[spaceId] !== undefined;
};

export const isEntityInSpace = (
	state: GameReadState,
	entityId: string,
	spaceId: string,
): boolean => {
	const space = state.spaces[spaceId];
	if (!space) {
		return false;
	}

	if (isGridSpace(space)) {
		return space.entityPositions[entityId] !== undefined;
	}
	if (isPoolSpace(space) || isPathSpace(space) || isQueueSpace(space)) {
		return space.entityIds.includes(entityId);
	}
	return false;
};

export const isEntityPlacementAllowed = (
	state: GameReadState,
	entityId: string,
	toSpaceId: string,
	toPosition?: GridPosition,
): boolean => {
	const entity = state.entities[entityId];
	if (!entity || !isItemData(entity)) {
		return false;
	}

	const targetSpace = state.spaces[toSpaceId];
	if (!targetSpace) {
		return false;
	}

	if (!entity.allowedPlaces.includes(toSpaceId)) {
		return false;
	}

	if (isGridSpace(targetSpace)) {
		if (!toPosition || !isValidGridPosition(toPosition)) {
			return false;
		}
		if (
			toPosition.row < 0 ||
			toPosition.col < 0 ||
			toPosition.row >= targetSpace.rows ||
			toPosition.col >= targetSpace.cols
		) {
			return false;
		}
		if (!isGridCapacityAvailable(targetSpace, entityId)) {
			return false;
		}
		if (isCellOccupiedByAnotherEntity(targetSpace, entityId, toPosition)) {
			return false;
		}
		return true;
	}

	if (isPoolSpace(targetSpace)) {
		return isListCapacityAvailable(targetSpace, entityId);
	}

	if (isPathSpace(targetSpace)) {
		return isListCapacityAvailable(targetSpace, entityId);
	}

	if (isQueueSpace(targetSpace)) {
		return isListCapacityAvailable(targetSpace, entityId);
	}

	return false;
};
