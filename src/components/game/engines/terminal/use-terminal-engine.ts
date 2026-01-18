import { useCallback, useEffect, useRef } from "react";
import {
	type TerminalEntryType,
	useGameDispatch,
	useGameState,
} from "@/components/game/game-provider";
import type { EngineLifecycleCallbacks } from "../engine-types";
import {
	type EngineController,
	useEngineProgress,
} from "../use-engine-progress";

export type TerminalOutputType = Exclude<TerminalEntryType, "input" | "prompt">;

export interface TerminalCommandHelpers<TContext = unknown> {
	writeOutput: (content: string, type: TerminalOutputType) => void;
	clearHistory: () => void;
	finishEngine: () => void;
	context?: TContext;
}

export interface TerminalEngineConfig<TContext = unknown>
	extends EngineLifecycleCallbacks<TContext> {
	context?: TContext;
	onCommand?: (
		input: string,
		helpers: TerminalCommandHelpers<TContext>,
	) => void;
}

export interface TerminalEngine<TContext = unknown>
	extends EngineController<TContext> {}

export const useTerminalEngine = <TContext = unknown>(
	config: TerminalEngineConfig<TContext> = {},
): TerminalEngine<TContext> => {
	const dispatch = useGameDispatch();
	const state = useGameState();
	const controller = useEngineProgress<TContext>(config);
	const lastInputIdRef = useRef<string | null>(null);
	const onCommandRef = useRef(config.onCommand);
	onCommandRef.current = config.onCommand;

	const writeOutput = useCallback(
		(content: string, type: TerminalOutputType) => {
			dispatch({
				type: "ADD_TERMINAL_OUTPUT",
				payload: { content, type },
			});
		},
		[dispatch],
	);

	const clearHistory = useCallback(() => {
		dispatch({ type: "CLEAR_TERMINAL_HISTORY" });
	}, [dispatch]);

	const finishEngine = useCallback(() => {
		controller.finish();
	}, [controller]);

	useEffect(() => {
		const lastEntry = state.terminal.history[state.terminal.history.length - 1];
		if (!lastEntry || lastEntry.type !== "input") return;

		if (lastEntry.id === lastInputIdRef.current) return;
		lastInputIdRef.current = lastEntry.id;

		if (controller.progress.status === "pending") {
			controller.start();
		}

		const helpers: TerminalCommandHelpers<TContext> = {
			writeOutput,
			clearHistory,
			finishEngine,
			context: config.context,
		};

		onCommandRef.current?.(lastEntry.content, helpers);
	}, [
		config.context,
		controller,
		state.terminal.history,
		writeOutput,
		clearHistory,
		finishEngine,
	]);

	return controller;
};
