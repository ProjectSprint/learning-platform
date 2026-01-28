import { createBlockGrid } from "../../grid";
import type { CanvasConfig, CanvasState, GameState } from "../types";

export const createCanvasState = (config: CanvasConfig): CanvasState => ({
	config,
	blocks: createBlockGrid(config.columns, config.rows),
	placedItems: [],
	connections: [],
	selectedBlock: null,
});

export const resolveCanvasState = (state: GameState, canvasId?: string) => {
	if (!canvasId) {
		return state.canvas;
	}

	return state.canvases?.[canvasId] ?? state.canvas;
};

export const updateCanvasState = (
	state: GameState,
	canvasId: string | undefined,
	nextCanvas: CanvasState,
): GameState => {
	if (!canvasId) {
		return { ...state, canvas: nextCanvas };
	}

	const nextPrimary =
		state.canvas.config.canvasId === canvasId ? nextCanvas : state.canvas;

	return {
		...state,
		canvas: nextPrimary,
		canvases: {
			...(state.canvases ?? {}),
			[canvasId]: nextCanvas,
		},
	};
};
