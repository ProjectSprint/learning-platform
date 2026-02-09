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
import type {
	BehaviorDefinition,
	EffectContext,
	EventTrigger,
	GuardContext,
} from "./types";

export type TerminalBridge = {
	writeOutput: (content: string, type?: "output" | "error") => void;
	clearHistory: () => void;
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
};

export type BehaviorReactorResult<TContext> = {
	context: TContext;
};

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
						if (!matchesTrigger(event, rule.on, state)) continue;

						const guardCtx = buildGuardContext<TContext>(
							event,
							entity,
							state,
							contextRef.current,
						);

						if (rule.guard && !rule.guard(guardCtx)) continue;

						const effectCtx = buildEffectContext(
							event,
							entity,
							state,
							contextRef,
							onceKeys.current,
							depsRef.current,
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

function matchesTrigger(
	event: GameEvent,
	trigger: EventTrigger,
	state: GameState,
): boolean {
	if (event.type !== trigger.event) return false;

	const entityType =
		"entityId" in event
			? state.entities[(event as { entityId: string }).entityId]?.type
			: undefined;

	switch (trigger.event) {
		case "ENTITY_ENTERED_SPACE": {
			const e = event as EntityEnteredSpaceEvent;
			return (
				(trigger.space === undefined || e.spaceId === trigger.space) &&
				(trigger.entityType === undefined || entityType === trigger.entityType)
			);
		}
		case "ENTITY_MOVED": {
			const e = event as EntityMovedEvent;
			return (
				(trigger.toSpace === undefined || e.toSpaceId === trigger.toSpace) &&
				(trigger.entityType === undefined || entityType === trigger.entityType)
			);
		}
		case "ENTITY_LEFT_SPACE": {
			const e = event as EntityLeftSpaceEvent;
			return (
				(trigger.space === undefined || e.spaceId === trigger.space) &&
				(trigger.entityType === undefined || entityType === trigger.entityType)
			);
		}
		case "ENTITY_CLICKED": {
			const e = event as EntityClickedEvent;
			return (
				(trigger.space === undefined || e.spaceId === trigger.space) &&
				(trigger.entityType === undefined || entityType === trigger.entityType)
			);
		}
		case "ENTITY_UPDATED":
			return (
				trigger.entityType === undefined || entityType === trigger.entityType
			);
		case "MODAL_OPENED": {
			const e = event as ModalOpenedEvent;
			return trigger.modalId === undefined || e.modalId === trigger.modalId;
		}
		case "MODAL_CLOSED": {
			const e = event as ModalClosedEvent;
			return trigger.modalId === undefined || e.modalId === trigger.modalId;
		}
		case "MODAL_SUBMITTED": {
			const e = event as ModalSubmittedEvent;
			return (
				(trigger.modalId === undefined || e.modalId === trigger.modalId) &&
				(trigger.modalActionId === undefined ||
					e.modalActionId === trigger.modalActionId)
			);
		}
		case "TERMINAL_INPUT": {
			const e = event as TerminalInputEvent;
			if (trigger.match === undefined) return true;
			if (typeof trigger.match === "string") return e.input === trigger.match;
			if (trigger.match instanceof RegExp) return trigger.match.test(e.input);
			return false;
		}
		case "PHASE_CHANGED": {
			const e = event as PhaseChangedEvent;
			return (
				(trigger.from === undefined || e.from === trigger.from) &&
				(trigger.to === undefined || e.to === trigger.to)
			);
		}
		case "ENGINE_STARTED":
		case "ENGINE_FINISHED":
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
): EffectContext<TContext> {
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
		},
		setPhase: (phase, source) => {
			deps.interaction.requestPhaseTransition(phase, source ?? "behavior");
		},
		moveToInventory: (entityId) => {
			deps.world.removeFromSpace(entityId, "inventory");
		},
		moveToGrid: (entityId, spaceId) => {
			const result = deps.world.moveEntityToGrid(entityId, spaceId);
			return result.ok;
		},
	};
}
