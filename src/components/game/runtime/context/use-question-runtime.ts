/**
 * useQuestionRuntime — single hook that provides everything a question page needs.
 *
 * Replaces the manual pattern of:
 *   const dispatch = useGameDispatch();
 *   const state = useGameState();
 *   const { events, ack } = useEngineEvents("...");
 *   useEffect(() => { initializeXxxQuestion(dispatch); }, []);
 *
 * With:
 *   const { world, progress, executionFlow, interactionSession, state, events, ack }
 *      = useQuestionRuntime("...", DEFINITION);
 */

import { useEffect, useRef, useState } from "react";
import type { GameEvent } from "../../application/state/types";
import {
	useEngineEvents,
	useGameDispatch,
	useGameState,
} from "../../game-provider";
import { useTerminalStore } from "../../presentation/terminal";
import type { TerminalBridge } from "../behavior/reactor";
import { useBehaviorReactor } from "../behavior/reactor";
import type { BehaviorDefinition } from "../behavior/types";
import { bootstrapQuestion } from "../bootstrap/bootstrap";
import { createCommands } from "../commands/create-commands";
import type { QuestionDefinition } from "../definition/types";
import { validateDefinition } from "../definition/validate";
import { createExecutionFlowDispatcher } from "../execution-flow/dispatcher";
import { emitRuntimeWarning } from "../execution-flow/warning";
import {
	createExecutionFlowApi,
	createInteractionSessionApi,
	createProgressApi,
	createWorldApi,
	type ExecutionFlowApi,
	type InteractionSessionApi,
	type InteractionSessionState,
	type ProgressApi,
	type WorldApi,
} from "../wrappers";

export type QuestionRuntime<TContext = Record<string, never>> = {
	/** World domain wrappers (spaces/entities). */
	world: WorldApi;
	/** Progress domain wrappers (question progression). */
	progress: ProgressApi;
	/** executionFlow domain wrappers (phase orchestration owner). */
	executionFlow: ExecutionFlowApi;
	/** interactionSession wrappers for modal/terminal flow and progression handoff. */
	interactionSession: InteractionSessionApi;
	/** React-local ephemeral interaction state. */
	interactionState: InteractionSessionState;
	/** Current game state (read-only snapshot) */
	state: ReturnType<typeof useGameState>;
	/** Current game phase */
	phase: string;
	/** Whether the question is completed */
	isCompleted: boolean;
	/** Pending events for this engine */
	events: GameEvent[];
	/** Acknowledge processed events */
	ack: () => void;
	/** Behavior context (populated when definition has behaviors) */
	behaviorContext: TContext;
};

/**
 * Hook that provides the full runtime context for a question page.
 *
 * @param engineId — unique engine ID for event subscription (e.g. "dhcp-page")
 * @param definition — optional QuestionDefinition to bootstrap on mount
 */
export function useQuestionRuntime<
	CK extends string = string,
	TContext extends Record<string, unknown> = Record<string, never>,
>(
	engineId: string,
	definition?: QuestionDefinition<CK, TContext>,
): QuestionRuntime<TContext> {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const { events, ack } = useEngineEvents(engineId);
	const initializedRef = useRef(false);
	const stateRef = useRef(state);
	stateRef.current = state;
	const [interactionState, setInteractionState] =
		useState<InteractionSessionState>({
			terminalVisible: false,
			modalGateOpen: false,
		});

	if (definition) {
		const errors = validateDefinition(definition);
		if (errors.length > 0) {
			const formatted = errors
				.map((error) => `${error.field}: ${error.message}`)
				.join("; ");
			throw new Error(
				`[runtime] Invalid QuestionDefinition for "${definition.meta.id}": ${formatted}`,
			);
		}
	}

	// Bootstrap once on mount
	useEffect(() => {
		if (initializedRef.current || !definition) {
			return;
		}
		initializedRef.current = true;
		bootstrapQuestion(definition, dispatch);
	}, [definition, dispatch]);

	// Create commands (stable as long as dispatch doesn't change)
	const commandsRef = useRef<ReturnType<typeof createCommands> | null>(null);
	if (!commandsRef.current) {
		commandsRef.current = createCommands({
			dispatch,
			getState: () => stateRef.current,
		});
	}

	const warnRuntime = (message: string) => {
		emitRuntimeWarning({
			engineId,
			message,
			dispatch,
			isProduction: process.env.NODE_ENV === "production",
			log: (text) => console.warn(text),
		});
	};

	const dispatcherRef = useRef<ReturnType<
		typeof createExecutionFlowDispatcher
	> | null>(null);
	if (!dispatcherRef.current) {
		dispatcherRef.current = createExecutionFlowDispatcher({
			dispatch,
			getState: () => stateRef.current,
			nowMs: () => Date.now(),
			warn: warnRuntime,
		});
	}

	const executionFlowRef = useRef<ExecutionFlowApi | null>(null);
	if (!executionFlowRef.current) {
		executionFlowRef.current = createExecutionFlowApi({
			dispatcher: dispatcherRef.current,
		});
	}

	const worldRef = useRef<WorldApi | null>(null);
	if (!worldRef.current) {
		worldRef.current = createWorldApi({ commands: commandsRef.current });
	}

	const progressRef = useRef<ProgressApi | null>(null);
	if (!progressRef.current) {
		progressRef.current = createProgressApi({
			commands: commandsRef.current,
			dispatch,
		});
	}

	const interactionSessionRef = useRef<InteractionSessionApi | null>(null);
	if (!interactionSessionRef.current) {
		interactionSessionRef.current = createInteractionSessionApi({
			commands: commandsRef.current,
			executionFlowApi: executionFlowRef.current,
			setInteractionState,
		});
	}

	const { addOutput, clearHistory } = useTerminalStore();
	const addOutputRef = useRef(addOutput);
	addOutputRef.current = addOutput;
	const clearHistoryRef = useRef(clearHistory);
	clearHistoryRef.current = clearHistory;
	const terminalBridgeRef = useRef<TerminalBridge | null>(null);
	if (!terminalBridgeRef.current) {
		terminalBridgeRef.current = {
			writeOutput: (content, type = "output") =>
				addOutputRef.current(content, type),
			clearHistory: () => clearHistoryRef.current(),
		};
	}

	const behaviorResult = useBehaviorReactor<TContext>(
		definition?.behaviors as BehaviorDefinition<TContext> | undefined,
		{
			state,
			events,
			ack,
			world: worldRef.current,
			interaction: interactionSessionRef.current,
			flow: executionFlowRef.current,
			progress: progressRef.current,
			terminal: terminalBridgeRef.current,
		},
	);

	return {
		world: worldRef.current,
		progress: progressRef.current,
		executionFlow: executionFlowRef.current,
		interactionSession: interactionSessionRef.current,
		interactionState,
		state,
		phase: state.phase,
		isCompleted: state.question.status === "completed",
		events,
		ack,
		behaviorContext: behaviorResult.context,
	};
}
