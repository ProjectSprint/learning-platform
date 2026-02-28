import type {
	EntityEventTrigger,
	LaneSchedulerInput,
	LaneSelectionResult,
	ModalEventTrigger,
	TerminalEventTrigger,
} from "@/components/game/types/behavior";
import type {
	EntityData as StoredEntityData,
	EntityData as StoredEntityDataForRead,
} from "@/components/game/types/entity";
import type {
	ConditionContext,
	PhaseResolution,
	PhaseRule,
} from "@/components/game/types/question";
import type {
	CommandApi,
	RuntimeApiResult,
} from "@/components/game/types/runtime";
import type { GridPosition } from "@/components/game/types/space";
import type {
	GameEvent,
	GameState,
	ModalSubmittedEvent,
	TerminalInputEvent,
} from "@/components/game/types/state";
import { resolvePhase } from "../../internal/domain/question";
import {
	getEntity,
	getEntitySpaceId,
	getSpace,
	getSpaceEntityIds,
	selectEntitiesByType as internalSelectEntitiesByType,
	selectEntityStateValue as internalSelectEntityStateValue,
	selectGridEmptyPositions as internalSelectGridEmptyPositions,
	selectSpaceIsEmpty as internalSelectSpaceIsEmpty,
	selectSpaceIsFull as internalSelectSpaceIsFull,
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
export const resolveQuestionPhase = <ConditionKey extends string>(
	rules: PhaseRule<ConditionKey>[],
	context: ConditionContext<ConditionKey>,
	currentPhase: string,
	fallbackPhase = currentPhase,
): PhaseResolution => {
	return resolvePhase(rules, context, currentPhase, fallbackPhase);
};

/** @deprecated Use resolveQuestionPhase instead */
export const deriveQuestionPhase = resolveQuestionPhase;

/**
 * Returns the current space ID containing an entity, or null if not found.
 * Performs a cheap existence check before evaluating placement.
 */
export const getEntitySpaceId_public = (
	snapshot: GameState,
	entityId: string,
): string | null => {
	if (!getEntity(snapshot, entityId)) {
		return null;
	}
	return getEntitySpaceId(snapshot, entityId);
};

/** @deprecated Use getEntitySpaceId_public instead */
export const findEntitySpace = getEntitySpaceId_public;

/**
 * Lists entity IDs currently contained in a space.
 */
export const getSpaceEntityIds_public = (
	snapshot: GameState,
	spaceId: string,
): string[] => {
	return getSpaceEntityIds(snapshot, spaceId);
};

/** @deprecated Use getSpaceEntityIds_public instead */
export const listSpaceEntityIds = getSpaceEntityIds_public;

/**
 * Returns the entity data for a given ID, or undefined if not found.
 */
export const getEntity_public = (
	snapshot: GameState,
	entityId: string,
): StoredEntityDataForRead | undefined => {
	return getEntity(snapshot, entityId);
};

/** @deprecated Use getEntity_public instead */
export const lookupEntity = getEntity_public;

/**
 * Returns the space data for a given ID, or undefined if not found.
 */
export const getSpace_public = (snapshot: GameState, spaceId: string) => {
	return getSpace(snapshot, spaceId);
};

/** @deprecated Use getSpace_public instead */
export const lookupSpace = getSpace_public;

/**
 * True when an entity is currently placed in the specified space.
 */
export const isEntityInSpace_public = (
	snapshot: GameState,
	entityId: string,
	spaceId: string,
): boolean => {
	if (getEntitySpaceId_public(snapshot, entityId) !== spaceId) {
		return false;
	}
	return isEntityInSpace(snapshot, entityId, spaceId);
};

/** @deprecated Use isEntityInSpace_public instead */
export const entityIsInSpace = isEntityInSpace_public;

/**
 * Returns all entities matching the given type string.
 */
export const getEntitiesByType = (
	snapshot: GameState,
	type: string,
): StoredEntityDataForRead[] => {
	return internalSelectEntitiesByType(snapshot, type);
};

/** @deprecated Use getEntitiesByType instead */
export const selectEntitiesByType = getEntitiesByType;

/**
 * Returns a single entity state value by key, or undefined.
 */
export const getEntityStateValue = <T = unknown>(
	snapshot: GameState,
	entityId: string,
	key: string,
): T | undefined => {
	return internalSelectEntityStateValue<T>(snapshot, entityId, key);
};

/** @deprecated Use getEntityStateValue instead */
export const selectEntityStateValue = getEntityStateValue;

/**
 * Returns all empty grid positions for a grid space.
 */
export const getGridEmptyPositions = (
	snapshot: GameState,
	spaceId: string,
): GridPosition[] => {
	return internalSelectGridEmptyPositions(snapshot, spaceId);
};

/** @deprecated Use getGridEmptyPositions instead */
export const selectGridEmptyPositions = getGridEmptyPositions;

/**
 * True when a space has reached its maximum capacity.
 */
export const isSpaceFull = (snapshot: GameState, spaceId: string): boolean => {
	return internalSelectSpaceIsFull(snapshot, spaceId);
};

/** @deprecated Use isSpaceFull instead */
export const selectSpaceIsFull = isSpaceFull;

/**
 * True when a space contains no entities.
 */
export const isSpaceEmpty = (snapshot: GameState, spaceId: string): boolean => {
	return internalSelectSpaceIsEmpty(snapshot, spaceId);
};

/** @deprecated Use isSpaceEmpty instead */
export const selectSpaceIsEmpty = isSpaceEmpty;

/**
 * True when at least one visible modal has an `instance.id` matching the predicate.
 */
export const isModalOpen = (
	state: GameState,
	predicate: (modalId: string) => boolean,
): boolean => {
	return Object.values(state.overlay.modals).some(
		(entry) =>
			entry.visible &&
			entry.instance.id != null &&
			predicate(entry.instance.id),
	);
};

/**
 * Chooses a lane using the runtime lane scheduler policy.
 */
export const pickLane_public = <TLaneId extends string>(
	input: LaneSchedulerInput<TLaneId>,
): LaneSelectionResult<TLaneId> => pickLane(input);

/** @deprecated Use pickLane_public instead */
export const chooseLaneForExecution = pickLane_public;

/**
 * Builds a behavior trigger for entity click interactions.
 */
export const buildEntityClickTrigger = <
	TEntityType extends string = never,
	TSpaceId extends string = never,
>(
	entityType?: TEntityType,
	spaceId?: TSpaceId,
): EntityEventTrigger<TSpaceId, TEntityType> =>
	entityClicked(entityType, spaceId);

/**
 * Builds a behavior trigger for modal submit events.
 */
export const buildModalSubmitTrigger = <
	TModalId extends string = never,
	TModalActionId extends string = never,
>(
	modalId?: TModalId,
	modalActionId?: TModalActionId,
): ModalEventTrigger<TModalId, TModalActionId> =>
	modalSubmitted(modalId, modalActionId);

export type ModalSubmissionParseResult<TValues> =
	| { ok: true; value: TValues }
	| { ok: false; errors: string[] };

export type ModalContract<TId extends string, TValues> = {
	id: TId;
	actionId: string;
	modalId?: string;
	modalIdStartsWith?: string;
	parse: (
		values: Record<string, unknown>,
		event: ModalSubmittedEvent,
	) => ModalSubmissionParseResult<TValues>;
};

export type TerminalContract<TId extends string, TCommand> = {
	id: TId;
	parse: (
		input: string,
		event: TerminalInputEvent,
	) => ModalSubmissionParseResult<TCommand>;
};

export type ModalSubmissionContract<TValues> = Omit<
	ModalContract<string, TValues>,
	"id"
> & {
	id?: string;
};

export type TerminalInputContract<TCommand> = Omit<
	TerminalContract<string, TCommand>,
	"id"
> & {
	id?: string;
};

export type EntityContractSchema = {
	data: Record<string, unknown>;
	state: Record<string, unknown>;
};

export type EntityContractMap = Record<string, EntityContractSchema>;

export type AnyModalContract = ModalContract<string, unknown>;
export type AnyTerminalContract = TerminalContract<string, unknown>;

export type ContractRegistry = {
	modal: Record<string, AnyModalContract>;
	terminal: Record<string, AnyTerminalContract>;
	entity: EntityContractMap;
};

export type InferModal<T extends AnyModalContract> = T extends ModalContract<
	string,
	infer TValues
>
	? TValues
	: never;

export type InferTerminal<T extends AnyTerminalContract> =
	T extends TerminalContract<string, infer TCommand> ? TCommand : never;

export type ModalKey<TRegistry extends ContractRegistry> =
	keyof TRegistry["modal"] & string;

export type TerminalKey<TRegistry extends ContractRegistry> =
	keyof TRegistry["terminal"] & string;

export type EntityKey<TRegistry extends ContractRegistry> =
	keyof TRegistry["entity"] & string;

export type ModalPayload<
	TRegistry extends ContractRegistry,
	TKey extends ModalKey<TRegistry>,
> = InferModal<TRegistry["modal"][TKey]>;

export type TerminalPayload<
	TRegistry extends ContractRegistry,
	TKey extends TerminalKey<TRegistry>,
> = InferTerminal<TRegistry["terminal"][TKey]>;

export type EntityData<
	TRegistry extends ContractRegistry,
	TKey extends EntityKey<TRegistry>,
> = TRegistry["entity"][TKey]["data"];

export type EntityState<
	TRegistry extends ContractRegistry,
	TKey extends EntityKey<TRegistry>,
> = TRegistry["entity"][TKey]["state"];

export type RegistryEntityPayloadWriter<TRegistry extends ContractRegistry> = {
	updateData: <TKey extends EntityKey<TRegistry>>(
		entityId: string,
		entityType: TKey,
		patch: Partial<EntityData<TRegistry, TKey>>,
	) => RuntimeApiResult;
	updateState: <TKey extends EntityKey<TRegistry>>(
		entityId: string,
		entityType: TKey,
		patch: Partial<EntityState<TRegistry, TKey>>,
	) => RuntimeApiResult;
};

export type EntityPayloadWriter<
	TDataByType extends Record<string, Record<string, unknown>>,
	TStateByType extends Record<string, Record<string, unknown>>,
> = {
	updateData: <K extends keyof TDataByType & string>(
		entityId: string,
		entityType: K,
		patch: Partial<TDataByType[K]>,
	) => RuntimeApiResult;
	updateState: <K extends keyof TStateByType & string>(
		entityId: string,
		entityType: K,
		patch: Partial<TStateByType[K]>,
	) => RuntimeApiResult;
};

export const createEntityPayloadWriter = <
	TDataByType extends Record<string, Record<string, unknown>>,
	TStateByType extends Record<string, Record<string, unknown>>,
>(
	cmd: Pick<CommandApi, "patchEntity" | "patchEntityState">,
): EntityPayloadWriter<TDataByType, TStateByType> => {
	return {
		updateData(entityId, entityType, patch) {
			void entityType;
			return cmd.patchEntity(entityId, { data: patch });
		},
		updateState(entityId, entityType, patch) {
			void entityType;
			return cmd.patchEntityState(entityId, patch);
		},
	};
};

/**
 * A view of a stored entity with data/state narrowed by entity type.
 * Used by EntityReader to provide typed access without changing runtime storage.
 */
export type TypedEntity<
	TData extends Record<string, unknown> = Record<string, unknown>,
	TState extends Record<string, unknown> = Record<string, unknown>,
> = Omit<StoredEntityData, "data" | "state"> & {
	data: TData;
	state: TState;
};

/**
 * Typed entity reader — provides compile-time-safe reads from erased GameState.
 * Mirrors EntityPayloadWriter: callers supply the entity type key to recover types.
 */
export type EntityReader<
	TDataByType extends Record<string, Record<string, unknown>>,
	TStateByType extends Record<string, Record<string, unknown>>,
> = {
	get: <K extends keyof TDataByType & keyof TStateByType & string>(
		snapshot: GameState,
		entityId: string,
		entityType: K,
	) => TypedEntity<TDataByType[K], TStateByType[K]> | null;

	getData: <K extends keyof TDataByType & string>(
		snapshot: GameState,
		entityId: string,
		entityType: K,
	) => TDataByType[K] | null;

	getState: <K extends keyof TStateByType & string>(
		snapshot: GameState,
		entityId: string,
		entityType: K,
	) => TStateByType[K] | null;

	is: <K extends keyof TDataByType & keyof TStateByType & string>(
		entity: StoredEntityData | undefined,
		entityType: K,
	) => entity is TypedEntity<TDataByType[K], TStateByType[K]>;
};

/**
 * Creates a typed entity reader for compile-time-safe entity data access.
 * The reader validates entity.type at runtime before casting.
 *
 * Usage:
 * ```ts
 * const entities = createEntityReader<MyDataByType, MyStateByType>();
 * const router = entities.get(snapshot, deviceId, "router");
 * router?.data.dhcpEnabled; // typed boolean
 * ```
 */
export const createEntityReader = <
	TDataByType extends Record<string, Record<string, unknown>>,
	TStateByType extends Record<string, Record<string, unknown>>,
>(): EntityReader<TDataByType, TStateByType> => ({
	get(snapshot, entityId, entityType) {
		const e = snapshot.entities[entityId];
		if (!e || e.type !== entityType) return null;
		return e as TypedEntity<
			TDataByType[typeof entityType],
			TStateByType[typeof entityType]
		>;
	},
	getData(snapshot, entityId, entityType) {
		return this.get(snapshot, entityId, entityType)?.data ?? null;
	},
	getState(snapshot, entityId, entityType) {
		return this.get(snapshot, entityId, entityType)?.state ?? null;
	},
	is(
		entity,
		entityType,
	): entity is TypedEntity<
		TDataByType[typeof entityType],
		TStateByType[typeof entityType]
	> {
		return entity !== undefined && entity.type === entityType;
	},
});

export const parseModalSubmission = <TValues>(
	event: GameEvent,
	contract: ModalSubmissionContract<TValues>,
): ModalSubmissionParseResult<TValues> | null => {
	if (event.type !== "MODAL_SUBMITTED") {
		return null;
	}

	if (event.modalActionId !== contract.actionId) {
		return null;
	}

	if (contract.modalId !== undefined && event.modalId !== contract.modalId) {
		return null;
	}

	if (
		contract.modalIdStartsWith !== undefined &&
		!event.modalId.startsWith(contract.modalIdStartsWith)
	) {
		return null;
	}

	return contract.parse(event.values, event);
};

export const parseTerminalInput = <TCommand>(
	event: GameEvent,
	contract: TerminalInputContract<TCommand>,
): ModalSubmissionParseResult<TCommand> | null => {
	if (event.type !== "TERMINAL_INPUT") {
		return null;
	}

	return contract.parse(event.input, event);
};

/**
 * Builds a behavior trigger for terminal command input.
 */
export const buildTerminalInputTrigger = (
	match?: string | RegExp,
): TerminalEventTrigger => terminalInput(match);

/**
 * Builds a behavior trigger for entity placement into a space.
 */
export const buildEntityPlacedTrigger = <
	TSpaceId extends string = never,
	TEntityType extends string = never,
>(
	spaceId?: TSpaceId,
	entityType?: TEntityType,
): EntityEventTrigger<TSpaceId, TEntityType> =>
	whenEntityPlacedInSpace(spaceId, entityType);

/**
 * Builds a behavior trigger for entity arrival events.
 */
export const buildEntityArrivedTrigger = <
	TSpaceId extends string = never,
	TEntityType extends string = never,
>(
	spaceId?: TSpaceId,
	entityType?: TEntityType,
): EntityEventTrigger<TSpaceId, TEntityType> =>
	whenEntityArrivedAtSpace(spaceId, entityType);
