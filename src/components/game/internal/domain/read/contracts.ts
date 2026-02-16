import { fromEntityId, fromSpaceId } from "../adt/ids";
import {
	getEntity,
	getEntitySpaceId,
	getGridEntityPosition,
	getSpace,
	getSpaceEntityIds,
} from "./get";
import {
	isEntityInSpace,
	isEntityKnown,
	isEntityPlacementAllowed,
	isSpaceKnown,
} from "./guards";
import {
	selectDerivedPhase,
	selectEntitiesByType,
	selectEntityStateValue,
	selectGridEmptyPositions,
	selectSpaceEntityCount,
	selectSpaceIsEmpty,
	selectSpaceIsFull,
} from "./select";
import type { ReadApi } from "./types";

export const readApi = {
	isEntityKnown: (state, entityId) =>
		isEntityKnown(state, fromEntityId(entityId)),
	isSpaceKnown: (state, spaceId) => isSpaceKnown(state, fromSpaceId(spaceId)),
	isEntityInSpace: (state, entityId, spaceId) =>
		isEntityInSpace(state, fromEntityId(entityId), fromSpaceId(spaceId)),
	isEntityPlacementAllowed: (state, entityId, toSpaceId, toPosition) =>
		isEntityPlacementAllowed(
			state,
			fromEntityId(entityId),
			fromSpaceId(toSpaceId),
			toPosition,
		),
	getEntity: (state, entityId) => getEntity(state, fromEntityId(entityId)),
	getSpace: (state, spaceId) => getSpace(state, fromSpaceId(spaceId)),
	getEntitySpaceId: (state, entityId) =>
		getEntitySpaceId(state, fromEntityId(entityId)),
	getGridEntityPosition: (state, entityId, spaceId) =>
		getGridEntityPosition(
			state,
			fromEntityId(entityId),
			spaceId ? fromSpaceId(spaceId) : undefined,
		),
	getSpaceEntityIds: (state, spaceId) =>
		getSpaceEntityIds(state, fromSpaceId(spaceId)),
	selectEntitiesByType,
	selectEntityStateValue: (state, entityId, key) =>
		selectEntityStateValue(state, fromEntityId(entityId), key),
	selectSpaceEntityCount: (state, spaceId) =>
		selectSpaceEntityCount(state, fromSpaceId(spaceId)),
	selectSpaceIsFull: (state, spaceId) =>
		selectSpaceIsFull(state, fromSpaceId(spaceId)),
	selectSpaceIsEmpty: (state, spaceId) =>
		selectSpaceIsEmpty(state, fromSpaceId(spaceId)),
	selectGridEmptyPositions: (state, spaceId) =>
		selectGridEmptyPositions(state, fromSpaceId(spaceId)),
	selectDerivedPhase,
} satisfies ReadApi;
