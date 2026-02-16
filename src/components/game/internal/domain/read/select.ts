import type {
	ConditionContext,
	PhaseResolution,
	PhaseRule,
} from "@/components/game/types/question";
import type { GameReadState } from "@/components/game/types/read";
import { isGridSpace } from "@/components/game/types/space";
import { resolvePhase } from "../question/question-ast";
import { getEntity, getSpace, getSpaceEntityIds } from "./get";

export const selectEntitiesByType = (state: GameReadState, type: string) => {
	return Object.values(state.entities).filter((entity) => entity.type === type);
};

export const selectEntityStateValue = <T = unknown>(
	state: GameReadState,
	entityId: string,
	key: string,
): T | undefined => {
	const entity = getEntity(state, entityId);
	if (!entity) {
		return undefined;
	}
	return entity.state[key] as T | undefined;
};

export const selectSpaceEntityCount = (
	state: GameReadState,
	spaceId: string,
): number => {
	return getSpaceEntityIds(state, spaceId).length;
};

export const selectSpaceIsFull = (
	state: GameReadState,
	spaceId: string,
): boolean => {
	const space = getSpace(state, spaceId);
	if (!space) {
		return false;
	}

	if (space.kind === "queue") {
		if (space.maxDepth === undefined) {
			return false;
		}
		return space.entityIds.length >= space.maxDepth;
	}

	if (space.maxCapacity === undefined) {
		return false;
	}
	return selectSpaceEntityCount(state, spaceId) >= space.maxCapacity;
};

export const selectSpaceIsEmpty = (
	state: GameReadState,
	spaceId: string,
): boolean => {
	return selectSpaceEntityCount(state, spaceId) === 0;
};

export const selectGridEmptyPositions = (
	state: GameReadState,
	spaceId: string,
) => {
	const space = getSpace(state, spaceId);
	if (!space || !isGridSpace(space)) {
		return [];
	}

	const occupied = new Set(
		Object.values(space.entityPositions).map(
			(position) => `${position.row}:${position.col}`,
		),
	);
	const result = [];
	for (let row = 0; row < space.rows; row += 1) {
		for (let col = 0; col < space.cols; col += 1) {
			const key = `${row}:${col}`;
			if (!occupied.has(key)) {
				result.push({ row, col });
			}
		}
	}
	return result;
};

export const selectDerivedPhase = <CK extends string>(
	rules: PhaseRule<CK>[],
	context: ConditionContext<CK>,
	currentPhase: string,
	fallbackPhase: string,
): PhaseResolution => {
	return resolvePhase(rules, context, currentPhase, fallbackPhase);
};
