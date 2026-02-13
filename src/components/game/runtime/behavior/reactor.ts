/**
 * useBehaviorReactor — executes declarative behavior rules against game events.
 *
 * Receives events/ack from the caller (useQuestionRuntime) instead of
 * subscribing internally, so there is no double-subscription.
 */

import { useEffect, useRef } from "react";
import type { GameEvent, GameState } from "../../application/state/types";
import type {
	EntityClickedEvent,
	EntityEnteredSpaceEvent,
	EntityLeftSpaceEvent,
	EntityMovedEvent,
	ModalClosedEvent,
	ModalOpenedEvent,
	ModalSubmittedEvent,
	PhaseChangedEvent,
	TerminalInputEvent,
} from "../../application/state/types/events";
import type { EntityData } from "../../domain/entity/entity-data";
import type {
	ExecutionFlowApi,
	InteractionSessionApi,
	ProgressApi,
	WorldApi,
} from "../wrappers";
import type { QuestionScheduler } from "./scheduler";
import type {
	BehaviorDefinition,
	BehaviorRule,
	EffectContext,
	EventTrigger,
	GuardContext,
	ScheduledEffectContext,
} from "./types";

export type TerminalBridge = {
	writeOutput: (content: string, type?: "output" | "error") => void;
	clearHistory: () => void;
	finishEngine: () => void;
};

export type BehaviorReactorDeps = {
	state: GameState;
	events: GameEvent[];
	ack: () => void;
	world: WorldApi;
	interaction: InteractionSessionApi;
	flow: ExecutionFlowApi;
	progress: ProgressApi;
	terminal?: TerminalBridge;
	scheduler?: QuestionScheduler;
};

export type BehaviorReactorResult<TContext> = {
	context: TContext;
};

type BehaviorConvenienceHelpers = Pick<
	EffectContext<Record<string, unknown>>,
	"setPhase" | "moveToInventory" | "moveToGrid"
>;

type BehaviorConvenienceDeps = Pick<
	BehaviorReactorDeps,
	"world" | "interaction"
>;

export const createBehaviorConvenience = ({
	world,
	interaction,
}: BehaviorConvenienceDeps): BehaviorConvenienceHelpers => ({
	setPhase: (phase, source) => {
		interaction.requestPhaseTransition(phase, source ?? "behavior");
	},
	moveToInventory: (entityId) => {
		world.moveEntity(entityId, "inventory");
	},
	moveToGrid: (entityId, spaceId) => {
		const result = world.moveEntityToGrid(entityId, spaceId);
		return result.ok;
	},
});

export function useBehaviorReactor<
	TContext extends Record<string, unknown> = Record<string, never>,
>(
	definition: BehaviorDefinition<TContext> | undefined,
	deps: BehaviorReactorDeps,
): BehaviorReactorResult<TContext> {
	const contextRef = useRef<TContext>(
		definition?.initialContext ?? ({} as TContext),
	);
	const stateRef = useRef(deps.state);
	stateRef.current = deps.state;

	const onceKeys = useRef<Set<string>>(new Set());
	const processingRef = useRef(false);
	const idempotencyKeysRef = useRef<Map<string, number>>(new Map());

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
						);

						if (rule.guard && !rule.guard(guardCtx)) continue;
						if (
							!shouldRunRuleWithIdempotency(
								rule.id,
								rule.idempotency,
								guardCtx,
								idempotencyKeysRef.current,
							)
						) {
							continue;
						}

						const effectCtx = buildEffectContext(
							event,
							entity,
							state,
							contextRef,
							onceKeys.current,
							depsRef.current,
							stateRef,
							depsRef,
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

	return { context: contextRef.current };
}

type IdempotencyConfig<TContext> = BehaviorRule<TContext>["idempotency"];

const IDEMPOTENCY_MAX_ENTRIES = 2000;

const trimIdempotencyRegistry = (registry: Map<string, number>) => {
	if (registry.size <= IDEMPOTENCY_MAX_ENTRIES) {
		return;
	}
	const overflow = registry.size - IDEMPOTENCY_MAX_ENTRIES;
	const keys = registry.keys();
	for (let idx = 0; idx < overflow; idx += 1) {
		const key = keys.next().value;
		if (typeof key !== "string") {
			break;
		}
		registry.delete(key);
	}
};

