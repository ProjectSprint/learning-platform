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
import type {
	_BehaviorDefinition,
	TerminalBridge,
} from "@/components/game/types/behavior";
import type { _QuestionDefinition } from "@/components/game/types/question";
import type {
	_ExecutionFlowApi,
	_InteractionSessionApi,
	_InteractionSessionState,
	_ProgressApi,
	_QuestionRuntime,
	_WorldApi,
} from "@/components/game/types/runtime";
import {
	useEngineEvents,
	useGameDispatch,
	useGameState,
} from "../../game-provider";
import { useTerminalStore } from "../../presentation/terminal";
import { useBehaviorReactor } from "../behavior/reactor";
import { QuestionScheduler } from "../behavior/scheduler";
import { bootstrapQuestion } from "../bootstrap/bootstrap";
import { createCommands } from "../commands/create-commands";
import { validateDefinition } from "../definition/validate";
import { createExecutionFlowDispatcher } from "../execution-flow/dispatcher";
import { emitRuntimeWarning } from "../execution-flow/warning";
import {
	createExecutionFlowApi,
	createInteractionSessionApi,
	createProgressApi,
	createWorldApi,
} from "../wrappers";

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
	definition?: _QuestionDefinition<CK, TContext>,
): _QuestionRuntime<TContext> {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const { events, ack } = useEngineEvents(engineId);
	const initializedRef = useRef(false);
	const stateRef = useRef(state);
	stateRef.current = state;
	const [interactionState, setInteractionState] =
		useState<_InteractionSessionState>({
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

	const executionFlowRef = useRef<_ExecutionFlowApi | null>(null);
	if (!executionFlowRef.current) {
		executionFlowRef.current = createExecutionFlowApi({
			dispatcher: dispatcherRef.current,
		});
	}

	const worldRef = useRef<_WorldApi | null>(null);
	if (!worldRef.current) {
		worldRef.current = createWorldApi({ commands: commandsRef.current });
	}

	const progressRef = useRef<_ProgressApi | null>(null);
	if (!progressRef.current) {
		progressRef.current = createProgressApi({
			commands: commandsRef.current,
			dispatch,
		});
	}

	const interactionSessionRef = useRef<_InteractionSessionApi | null>(null);
	if (!interactionSessionRef.current) {
		interactionSessionRef.current = createInteractionSessionApi({
			commands: commandsRef.current,
			executionFlowApi: executionFlowRef.current,
			setInteractionState,
		});
	}

	const schedulerRef = useRef<QuestionScheduler | null>(null);
	if (!schedulerRef.current) {
		schedulerRef.current = new QuestionScheduler();
	}

	useEffect(() => () => schedulerRef.current?.dispose(), []);

	const { addOutput, clearHistory } = useTerminalStore();
	const addOutputRef = useRef(addOutput);
	addOutputRef.current = addOutput;
	const clearHistoryRef = useRef(clearHistory);
	clearHistoryRef.current = clearHistory;
	const finishEngineRef = useRef<(() => void) | null>(null);
	const terminalBridgeRef = useRef<TerminalBridge | null>(null);
	if (!terminalBridgeRef.current) {
		terminalBridgeRef.current = {
			writeOutput: (content, type = "output") =>
				addOutputRef.current(content, type),
			clearHistory: () => clearHistoryRef.current(),
			finishEngine: () => finishEngineRef.current?.(),
		};
	}

	const behaviorResult = useBehaviorReactor<TContext>(
		definition?.behaviors as _BehaviorDefinition<TContext> | undefined,
		{
			state,
			events,
			ack,
			world: worldRef.current,
			interaction: interactionSessionRef.current,
			flow: executionFlowRef.current,
			progress: progressRef.current,
			terminal: terminalBridgeRef.current,
			scheduler: schedulerRef.current,
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
		registerTerminalFinish: finishEngineRef,
	};
}
