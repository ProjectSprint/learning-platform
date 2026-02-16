import type { EntityId, SpaceId } from "../adt/ids";
import type { EntityData } from "../entity/entity-data";
import type {
	ConditionContext,
	PhaseResolution,
	PhaseRule,
} from "../question/question-ast";
import type { GridPosition, SpaceData } from "../space/space-data";

export type GameReadState = Readonly<{
	spaces: Record<string, SpaceData>;
	entities: Record<string, EntityData>;
}>;

export type ReadApi = {
	isEntityKnown: (state: GameReadState, entityId: EntityId) => boolean;
	isSpaceKnown: (state: GameReadState, spaceId: SpaceId) => boolean;
	isEntityInSpace: (
		state: GameReadState,
		entityId: EntityId,
		spaceId: SpaceId,
	) => boolean;
	isEntityPlacementAllowed: (
		state: GameReadState,
		entityId: EntityId,
		toSpaceId: SpaceId,
		toPosition?: GridPosition,
	) => boolean;
	getEntity: (
		state: GameReadState,
		entityId: EntityId,
	) => EntityData | undefined;
	getSpace: (state: GameReadState, spaceId: SpaceId) => SpaceData | undefined;
	getEntitySpaceId: (state: GameReadState, entityId: EntityId) => string | null;
	getGridEntityPosition: (
		state: GameReadState,
		entityId: EntityId,
		spaceId?: SpaceId,
	) => GridPosition | undefined;
	getSpaceEntityIds: (state: GameReadState, spaceId: SpaceId) => string[];
	selectEntitiesByType: (state: GameReadState, type: string) => EntityData[];
	selectEntityStateValue: <T = unknown>(
		state: GameReadState,
		entityId: EntityId,
		key: string,
	) => T | undefined;
	selectSpaceEntityCount: (state: GameReadState, spaceId: SpaceId) => number;
	selectSpaceIsFull: (state: GameReadState, spaceId: SpaceId) => boolean;
	selectSpaceIsEmpty: (state: GameReadState, spaceId: SpaceId) => boolean;
	selectGridEmptyPositions: (
		state: GameReadState,
		spaceId: SpaceId,
	) => GridPosition[];
	selectDerivedPhase: <CK extends string>(
		rules: PhaseRule<CK>[],
		context: ConditionContext<CK>,
		currentPhase: string,
		fallbackPhase: string,
	) => PhaseResolution;
};
