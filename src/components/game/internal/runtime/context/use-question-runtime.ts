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
 *   const { cmd, snapshot, store, events, ack } = useQuestionRuntime("...", DEFINITION);
 *
 * CQRS contract:
 * - `snapshot` — stale Redux state (point-in-time, may lag behind recent commands)
 * - `store` — live in-memory behavior store (always current)
 * - `cmd` — fire-and-forget command bus (eventual consistency)
 */

import { useEffect, useRef, useState } from "react";
import type {
	BehaviorDefinition,
	TerminalBridge,
} from "@/components/game/types/behavior";
import type { QuestionDefinition } from "@/components/game/types/question";
import type {
	CommandApi,
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

// Re-export buildCommandApi under a stable internal name
function buildCommandApiFromParts(
	world: WorldApi,
	interaction: InteractionSessionApi,
	flow: ExecutionFlowApi,
	progress: ProgressApi,
	terminal: TerminalBridge,
): CommandApi {
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
				terminal.writeOutput(content, type);
			},
			clearHistory: () => {
				terminal.clearHistory();
			},
			finish: () => {
				terminal.finishEngine();
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

/**
 * Hook that provides the full runtime context for a question page.
 *
 * @param engineId — unique engine ID for event subscription (e.g. "dhcp-page")
 * @param definition — optional QuestionDefinition to bootstrap on mount
 */
export function useQuestionRuntime<
	TContext extends Record<string, unknown> = Record<string, never>,
>(
	engineId: string,
	definition?: QuestionDefinition<string, TContext>,
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

	// Build the cmd facade for the QuestionRuntime return value
	const cmd = buildCommandApiFromParts(
		worldApi,
		interactionSessionApi,
		executionFlowApi,
		progressApi,
		terminalBridge,
	);

	return {
		cmd,
		interactionState,
		snapshot: state,
		phase: state.phase,
		isCompleted: state.question.status === "completed",
		events,
		ack,
		store: behaviorResult.store,
		registerTerminalFinish: finishEngineRef,
	};
}
