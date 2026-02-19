import type { EntityData } from "@/components/game/types/entity";
import type {
	GridPosition,
	ListPosition,
	SpaceData,
	SpacePosition,
} from "@/components/game/types/space";
import {
	isGridSpace,
	isPathSpace,
	isPoolSpace,
	isQueueSpace,
	isValidGridPosition,
	isValidListPosition,
} from "@/components/game/types/space";
import type { TransitionResult } from "@/components/game/types/transformer";
import { transitionApplied, transitionNoop } from "./types";

type SpaceState = {
	spaces: Record<string, SpaceData>;
	entities: Record<string, EntityData>;
};

type SpaceTransitionEvent =
	| {
			type: "ENTITY_ENTERED_SPACE";
			entityId: string;
			spaceId: string;
			position?: SpacePosition;
	  }
	| {
			type: "ENTITY_LEFT_SPACE";
			entityId: string;
			spaceId: string;
			position?: SpacePosition;
	  }
	| {
			type: "ENTITY_MOVED";
			entityId: string;
			fromSpaceId: string;
			toSpaceId: string;
			fromPosition?: SpacePosition;
			toPosition?: SpacePosition;
	  };

type SpaceTransitionPayload = {
	events: SpaceTransitionEvent[];
};

type SpacePlacementInput = {
	entityId: string;
	spaceId: string;
	position?: SpacePosition;
};

type SpaceMoveInput = {
	entityId: string;
	fromSpaceId: string;
	toSpaceId: string;
	toPosition?: SpacePosition;
};

type GridPositionInput = {
	entityId: string;
	spaceId: string;
	position: SpacePosition;
};

type SpaceSwapInput = {
	entity1Id: string;
	space1Id: string;
	entity2Id: string;
	space2Id: string;
};

const listIndexFromPosition = (
	position?: SpacePosition,
): number | undefined => {
	if (!position || !isValidListPosition(position)) {
		return undefined;
	}
	const candidate = position.index;
	return typeof candidate === "number" && Number.isFinite(candidate)
		? Math.trunc(candidate)
		: undefined;
};

const hasGridCapacity = (
	space: {
		entityPositions: Record<string, GridPosition>;
		maxCapacity?: number;
	},
	entityId: string,
): boolean => {
	if (space.maxCapacity === undefined) {
		return true;
	}
	if (entityId in space.entityPositions) {
		return true;
	}
	return Object.keys(space.entityPositions).length < space.maxCapacity;
};

