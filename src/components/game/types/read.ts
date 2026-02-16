import type { _EntityData } from "./entity";
import type { EntityId, SpaceId } from "./ids";
import type {
	_ConditionContext,
	_PhaseResolution,
	_PhaseRule,
} from "./question";
import type { _GridPosition, _SpaceData } from "./space";

export type _GameReadState = Readonly<{
	spaces: Record<string, _SpaceData>;
	entities: Record<string, _EntityData>;
}>;

export type _ReadApi = {
	isEntityKnown: (state: _GameReadState, entityId: EntityId) => boolean;
	isSpaceKnown: (state: _GameReadState, spaceId: SpaceId) => boolean;
	isEntityInSpace: (
		state: _GameReadState,
		entityId: EntityId,
		spaceId: SpaceId,
	) => boolean;
	isEntityPlacementAllowed: (
		state: _GameReadState,
		entityId: EntityId,
		toSpaceId: SpaceId,
		toPosition?: _GridPosition,
	) => boolean;
	getEntity: (
		state: _GameReadState,
		entityId: EntityId,
	) => _EntityData | undefined;
	getSpace: (state: _GameReadState, spaceId: SpaceId) => _SpaceData | undefined;
	getEntitySpaceId: (
		state: _GameReadState,
		entityId: EntityId,
	) => string | null;
	getGridEntityPosition: (
		state: _GameReadState,
		entityId: EntityId,
		spaceId?: SpaceId,
	) => _GridPosition | undefined;
	getSpaceEntityIds: (state: _GameReadState, spaceId: SpaceId) => string[];
	selectEntitiesByType: (state: _GameReadState, type: string) => _EntityData[];
	selectEntityStateValue: <T = unknown>(
		state: _GameReadState,
		entityId: EntityId,
		key: string,
	) => T | undefined;
	selectSpaceEntityCount: (state: _GameReadState, spaceId: SpaceId) => number;
	selectSpaceIsFull: (state: _GameReadState, spaceId: SpaceId) => boolean;
	selectSpaceIsEmpty: (state: _GameReadState, spaceId: SpaceId) => boolean;
	selectGridEmptyPositions: (
		state: _GameReadState,
		spaceId: SpaceId,
	) => _GridPosition[];
	selectDerivedPhase: <CK extends string>(
		rules: _PhaseRule<CK>[],
		context: _ConditionContext<CK>,
		currentPhase: string,
		fallbackPhase: string,
	) => _PhaseResolution;
};

export type GameReadState = _GameReadState;
export type ReadApi = _ReadApi;
