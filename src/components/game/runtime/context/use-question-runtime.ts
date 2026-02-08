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
 *   const { commands, state, events, ack } = useQuestionRuntime("...", DEFINITION);
 */

import { useEffect, useRef } from "react";
import type { GameEvent } from "../../application/state/types";
import {
	useEngineEvents,
	useGameDispatch,
	useGameState,
} from "../../game-provider";
import { bootstrapQuestion } from "../bootstrap/bootstrap";
import { createCommands } from "../commands/create-commands";
import type { Commands } from "../commands/types";
import type { QuestionDefinition } from "../definition/types";
import { validateDefinition } from "../definition/validate";

export type QuestionRuntime = {
	/** High-level commands for world mutations */
	commands: Commands;
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
};

/**
 * Hook that provides the full runtime context for a question page.
 *
 * @param engineId — unique engine ID for event subscription (e.g. "dhcp-page")
 * @param definition — optional QuestionDefinition to bootstrap on mount
 */
export function useQuestionRuntime(
	engineId: string,
	definition?: QuestionDefinition,
): QuestionRuntime {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const { events, ack } = useEngineEvents(engineId);
	const initializedRef = useRef(false);
	const stateRef = useRef(state);
	stateRef.current = state;

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
	const commandsRef = useRef<Commands | null>(null);
	if (!commandsRef.current) {
		commandsRef.current = createCommands({
			dispatch,
			getState: () => stateRef.current,
		});
	}

	return {
		commands: commandsRef.current,
		state,
		phase: state.phase,
		isCompleted: state.question.status === "completed",
		events,
		ack,
	};
}
