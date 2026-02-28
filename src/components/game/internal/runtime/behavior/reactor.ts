/**
 * useBehaviorReactor — executes declarative behavior rules against game events.
 *
 * Receives events/ack from the caller (useQuestionRuntime) instead of
 * subscribing internally, so there is no double-subscription.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
	BehaviorDefinition,
	BehaviorReactorDeps,
	BehaviorReactorResult,
	EventProvenance,
	EventTrigger,
	GuardCtx,
	HandlerCtx,
	ScheduledCtx,
} from "@/components/game/types/behavior";
import type { EntityData } from "@/components/game/types/entity";
import type { CommandApi } from "@/components/game/types/runtime";
import type { GameEvent, GameState } from "@/components/game/types/state";

function buildCommandApi(deps: BehaviorReactorDeps): CommandApi {
	const { world, interaction, flow, progress } = deps;

	return {
		// Entity lifecycle
		spawnEntity: (config) => world.spawnEntity(config),
		patchEntity: (entityId, updates) => world.patchEntity(entityId, updates),
		patchEntityState: (entityId, state) =>
			world.patchEntityState(entityId, state),
		destroyEntities: (entityIds) => world.destroyEntities(entityIds),

		// Space placement
		placeInSpace: (entityId, spaceId, position) =>
			world.placeInSpace(entityId, spaceId, position),
		removeFromSpace: (entityId, spaceId) =>
			world.removeFromSpace(entityId, spaceId),
		moveEntity: (entityId, toSpaceId, position) =>
			world.moveEntity(entityId, toSpaceId, position),
		moveEntityToGrid: (entityId, spaceId) =>
			world.moveEntityToGrid(entityId, spaceId),

		// Interaction
		openModal: (modal) => interaction.openModal(modal),
		closeModal: (modalId) => interaction.closeModal(modalId),
		setPhase: (phase, source) => {
			interaction.requestPhaseTransition(phase, source ?? "behavior");
		},
		showTerminal: (visible) => interaction.setTerminalVisible(visible),
		setModalGateOpen: (open) => interaction.setModalGateOpen(open),

		// Flow
		dispatchIntent: (intent) => flow.dispatchIntent(intent),

		// Progress
		completeQuestion: () => progress.completeQuestion(),
		setQuestionStatus: (input) => progress.setQuestionStatus(input),

		// Terminal sub-object
		terminal: {
			write: (content, type = "output") => {
				deps.terminal?.writeOutput(content, type);
			},
			clearHistory: () => {
				deps.terminal?.clearHistory();
			},
			finish: () => {
				deps.terminal?.finishEngine();
			},
		},

		// Convenience shortcuts
		moveToInventory: (entityId) => {
			world.moveEntity(entityId, "inventory");
		},
		moveToGrid: (entityId, spaceId) => {
			const result = world.moveEntityToGrid(entityId, spaceId);
			return result.ok;
		},
	};
}

export function useBehaviorReactor<
	TContext extends Record<string, unknown> = Record<string, never>,
>(
	definition: BehaviorDefinition<TContext> | undefined,
	deps: BehaviorReactorDeps,
): BehaviorReactorResult<TContext> {
	const initialContext = definition?.initialContext ?? ({} as TContext);
	const contextRef = useRef<TContext>(initialContext);
	const [contextState, setContextState] = useState<TContext>(initialContext);
	const setContextRef = useRef(setContextState);
	setContextRef.current = setContextState;

	const commitContext = useCallback((updater: (ctx: TContext) => void) => {
		const next = structuredClone(contextRef.current);
		updater(next);
		contextRef.current = next;
		setContextRef.current(next);
	}, []);
	const commitContextRef = useRef(commitContext);
	commitContextRef.current = commitContext;

	const stateRef = useRef(deps.state);
	stateRef.current = deps.state;

	const onceKeys = useRef<Set<string>>(new Set());
	const processingRef = useRef(false);

	const depsRef = useRef(deps);
	depsRef.current = deps;

	const rulesRef = useRef(definition?.rules);
	rulesRef.current = definition?.rules;

	const { events, ack } = deps;

	useEffect(() => {
		const rules = rulesRef.current;

		if (!rules || events.length === 0 || processingRef.current) {
			return;
		}

		processingRef.current = true;
		let cancelled = false;

		(async () => {
			try {
				for (const event of events) {
					if (cancelled) break;

					const state = stateRef.current;
					const entity = resolveEntity(event, state);

					for (const rule of rules) {
						if (!matchesEventTrigger(event, rule.on, state)) continue;

						const guardCtx = buildGuardContext<TContext>(
							event,
							entity,
							state,
							contextRef.current,
							rule.id,
						);

						if (rule.guard && !rule.guard(guardCtx)) continue;

						const effectCtx = buildHandlerCtx(
							event,
							entity,
							state,
							contextRef,
							commitContextRef,
							onceKeys.current,
							depsRef.current,
							stateRef,
							depsRef,
							rule.id,
						);

						await rule.handler(effectCtx);
						break;
					}
				}
				if (!cancelled) ack();
			} catch (err) {
				console.error("[behavior reactor] unhandled error:", err);
				if (!cancelled) ack();
			} finally {
				processingRef.current = false;
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [events, ack]);

	return { store: contextState };
}

type TriggerMatcherContext = {
	event: GameEvent;
	entityType: string | undefined;
};

const matchSpaceAndEntity = (
	ctx: TriggerMatcherContext,
	spaceId: string | undefined,
	triggerSpace: string | undefined,
	triggerEntityType: string | undefined,
): boolean =>
	(triggerSpace === undefined || spaceId === triggerSpace) &&
	(triggerEntityType === undefined || ctx.entityType === triggerEntityType);

export function matchesEventTrigger(
	event: GameEvent,
	trigger: EventTrigger,
	state: GameState,
): boolean {
	const entityType =
		"entityId" in event ? state.entities[event.entityId]?.type : undefined;
	const ctx: TriggerMatcherContext = { event, entityType };

	switch (trigger.event) {
		case "ENTITY_PLACED_IN_SPACE":
			if (event.type !== "ENTITY_ENTERED_SPACE") return false;
			return matchSpaceAndEntity(
				ctx,
				event.spaceId,
				trigger.space,
				trigger.entityType,
			);
		case "ENTITY_TRANSFERRED_TO_SPACE":
			if (event.type !== "ENTITY_MOVED") return false;
			return matchSpaceAndEntity(
				ctx,
				event.toSpaceId,
				trigger.space,
				trigger.entityType,
			);
		case "ENTITY_ARRIVED_AT_SPACE": {
			if (
				event.type !== "ENTITY_ENTERED_SPACE" &&
				event.type !== "ENTITY_MOVED"
			) {
				return false;
			}
			const spaceId =
				event.type === "ENTITY_ENTERED_SPACE" ? event.spaceId : event.toSpaceId;
			return matchSpaceAndEntity(
				ctx,
				spaceId,
				trigger.space,
				trigger.entityType,
			);
		}
		case "ENTITY_LEFT_SPACE":
			if (event.type !== "ENTITY_LEFT_SPACE") return false;
			return matchSpaceAndEntity(
				ctx,
				event.spaceId,
				trigger.space,
				trigger.entityType,
			);
		case "ENTITY_CLICKED":
			if (event.type !== "ENTITY_CLICKED") return false;
			return matchSpaceAndEntity(
				ctx,
				event.spaceId,
				trigger.space,
				trigger.entityType,
			);
		case "ENTITY_UPDATED":
			if (event.type !== "ENTITY_UPDATED") return false;
			return (
				trigger.entityType === undefined ||
				ctx.entityType === trigger.entityType
			);
		case "MODAL_OPENED":
			if (event.type !== "MODAL_OPENED") return false;
			return trigger.modalId === undefined || event.modalId === trigger.modalId;
		case "MODAL_CLOSED":
			if (event.type !== "MODAL_CLOSED") return false;
			return trigger.modalId === undefined || event.modalId === trigger.modalId;
		case "MODAL_SUBMITTED":
			if (event.type !== "MODAL_SUBMITTED") return false;
			return (
				(trigger.modalId === undefined || event.modalId === trigger.modalId) &&
				(trigger.modalActionId === undefined ||
					event.modalActionId === trigger.modalActionId)
			);
		case "TERMINAL_INPUT":
			if (event.type !== "TERMINAL_INPUT") return false;
			if (trigger.match === undefined) return true;
			if (typeof trigger.match === "string")
				return event.input === trigger.match;
			if (trigger.match instanceof RegExp)
				return trigger.match.test(event.input);
			return false;
		case "PHASE_CHANGED":
			if (event.type !== "PHASE_CHANGED") return false;
			return (
				(trigger.from === undefined || event.from === trigger.from) &&
				(trigger.to === undefined || event.to === trigger.to)
			);
		case "ENGINE_STARTED":
			return event.type === "ENGINE_STARTED";
		case "ENGINE_FINISHED":
			return event.type === "ENGINE_FINISHED";
		default:
			return false;
	}
}

function resolveEntity(
	event: GameEvent,
	state: GameState,
): EntityData | undefined {
	if ("entityId" in event) {
		return state.entities[event.entityId];
	}
	return undefined;
}

function buildGuardContext<TContext>(
	event: GameEvent,
	entity: EntityData | undefined,
	state: GameState,
	context: Readonly<TContext>,
	ruleId: string,
): GuardCtx<TContext> {
	return {
		event,
		provenance: buildEventProvenance(event, ruleId),
		entity,
		snapshot: state,
		phase: state.phase,
		store: context,
	};
}

type SharedContextDeps<TContext extends Record<string, unknown>> = {
	provenance: EventProvenance;
	contextRef: React.MutableRefObject<TContext>;
	commitContextRef: React.MutableRefObject<
		(updater: (ctx: TContext) => void) => void
	>;
	onceKeys: Set<string>;
	stateRef: React.MutableRefObject<GameState>;
	depsRef: React.MutableRefObject<BehaviorReactorDeps>;
};

function buildSharedContextFields<TContext extends Record<string, unknown>>(
	shared: SharedContextDeps<TContext>,
): Pick<
	ScheduledCtx<TContext>,
	"store" | "mutate" | "cmd" | "delay" | "once" | "schedule" | "cancelSchedule"
> {
	const deps = shared.depsRef.current;
	const cmd = buildCommandApi(deps);

	return {
		get store() {
			return shared.contextRef.current;
		},
		mutate: (updater: (ctx: TContext) => void) => {
			shared.commitContextRef.current(updater);
		},
		cmd,
		delay: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
		once: (key, fn) => {
			if (shared.onceKeys.has(key)) return;
			shared.onceKeys.add(key);
			fn();
		},
		schedule: (key, ms, fn) => {
			deps.scheduler?.schedule(key, ms, () => {
				const inner = buildSharedContextFields(shared);
				const scheduledCtx = {
					snapshot: shared.stateRef.current,
					phase: shared.stateRef.current.phase,
					...inner,
					provenance: shared.provenance,
				} as ScheduledCtx<TContext>;
				Object.defineProperty(scheduledCtx, "store", {
					get: () => shared.contextRef.current,
					enumerable: true,
				});
				fn(scheduledCtx);
			});
		},
		cancelSchedule: (key) => {
			deps.scheduler?.cancel(key);
		},
	};
}

function buildHandlerCtx<TContext extends Record<string, unknown>>(
	event: GameEvent,
	entity: EntityData | undefined,
	state: GameState,
	contextRef: React.MutableRefObject<TContext>,
	commitContextRef: React.MutableRefObject<
		(updater: (ctx: TContext) => void) => void
	>,
	onceKeys: Set<string>,
	_deps: BehaviorReactorDeps,
	stateRef: React.MutableRefObject<GameState>,
	depsRef: React.MutableRefObject<BehaviorReactorDeps>,
	ruleId: string,
): HandlerCtx<TContext> {
	const provenance = buildEventProvenance(event, ruleId);
	const shared = buildSharedContextFields<TContext>({
		provenance,
		contextRef,
		commitContextRef,
		onceKeys,
		stateRef,
		depsRef,
	});

	const ctx = {
		event,
		provenance,
		entity,
		snapshot: state,
		phase: state.phase,
		...shared,
	} as HandlerCtx<TContext>;
	Object.defineProperty(ctx, "store", {
		get: () => contextRef.current,
		enumerable: true,
	});
	return ctx;
}

// Keep the old name exported for the test that imports it directly
export { buildHandlerCtx as buildEffectContext };

// Kept for test compatibility — createBehaviorConvenience was tested directly.
// The functionality is now internal to buildCommandApi.
export const createBehaviorConvenience = ({
	world,
	interaction,
}: Pick<BehaviorReactorDeps, "world" | "interaction">) => ({
	setPhase: (phase: string, source?: string) => {
		interaction.requestPhaseTransition(phase, source ?? "behavior");
	},
	moveToInventory: (entityId: string) => {
		world.moveEntity(entityId, "inventory");
	},
	moveToGrid: (entityId: string, spaceId: string) => {
		const result = world.moveEntityToGrid(entityId, spaceId);
		return result.ok;
	},
});

export function buildEventProvenance(
	event: GameEvent,
	ruleId?: string,
): EventProvenance {
	const base: EventProvenance = {
		eventId: event.eventId,
		actionId: event.actionId,
		eventType: event.type,
		ruleId,
	};
	switch (event.type) {
		case "ENTITY_ENTERED_SPACE":
			return { ...base, entityId: event.entityId, spaceId: event.spaceId };
		case "ENTITY_LEFT_SPACE":
			return { ...base, entityId: event.entityId, spaceId: event.spaceId };
		case "ENTITY_MOVED":
			return {
				...base,
				entityId: event.entityId,
				fromSpaceId: event.fromSpaceId,
				toSpaceId: event.toSpaceId,
				spaceId: event.toSpaceId,
			};
		case "ENTITY_UPDATED":
		case "ENTITY_CLICKED":
			return { ...base, entityId: event.entityId };
		case "MODAL_OPENED":
			return { ...base, modalId: event.modalId };
		case "MODAL_SUBMITTED":
			return {
				...base,
				modalId: event.modalId,
				modalActionId: event.modalActionId,
			};
		case "MODAL_CLOSED":
			return { ...base, modalId: event.modalId };
		case "PHASE_CHANGED":
			return { ...base, fromPhase: event.from, toPhase: event.to };
		case "TERMINAL_INPUT":
			return { ...base, terminalEntryId: event.entryId };
		case "ENGINE_STARTED":
		case "ENGINE_FINISHED":
		case "RUNTIME_WARNING":
			return base;
		default:
			return base;
	}
}