export function shouldRunRuleWithIdempotency<TContext>(
	ruleId: string,
	idempotency: IdempotencyConfig<TContext> | undefined,
	guardCtx: GuardContext<TContext>,
	registry: Map<string, number>,
): boolean {
	if (!idempotency) {
		return true;
	}

	const resolvedKey =
		typeof idempotency.key === "function"
			? idempotency.key(guardCtx)
			: idempotency.key;
	if (!resolvedKey) {
		return true;
	}

	const scope = idempotency.scope ?? "action";
	const namespacedKey = `${ruleId}:${resolvedKey}`;
	const existingActionId = registry.get(namespacedKey);

	if (scope === "session") {
		if (existingActionId !== undefined) {
			return false;
		}
		registry.set(namespacedKey, guardCtx.event.actionId);
		trimIdempotencyRegistry(registry);
		return true;
	}

	if (existingActionId === guardCtx.event.actionId) {
		return false;
	}
	registry.set(namespacedKey, guardCtx.event.actionId);
	trimIdempotencyRegistry(registry);
	return true;
}

export function matchesEventTrigger(
	event: GameEvent,
	trigger: EventTrigger,
	state: GameState,
): boolean {
	const entityType =
		"entityId" in event
			? state.entities[(event as { entityId: string }).entityId]?.type
			: undefined;

	switch (trigger.event) {
		case "ENTITY_ENTERED_SPACE": {
			if (event.type !== "ENTITY_ENTERED_SPACE") return false;
			const e = event as EntityEnteredSpaceEvent;
			return (
				(trigger.space === undefined || e.spaceId === trigger.space) &&
				(trigger.entityType === undefined || entityType === trigger.entityType)
			);
		}
		case "ENTITY_MOVED": {
			if (event.type !== "ENTITY_MOVED") return false;
			const e = event as EntityMovedEvent;
			return (
				(trigger.toSpace === undefined || e.toSpaceId === trigger.toSpace) &&
				(trigger.entityType === undefined || entityType === trigger.entityType)
			);
		}
		case "ENTITY_ARRIVED": {
			if (
				event.type !== "ENTITY_ENTERED_SPACE" &&
				event.type !== "ENTITY_MOVED"
			) {
				return false;
			}
			const spaceId =
				event.type === "ENTITY_ENTERED_SPACE" ? event.spaceId : event.toSpaceId;
			return (
				(trigger.space === undefined || spaceId === trigger.space) &&
				(trigger.entityType === undefined || entityType === trigger.entityType)
			);
		}
		case "ENTITY_LEFT_SPACE": {
			if (event.type !== "ENTITY_LEFT_SPACE") return false;
			const e = event as EntityLeftSpaceEvent;
			return (
				(trigger.space === undefined || e.spaceId === trigger.space) &&
				(trigger.entityType === undefined || entityType === trigger.entityType)
			);
		}
		case "ENTITY_CLICKED": {
			if (event.type !== "ENTITY_CLICKED") return false;
			const e = event as EntityClickedEvent;
			return (
				(trigger.space === undefined || e.spaceId === trigger.space) &&
				(trigger.entityType === undefined || entityType === trigger.entityType)
			);
		}
		case "ENTITY_UPDATED":
			if (event.type !== "ENTITY_UPDATED") return false;
			return (
				trigger.entityType === undefined || entityType === trigger.entityType
			);
		case "MODAL_OPENED": {
			if (event.type !== "MODAL_OPENED") return false;
			const e = event as ModalOpenedEvent;
			return trigger.modalId === undefined || e.modalId === trigger.modalId;
		}
		case "MODAL_CLOSED": {
			if (event.type !== "MODAL_CLOSED") return false;
			const e = event as ModalClosedEvent;
			return trigger.modalId === undefined || e.modalId === trigger.modalId;
		}
		case "MODAL_SUBMITTED": {
			if (event.type !== "MODAL_SUBMITTED") return false;
			const e = event as ModalSubmittedEvent;
			return (
				(trigger.modalId === undefined || e.modalId === trigger.modalId) &&
				(trigger.modalActionId === undefined ||
					e.modalActionId === trigger.modalActionId)
			);
		}
		case "TERMINAL_INPUT": {
			if (event.type !== "TERMINAL_INPUT") return false;
			const e = event as TerminalInputEvent;
			if (trigger.match === undefined) return true;
			if (typeof trigger.match === "string") return e.input === trigger.match;
			if (trigger.match instanceof RegExp) return trigger.match.test(e.input);
			return false;
		}
		case "PHASE_CHANGED": {
			if (event.type !== "PHASE_CHANGED") return false;
			const e = event as PhaseChangedEvent;
			return (
				(trigger.from === undefined || e.from === trigger.from) &&
				(trigger.to === undefined || e.to === trigger.to)
			);
		}
		case "ENGINE_STARTED":
			if (event.type !== "ENGINE_STARTED") return false;
			return true;
		case "ENGINE_FINISHED":
			if (event.type !== "ENGINE_FINISHED") return false;
			return true;
		default:
			return false;
	}
}

