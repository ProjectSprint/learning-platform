import type {
	_EventTrigger,
	_LaneSchedulerInput,
	_LaneSelectionResult,
} from "@/components/game/types/behavior";
import type {
	_ConditionContext,
	_PhaseResolution,
	_PhaseRule,
} from "@/components/game/types/question";
import type { GameState } from "@/components/game/types/state";
import { resolvePhase } from "../../internal/domain/question";
import {
	getEntity,
	getEntitySpaceId,
	getSpaceEntityIds,
	isEntityInSpace,
} from "../../internal/domain/read";
import {
	entityClicked,
	modalSubmitted,
	pickLane,
	terminalInput,
	whenEntityArrivedAtSpace,
	whenEntityPlacedInSpace,
} from "../../internal/runtime/behavior";

/**
 * Derives the next phase from declarative rules and condition context.
 * Public business entrypoint for question phase transitions.
 */
export const deriveQuestionPhase = <ConditionKey extends string>(
	rules: _PhaseRule<ConditionKey>[],
	context: _ConditionContext<ConditionKey>,
	currentPhase: string,
	fallbackPhase = currentPhase,
): _PhaseResolution => {
	return resolvePhase(rules, context, currentPhase, fallbackPhase);
};

/**
 * Returns the current space containing an entity.
 * Performs a cheap existence check before evaluating placement.
 */
export const findEntitySpace = (
	state: GameState,
	entityId: string,
): string | null => {
	if (!getEntity(state, entityId)) {
		return null;
	}
	return getEntitySpaceId(state, entityId);
};

/**
 * Lists entity IDs currently contained in a space.
 */
export const listSpaceEntityIds = (
	state: GameState,
	spaceId: string,
): string[] => {
	return getSpaceEntityIds(state, spaceId);
};

/**
 * True when an entity is currently placed in the specified space.
 * Uses both direct location check and read guard for stable behavior.
 */
export const entityIsInSpace = (
	state: GameState,
	entityId: string,
	spaceId: string,
): boolean => {
	if (findEntitySpace(state, entityId) !== spaceId) {
		return false;
	}
	return isEntityInSpace(state, entityId, spaceId);
};

/**
 * Builds a behavior trigger for entity click interactions.
 */
export const buildEntityClickTrigger = (
	entityType?: string,
	spaceId?: string,
): _EventTrigger => entityClicked(entityType, spaceId);

/**
 * Builds a behavior trigger for modal submit events.
 */
export const buildModalSubmitTrigger = (
	modalId?: string,
	modalActionId?: string,
): _EventTrigger => modalSubmitted(modalId, modalActionId);

/**
 * Builds a behavior trigger for terminal command input.
 */
export const buildTerminalInputTrigger = (
	match?: string | RegExp,
): _EventTrigger => terminalInput(match);

/**
 * Builds a behavior trigger for entity placement into a space.
 */
export const buildEntityPlacedTrigger = (
	spaceId?: string,
	entityType?: string,
): _EventTrigger => whenEntityPlacedInSpace(spaceId, entityType);

/**
 * Builds a behavior trigger for entity arrival events.
 */
export const buildEntityArrivedTrigger = (
	spaceId?: string,
	entityType?: string,
): _EventTrigger => whenEntityArrivedAtSpace(spaceId, entityType);

/**
 * Chooses a lane using the runtime lane scheduler policy.
 */
export const chooseLaneForExecution = <TLaneId extends string>(
	input: _LaneSchedulerInput<TLaneId>,
): _LaneSelectionResult<TLaneId> => pickLane(input);
