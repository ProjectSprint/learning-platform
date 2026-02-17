/**
 * useBehaviorReactor — executes declarative behavior rules against game events.
 *
 * Receives events/ack from the caller (useQuestionRuntime) instead of
 * subscribing internally, so there is no double-subscription.
 */

import { useEffect, useRef } from "react";
import type {
	BehaviorDefinition,
	BehaviorReactorDeps,
	BehaviorReactorResult,
	EffectContext,
	EventProvenance,
	EventTrigger,
	GuardContext,
	ScheduledEffectContext,
} from "@/components/game/types/behavior";
import type { EntityData } from "@/components/game/types/entity";
import type { GameEvent, GameState } from "@/components/game/types/state";

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

						const effectCtx = buildEffectContext(
							event,
							entity,
							state,
							contextRef,
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

	return { context: contextRef.current };
}

type TriggerMatcherContext = {
	event: GameEvent;
	trigger: EventTrigger;
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

const TRIGGER_MATCHERS: Record<
	EventTrigger["event"],
	(ctx: TriggerMatcherContext) => boolean
> = {
	ENTITY_PLACED_IN_SPACE: (ctx) => {
		if (ctx.event.type !== "ENTITY_ENTERED_SPACE") return false;
		const t = ctx.trigger as Extract<
			EventTrigger,
			{ event: "ENTITY_PLACED_IN_SPACE" }
		>;
		return matchSpaceAndEntity(ctx, ctx.event.spaceId, t.space, t.entityType);
	},
	ENTITY_TRANSFERRED_TO_SPACE: (ctx) => {
		if (ctx.event.type !== "ENTITY_MOVED") return false;
		const t = ctx.trigger as Extract<
			EventTrigger,
			{ event: "ENTITY_TRANSFERRED_TO_SPACE" }
		>;
		return matchSpaceAndEntity(ctx, ctx.event.toSpaceId, t.space, t.entityType);
	},
	ENTITY_ARRIVED_AT_SPACE: (ctx) => {
		if (
			ctx.event.type !== "ENTITY_ENTERED_SPACE" &&
			ctx.event.type !== "ENTITY_MOVED"
		)
			return false;
		const t = ctx.trigger as Extract<
			EventTrigger,
			{ event: "ENTITY_ARRIVED_AT_SPACE" }
		>;
		const spaceId =
			ctx.event.type === "ENTITY_ENTERED_SPACE"
				? ctx.event.spaceId
				: ctx.event.toSpaceId;
		return matchSpaceAndEntity(ctx, spaceId, t.space, t.entityType);
	},
	ENTITY_LEFT_SPACE: (ctx) => {
		if (ctx.event.type !== "ENTITY_LEFT_SPACE") return false;
		const t = ctx.trigger as Extract<
			EventTrigger,
			{ event: "ENTITY_LEFT_SPACE" }
		>;
		return matchSpaceAndEntity(ctx, ctx.event.spaceId, t.space, t.entityType);
	},
	ENTITY_CLICKED: (ctx) => {
		if (ctx.event.type !== "ENTITY_CLICKED") return false;
		const t = ctx.trigger as Extract<EventTrigger, { event: "ENTITY_CLICKED" }>;
		return matchSpaceAndEntity(ctx, ctx.event.spaceId, t.space, t.entityType);
	},
	ENTITY_UPDATED: (ctx) => {
		if (ctx.event.type !== "ENTITY_UPDATED") return false;
		const t = ctx.trigger as Extract<EventTrigger, { event: "ENTITY_UPDATED" }>;
		return t.entityType === undefined || ctx.entityType === t.entityType;
	},
	MODAL_OPENED: (ctx) => {
		if (ctx.event.type !== "MODAL_OPENED") return false;
		const t = ctx.trigger as Extract<EventTrigger, { event: "MODAL_OPENED" }>;
		return t.modalId === undefined || ctx.event.modalId === t.modalId;
	},
	MODAL_CLOSED: (ctx) => {
		if (ctx.event.type !== "MODAL_CLOSED") return false;
		const t = ctx.trigger as Extract<EventTrigger, { event: "MODAL_CLOSED" }>;
		return t.modalId === undefined || ctx.event.modalId === t.modalId;
	},
	MODAL_SUBMITTED: (ctx) => {
		if (ctx.event.type !== "MODAL_SUBMITTED") return false;
		const t = ctx.trigger as Extract<
			EventTrigger,
			{ event: "MODAL_SUBMITTED" }
		>;
		return (
			(t.modalId === undefined || ctx.event.modalId === t.modalId) &&
			(t.modalActionId === undefined ||
				ctx.event.modalActionId === t.modalActionId)
		);
	},
	TERMINAL_INPUT: (ctx) => {
		if (ctx.event.type !== "TERMINAL_INPUT") return false;
		const t = ctx.trigger as Extract<EventTrigger, { event: "TERMINAL_INPUT" }>;
		if (t.match === undefined) return true;
		if (typeof t.match === "string") return ctx.event.input === t.match;
		if (t.match instanceof RegExp) return t.match.test(ctx.event.input);
		return false;
	},
	PHASE_CHANGED: (ctx) => {
		if (ctx.event.type !== "PHASE_CHANGED") return false;
		const t = ctx.trigger as Extract<EventTrigger, { event: "PHASE_CHANGED" }>;
		return (
			(t.from === undefined || ctx.event.from === t.from) &&
			(t.to === undefined || ctx.event.to === t.to)
		);
	},
	ENGINE_STARTED: (ctx) => ctx.event.type === "ENGINE_STARTED",
	ENGINE_FINISHED: (ctx) => ctx.event.type === "ENGINE_FINISHED",
};

export function matchesEventTrigger(
	event: GameEvent,
	trigger: EventTrigger,
	state: GameState,
): boolean {
	const entityType =
		"entityId" in event
			? state.entities[(event as { entityId: string }).entityId]?.type
			: undefined;

	const matcher = TRIGGER_MATCHERS[trigger.event];
	return matcher ? matcher({ event, trigger, entityType }) : false;
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
	ruleId: string,
): GuardContext<TContext> {
	return {
		event,
		provenance: buildEventProvenance(event, ruleId),
		entity,
		state,
		phase: state.phase,
		context,
	};
}

type SharedContextDeps<TContext extends Record<string, unknown>> = {
	provenance: EventProvenance;
	contextRef: React.MutableRefObject<TContext>;
	onceKeys: Set<string>;
	stateRef: React.MutableRefObject<GameState>;
	depsRef: React.MutableRefObject<BehaviorReactorDeps>;
};

function buildSharedContextFields<TContext extends Record<string, unknown>>(
	shared: SharedContextDeps<TContext>,
): Pick<
	ScheduledEffectContext<TContext>,
	| "context"
	| "updateContext"
	| "world"
	| "interaction"
	| "flow"
	| "progress"
	| "delay"
	| "once"
	| "terminal"
	| "schedule"
	| "cancelSchedule"
	| "setPhase"
	| "moveToInventory"
	| "moveToGrid"
> {
	const deps = shared.depsRef.current;
	const convenience = createBehaviorConvenience({
		world: deps.world,
		interaction: deps.interaction,
	});

	return {
		context: shared.contextRef.current,
		updateContext: (updater) => {
			updater(shared.contextRef.current);
		},
		world: deps.world,
		interaction: deps.interaction,
		flow: deps.flow,
		progress: deps.progress,
		delay: (ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
		once: (key, fn) => {
			if (shared.onceKeys.has(key)) return;
			shared.onceKeys.add(key);
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
				const scheduledCtx: ScheduledEffectContext<TContext> = {
					state: shared.stateRef.current,
					phase: shared.stateRef.current.phase,
					...buildSharedContextFields(shared),
					provenance: shared.provenance,
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

function buildEffectContext<TContext extends Record<string, unknown>>(
	event: GameEvent,
	entity: EntityData | undefined,
	state: GameState,
	contextRef: React.MutableRefObject<TContext>,
	onceKeys: Set<string>,
	_deps: BehaviorReactorDeps,
	stateRef: React.MutableRefObject<GameState>,
	depsRef: React.MutableRefObject<BehaviorReactorDeps>,
	ruleId: string,
): EffectContext<TContext> {
	const provenance = buildEventProvenance(event, ruleId);
	const shared = buildSharedContextFields<TContext>({
		provenance,
		contextRef,
		onceKeys,
		stateRef,
		depsRef,
	});

	return {
		event,
		provenance,
		entity,
		state,
		phase: state.phase,
		...shared,
	};
}

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
