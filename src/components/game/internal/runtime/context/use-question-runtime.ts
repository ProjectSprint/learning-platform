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
	BehaviorDefinition,
	TerminalBridge,
} from "@/components/game/types/behavior";
import type { QuestionDefinition } from "@/components/game/types/question";
import type {
	ExecutionFlowApi,
	InteractionSessionApi,
	InteractionSessionState,
	ProgressApi,
	QuestionRuntime,
	WorldApi,
} from "@/components/game/types/runtime";
import {
	useEngineEvents,
	useGameDispatch,
	useGameState,
} from "../../game-provider";
import { useTerminalStore } from "../../presentation/terminal/terminal-context";
import { useBehaviorReactor } from "../behavior/reactor";
import { QuestionScheduler } from "../behavior/scheduler";
import { bootstrapQuestion } from "../bootstrap/bootstrap";
import { createCommands } from "../commands/create-commands";
import { validateQuestionDefinition } from "../definition/schema";
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
		const schemaResult = validateQuestionDefinition(definition);
		if (!schemaResult.ok) {
			const formatted = schemaResult.errors
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

	const worldApi = worldRef.current;
	const progressApi = progressRef.current;
	const executionFlowApi = executionFlowRef.current;
	const interactionSessionApi = interactionSessionRef.current;
	const terminalBridge = terminalBridgeRef.current;
	const scheduler = schedulerRef.current;

	if (
		!worldApi ||
		!progressApi ||
		!executionFlowApi ||
		!interactionSessionApi ||
		!terminalBridge ||
		!scheduler
	) {
		throw new Error("[runtime] Failed to initialize runtime APIs");
	}

	const behaviorDefinition: BehaviorDefinition<TContext> | undefined =
		definition?.behaviors;
	const behaviorResult = useBehaviorReactor<TContext>(behaviorDefinition, {
		state,
		events,
		ack,
		world: worldApi,
		interaction: interactionSessionApi,
		flow: executionFlowApi,
		progress: progressApi,
		terminal: terminalBridge,
		scheduler,
	});

	return {
		world: worldApi,
		progress: progressApi,
		executionFlow: executionFlowApi,
		interactionSession: interactionSessionApi,
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
