import { useEffect, useMemo, useRef } from "react";
import type {
	CanvasState,
	Connection,
	PlacedItem,
} from "@/components/game/game-provider";
import { useGameState } from "@/components/game/game-provider";
import type { EngineLifecycleCallbacks } from "../engine-types";
import {
	type EngineController,
	useEngineProgress,
} from "../use-engine-progress";

export interface DragEngineState {
	canvas: CanvasState;
	placedItems: PlacedItem[];
	connections: Connection[];
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
	const controller = useEngineProgress<TContext>(progressOptions);
	const hasAutoStarted = useRef(false);

	const state: DragEngineState = useMemo(
		() => ({
			canvas: gameState.canvas,
			placedItems: gameState.canvas.placedItems,
			connections: gameState.canvas.connections,
		}),
		[gameState.canvas],
	);

	useEffect(() => {
		if (!autoStart) return;
		if (hasAutoStarted.current) return;
		if (controller.progress.status !== "pending") return;
		if (state.placedItems.length === 0 && state.connections.length === 0)
			return;

		hasAutoStarted.current = true;
		controller.start();
	}, [
		autoStart,
		controller,
		state.placedItems.length,
		state.connections.length,
	]);

	return { ...controller, state };
};
