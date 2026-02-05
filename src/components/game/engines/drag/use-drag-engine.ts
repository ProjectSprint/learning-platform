import { useCallback, useEffect, useMemo, useState } from "react";
import { createCompatState } from "@/components/game/application/compat/state-conversion";
import type {
	BoardItemLocation,
	SpaceState,
} from "@/components/game/game-provider";
import { useGameState } from "@/components/game/game-provider";
import type { EngineLifecycleCallbacks } from "../engine-types";
import {
	type EngineController,
	useEngineProgress,
} from "../use-engine-progress";

export interface DragEngineState {
	space: SpaceState;
	placedItems: BoardItemLocation[];
}

export interface DragEngineConfig<TContext = unknown>
	extends EngineLifecycleCallbacks<TContext> {
	context?: TContext;
	autoStart?: boolean;
}

export interface DragEngine<TContext = unknown>
	extends EngineController<TContext> {
	state: DragEngineState;
}

export const useDragEngine = <TContext = unknown>(
	config: DragEngineConfig<TContext> = {},
): DragEngine<TContext> => {
	const { autoStart = true, ...progressOptions } = config;
	const gameState = useGameState();
	const controller = useEngineProgress<TContext>({
		...progressOptions,
		engineId: "drag",
	});
	const [autoStarted, setAutoStarted] = useState(false);

	const compat = useMemo(() => createCompatState(gameState), [gameState]);

	const state: DragEngineState = useMemo(
		() => ({
			space: compat.space,
			placedItems: compat.space.placedItems,
		}),
		[compat.space],
	);

	useEffect(() => {
		if (!autoStart) return;
		if (autoStarted) return;
		if (controller.progress.status !== "pending") return;
		if (state.placedItems.length === 0) return;

		setAutoStarted(true);
		controller.start();
	}, [autoStart, autoStarted, controller, state.placedItems.length]);

	const reset = useCallback(() => {
		setAutoStarted(false);
		controller.reset();
	}, [controller]);

	return {
		...controller,
		progress: { ...controller.progress, autoStarted },
		reset,
		state,
	};
};
