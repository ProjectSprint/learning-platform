import { useCallback, useEffect } from "react";
import {
	type TerminalEntryType,
	useEngineEvents,
} from "@/components/game/internal/game-provider";
import { useTerminalStore } from "@/components/game/internal/presentation/terminal/terminal-context";
import type { EngineLifecycleCallbacks } from "@/components/game/types/engine";
import {
	type EngineController,
	useEngineProgress,
} from "./use-engine-progress";

type TerminalOutputType = Exclude<TerminalEntryType, "input" | "prompt">;
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
	const { addOutput, clearHistory: clearTerminalHistory } = useTerminalStore();
	const { events, ack } = useEngineEvents("terminal");
	const controller = useEngineProgress<TContext>({
		...config,
		engineId: "terminal",
	});

	const writeOutput = useCallback(
		(content: string, type: TerminalOutputType) => {
			addOutput(content, type);
		},
		[addOutput],
	);

	const clearHistory = useCallback(() => {
		clearTerminalHistory();
	}, [clearTerminalHistory]);

	const finishEngine = useCallback(() => {
		controller.finish();
	}, [controller]);

	useEffect(() => {
		if (events.length === 0) {
			return;
		}

		const helpers: TerminalCommandHelpers<TContext> = {
			writeOutput,
			clearHistory,
			finishEngine,
			context: config.context,
		};

		const hasInput = events.some((event) => event.type === "TERMINAL_INPUT");
		if (hasInput && controller.progress.status === "pending") {
			controller.start();
		}

		for (const event of events) {
			if (event.type !== "TERMINAL_INPUT") {
				continue;
			}
			config.onCommand?.(event.input, helpers);
		}

		ack();
	}, [
		config.context,
		config.onCommand,
		controller,
		events,
		ack,
		writeOutput,
		clearHistory,
		finishEngine,
	]);

	return controller;
};
