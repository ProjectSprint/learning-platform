import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameState } from "@/components/game/internal/game-provider";
import type { _EngineLifecycleCallbacks } from "@/components/game/types/engine";
import {
	type EngineController,
	useEngineProgress,
} from "./use-engine-progress";

export interface DragEngineState {
	primaryGridSpaceId: string | null;
	placedEntityIds: string[];
}

export interface DragEngineConfig<TContext = unknown>
	extends _EngineLifecycleCallbacks<TContext> {
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

	const primaryGridSpace = useMemo(
		() =>
			Object.values(gameState.spaces).find((space) => space.kind === "grid") ??
			null,
		[gameState.spaces],
	);

	const state: DragEngineState = useMemo(
		() => ({
			primaryGridSpaceId: primaryGridSpace?.id ?? null,
			placedEntityIds:
				primaryGridSpace?.kind === "grid"
					? Object.keys(primaryGridSpace.entityPositions)
					: [],
		}),
		[primaryGridSpace],
	);

	useEffect(() => {
		if (!autoStart) return;
		if (autoStarted) return;
		if (controller.progress.status !== "pending") return;
		if (state.placedEntityIds.length === 0) return;

		setAutoStarted(true);
		controller.start();
	}, [autoStart, autoStarted, controller, state.placedEntityIds.length]);

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