function resolveEntity(
	event: GameEvent,
	state: GameState,
): EntityData | undefined {
	if ("entityId" in event) {
		return state.entities[(event as { entityId: string }).entityId];
	}
	return undefined;
}

function buildGuardContext<TContext>(
	event: GameEvent,
	entity: EntityData | undefined,
	state: GameState,
	context: Readonly<TContext>,
): GuardContext<TContext> {
	return { event, entity, state, phase: state.phase, context };
}

function buildEffectContext<TContext extends Record<string, unknown>>(
	event: GameEvent,
	entity: EntityData | undefined,
	state: GameState,
	contextRef: React.MutableRefObject<TContext>,
	onceKeys: Set<string>,
	deps: BehaviorReactorDeps,
	stateRef: React.MutableRefObject<GameState>,
	depsRef: React.MutableRefObject<BehaviorReactorDeps>,
): EffectContext<TContext> {
	const convenience = createBehaviorConvenience({
		world: deps.world,
		interaction: deps.interaction,
	});

	return {
		event,
		entity,
		state,
		phase: state.phase,
		context: contextRef.current,
		updateContext: (updater) => {
			updater(contextRef.current);
		},
		world: deps.world,
		interaction: deps.interaction,
		flow: deps.flow,
		progress: deps.progress,
		delay: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
		once: (key, fn) => {
			if (onceKeys.has(key)) return;
			onceKeys.add(key);
			fn();
		},
		terminal: {
			writeOutput: (content, type = "output") => {
				deps.terminal?.writeOutput(content, type);
			},
			clearHistory: () => {
				deps.terminal?.clearHistory();
			},
			finishEngine: () => {
				deps.terminal?.finishEngine();
			},
		},
		schedule: (key, ms, fn) => {
			deps.scheduler?.schedule(key, ms, () => {
				const freshState = stateRef.current;
				const freshDeps = depsRef.current;
				const freshConvenience = createBehaviorConvenience({
					world: freshDeps.world,
					interaction: freshDeps.interaction,
				});
				const scheduledCtx: ScheduledEffectContext<TContext> = {
					state: freshState,
					phase: freshState.phase,
					context: contextRef.current,
					updateContext: (updater) => {
						updater(contextRef.current);
					},
					world: freshDeps.world,
					interaction: freshDeps.interaction,
					flow: freshDeps.flow,
					progress: freshDeps.progress,
					delay: (d) => new Promise<void>((resolve) => setTimeout(resolve, d)),
					once: (k, f) => {
						if (onceKeys.has(k)) return;
						onceKeys.add(k);
						f();
					},
					terminal: {
						writeOutput: (content, type = "output") => {
							freshDeps.terminal?.writeOutput(content, type);
						},
						clearHistory: () => {
							freshDeps.terminal?.clearHistory();
						},
						finishEngine: () => {
							freshDeps.terminal?.finishEngine();
						},
					},
					schedule: (k, d, f) => {
						freshDeps.scheduler?.schedule(k, d, () => {
							const s = stateRef.current;
							const dd = depsRef.current;
							const sc = createBehaviorConvenience({
								world: dd.world,
								interaction: dd.interaction,
							});
							const nested: ScheduledEffectContext<TContext> = {
								...scheduledCtx,
								state: s,
								phase: s.phase,
								context: contextRef.current,
								world: dd.world,
								interaction: dd.interaction,
								flow: dd.flow,
								progress: dd.progress,
								setPhase: sc.setPhase,
								moveToInventory: sc.moveToInventory,
								moveToGrid: sc.moveToGrid,
							};
							f(nested);
						});
					},
					cancelSchedule: (k) => {
						freshDeps.scheduler?.cancel(k);
					},
					setPhase: freshConvenience.setPhase,
					moveToInventory: freshConvenience.moveToInventory,
					moveToGrid: freshConvenience.moveToGrid,
				};
				fn(scheduledCtx);
			});
		},
		cancelSchedule: (key) => {
			deps.scheduler?.cancel(key);
		},
		setPhase: convenience.setPhase,
		moveToInventory: convenience.moveToInventory,
		moveToGrid: convenience.moveToGrid,
	};
}