const isGridCellBlocked = (
	space: {
		allowMultiplePerCell: boolean;
		entityPositions: Record<string, GridPosition>;
	},
	entityId: string,
	position: GridPosition,
): boolean => {
	if (space.allowMultiplePerCell) {
		return false;
	}
	for (const [otherId, otherPosition] of Object.entries(
		space.entityPositions,
	)) {
		if (otherId === entityId) {
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

const hasListCapacity = (
	space: { entityIds: string[]; maxCapacity?: number; maxDepth?: number },
	entityId: string,
): boolean => {
	const limit = space.maxDepth ?? space.maxCapacity;
	if (limit === undefined) {
		return true;
	}
	if (space.entityIds.includes(entityId)) {
		return true;
	}
	return space.entityIds.length < limit;
};

const spaceContainsEntity = (space: SpaceData, entityId: string): boolean => {
	if (isGridSpace(space)) {
		return space.entityPositions[entityId] !== undefined;
	}
	if (isPoolSpace(space) || isPathSpace(space) || isQueueSpace(space)) {
		return space.entityIds.includes(entityId);
	}
	return false;
};

const getEntityPositionInSpace = (
	space: SpaceData,
	entityId: string,
): SpacePosition | undefined => {
	if (isGridSpace(space)) {
		const position = space.entityPositions[entityId];
		return position ? { ...position } : undefined;
	}
	if (isPoolSpace(space) || isQueueSpace(space)) {
		const index = space.entityIds.indexOf(entityId);
		const position: ListPosition = { index };
		return index >= 0 ? position : undefined;
	}
	if (isPathSpace(space)) {
		return space.entityIds.includes(entityId) ? undefined : undefined;
	}
	return undefined;
};

const removeFromSpace = (
	space: SpaceData,
	entityId: string,
): {
	removed: boolean;
	position?: SpacePosition;
} => {
	if (isGridSpace(space)) {
		const position = space.entityPositions[entityId];
		if (!position) {
			return { removed: false };
		}
		delete space.entityPositions[entityId];
		return { removed: true, position: { ...position } };
	}

	if (isPoolSpace(space) || isQueueSpace(space) || isPathSpace(space)) {
		const index = space.entityIds.indexOf(entityId);
		if (index < 0) {
			return { removed: false };
		}
		space.entityIds.splice(index, 1);
		if (isPathSpace(space)) {
			return { removed: true };
		}
		const position: ListPosition = { index };
		return { removed: true, position };
	}

	return { removed: false };
};

const findFirstEmptyGridCell = (
	space: {
		rows: number;
		cols: number;
		entityPositions: Record<string, GridPosition>;
		allowMultiplePerCell: boolean;
	},
	entityId: string,
): GridPosition | undefined => {
	for (let row = 0; row < space.rows; row += 1) {
		for (let col = 0; col < space.cols; col += 1) {
			if (!isGridCellBlocked(space, entityId, { row, col })) {
				return { row, col };
			}
		}
	}
	return undefined;
};

const addToSpace = (
	space: SpaceData,
	entityId: string,
	position?: SpacePosition,
): {
	added: boolean;
	position?: SpacePosition;
} => {
	if (isGridSpace(space)) {
		// Auto-find the first free cell when no position is provided
		const resolvedPosition =
			position && isValidGridPosition(position)
				? { row: position.row, col: position.col }
				: findFirstEmptyGridCell(space, entityId);

		if (!resolvedPosition) {
			return { added: false };
		}
		if (
			resolvedPosition.row < 0 ||
			resolvedPosition.col < 0 ||
			resolvedPosition.row >= space.rows ||
			resolvedPosition.col >= space.cols
		) {
			return { added: false };
		}
		if (!hasGridCapacity(space, entityId)) {
			return { added: false };
		}
		if (isGridCellBlocked(space, entityId, resolvedPosition)) {
			return { added: false };
		}
		delete space.entityPositions[entityId];
		space.entityPositions[entityId] = {
			row: resolvedPosition.row,
			col: resolvedPosition.col,
		};
		return {
			added: true,
			position: { row: resolvedPosition.row, col: resolvedPosition.col },
		};
	}

	if (isPoolSpace(space)) {
		if (!hasListCapacity(space, entityId)) {
			return { added: false };
		}
		const existingIndex = space.entityIds.indexOf(entityId);
		if (existingIndex >= 0) {
			space.entityIds.splice(existingIndex, 1);
		}
		const requestedIndex = listIndexFromPosition(position);
		const nextIndex =
			requestedIndex === undefined
				? space.entityIds.length
				: Math.max(0, Math.min(requestedIndex, space.entityIds.length));
		space.entityIds.splice(nextIndex, 0, entityId);
		const nextPosition: ListPosition = { index: nextIndex };
		return { added: true, position: nextPosition };
	}

	if (isPathSpace(space)) {
		if (!hasListCapacity(space, entityId)) {
			return { added: false };
		}
		const existingIndex = space.entityIds.indexOf(entityId);
		if (existingIndex >= 0) {
			space.entityIds.splice(existingIndex, 1);
		}
		space.entityIds.push(entityId);
		return { added: true };
	}

	if (isQueueSpace(space)) {
		if (!hasListCapacity(space, entityId)) {
			return { added: false };
		}
		const existingIndex = space.entityIds.indexOf(entityId);
		if (existingIndex >= 0) {
			space.entityIds.splice(existingIndex, 1);
		}
		space.entityIds.push(entityId);
		const nextPosition: ListPosition = { index: space.entityIds.length - 1 };
		return { added: true, position: nextPosition };
	}

	return { added: false };
};

export const applyCreateSpace = (
	state: SpaceState,
	space: SpaceData,
): TransitionResult<SpaceTransitionPayload> => {
	state.spaces[space.id] = space;
	return transitionApplied({ events: [] });
};

export const tryRemoveSpace = (
	state: SpaceState,
	spaceId: string,
): TransitionResult<SpaceTransitionPayload> => {
	if (!state.spaces[spaceId]) {
		return transitionNoop(`space:${spaceId}:not_found`);
	}
	delete state.spaces[spaceId];
	return transitionApplied({ events: [] });
};

export const tryAddEntityToSpace = (
	state: SpaceState,
	input: SpacePlacementInput,
): TransitionResult<SpaceTransitionPayload> => {
	const entity = state.entities[input.entityId];
	if (!entity) {
		return transitionNoop(`entity:${input.entityId}:not_found`);
	}
	const space = state.spaces[input.spaceId];
	if (!space) {
		return transitionNoop(`space:${input.spaceId}:not_found`);
	}

	const result = addToSpace(space, input.entityId, input.position);
	if (!result.added) {
		return transitionNoop(
			`entity:${input.entityId}:cannot_enter:${input.spaceId}`,
		);
	}

	return transitionApplied({
		events: [
			{
				type: "ENTITY_ENTERED_SPACE",
				entityId: input.entityId,
				spaceId: input.spaceId,
				position: result.position,
			},
		],
	});
};

export const tryRemoveEntityFromSpace = (
	state: SpaceState,
	input: { entityId: string; spaceId: string },
): TransitionResult<SpaceTransitionPayload> => {
	const entity = state.entities[input.entityId];
	if (!entity) {
		return transitionNoop(`entity:${input.entityId}:not_found`);
	}
	const space = state.spaces[input.spaceId];
	if (!space) {
		return transitionNoop(`space:${input.spaceId}:not_found`);
	}

	const removed = removeFromSpace(space, input.entityId);
	if (!removed.removed) {
		return transitionNoop(
			`entity:${input.entityId}:not_in_space:${input.spaceId}`,
		);
	}

	return transitionApplied({
		events: [
			{
				type: "ENTITY_LEFT_SPACE",
				entityId: input.entityId,
				spaceId: input.spaceId,
				position: removed.position,
			},
		],
	});
};

const rollbackMove = (
	fromSpace: SpaceData,
	entityId: string,
	fromPosition?: SpacePosition,
) => {
	addToSpace(fromSpace, entityId, fromPosition);
};

export const tryMoveEntityAcrossSpaces = (
	state: SpaceState,
	input: SpaceMoveInput,
): TransitionResult<SpaceTransitionPayload> => {
	if (!state.entities[input.entityId]) {
		return transitionNoop(`entity:${input.entityId}:not_found`);
	}

	const fromSpace = state.spaces[input.fromSpaceId];
	const toSpace = state.spaces[input.toSpaceId];
	if (!fromSpace || !toSpace) {
		return transitionNoop(
			`space:${input.fromSpaceId}->${input.toSpaceId}:not_found`,
		);
	}

	const fromPosition = getEntityPositionInSpace(fromSpace, input.entityId);
	if (!spaceContainsEntity(fromSpace, input.entityId)) {
		if (spaceContainsEntity(toSpace, input.entityId)) {
			return transitionNoop(`entity:${input.entityId}:already_in_destination`);
		}
		return transitionNoop(`entity:${input.entityId}:not_in_source`);
	}

	removeFromSpace(fromSpace, input.entityId);
	const added = addToSpace(toSpace, input.entityId, input.toPosition);
	if (!added.added) {
		rollbackMove(fromSpace, input.entityId, fromPosition);
		return transitionNoop(`entity:${input.entityId}:move_rejected`);
	}

	const toPosition = getEntityPositionInSpace(toSpace, input.entityId);

	return transitionApplied({
		events: [
			{
				type: "ENTITY_MOVED",
				entityId: input.entityId,
				fromSpaceId: input.fromSpaceId,
				toSpaceId: input.toSpaceId,
				fromPosition,
				toPosition,
			},
		],
	});
};

export const tryUpdateGridEntityPosition = (
	state: SpaceState,
	input: GridPositionInput,
): TransitionResult<SpaceTransitionPayload> => {
	if (!state.entities[input.entityId]) {
		return transitionNoop(`entity:${input.entityId}:not_found`);
	}
	const space = state.spaces[input.spaceId];
	if (!space || !isGridSpace(space)) {
		return transitionNoop(`space:${input.spaceId}:grid_not_found`);
	}
	if (!spaceContainsEntity(space, input.entityId)) {
		return transitionNoop(
			`entity:${input.entityId}:not_in_space:${input.spaceId}`,
		);
	}
	if (!isValidGridPosition(input.position)) {
		return transitionNoop(`space:${input.spaceId}:invalid_position`);
	}
	const nextPosition = {
		row: input.position.row,
		col: input.position.col,
	};
	const placed = addToSpace(space, input.entityId, nextPosition);
	if (!placed.added) {
		return transitionNoop(`entity:${input.entityId}:position_update_rejected`);
	}

	return transitionApplied({ events: [] });
};

export const trySwapGridEntities = (
	state: SpaceState,
	input: SpaceSwapInput,
): TransitionResult<SpaceTransitionPayload> => {
	const space1 = state.spaces[input.space1Id];
	const space2 = state.spaces[input.space2Id];

	if (!space1 || !space2 || !isGridSpace(space1) || !isGridSpace(space2)) {
		return transitionNoop("swap:grid_spaces_required");
	}
	if (
		!spaceContainsEntity(space1, input.entity1Id) ||
		!spaceContainsEntity(space2, input.entity2Id)
	) {
		return transitionNoop("swap:entity_missing");
	}

	const position1 = space1.entityPositions[input.entity1Id];
	const position2 = space2.entityPositions[input.entity2Id];
	if (!position1 || !position2) {
		return transitionNoop("swap:position_missing");
	}

	if (input.space1Id === input.space2Id) {
		space1.entityPositions[input.entity1Id] = { ...position2 };
		space1.entityPositions[input.entity2Id] = { ...position1 };
	} else {
		delete space1.entityPositions[input.entity1Id];
		delete space2.entityPositions[input.entity2Id];
		space2.entityPositions[input.entity1Id] = { ...position2 };
		space1.entityPositions[input.entity2Id] = { ...position1 };
	}

	return transitionApplied({
		events: [
			{
				type: "ENTITY_MOVED",
				entityId: input.entity1Id,
				fromSpaceId: input.space1Id,
				toSpaceId: input.space2Id,
				fromPosition: { ...position1 },
				toPosition: { ...position2 },
			},
			{
				type: "ENTITY_MOVED",
				entityId: input.entity2Id,
				fromSpaceId: input.space2Id,
				toSpaceId: input.space1Id,
				fromPosition: { ...position2 },
				toPosition: { ...position1 },
			},
		],
	});
};
